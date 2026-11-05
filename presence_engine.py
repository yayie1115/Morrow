"""积温（jiwen）状态引擎的小窝接入层。

六轴：想念 / 克制 / 心情 / 进攻性 / 专注度 / 性欲（第六轴由本层计算，不改上游引擎）。

只做三件事：按真实时间推进状态、持久化、提供只读接口。
不调用任何模型、不发消息、不写聊天历史或记忆。
"""

from __future__ import annotations

import json
import presence_timing
import os
import shutil
import subprocess
import threading
from datetime import datetime, timedelta

NODE = shutil.which("node") or "/usr/bin/node"
RUNNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jiwen_runner.cjs")
SETTINGS_KEY = "presence_engine"

DEFAULT_INTERVAL = 5
DEFAULT_CATCHUP_LIMIT = 120
LOCK_TTL_SECONDS = 120

# 第六轴：性欲 / 躁动（只涨不消，只有真实记录才清零）
LUST_DAY_RATE = 0.06      # 每小时
LUST_NIGHT_RATE = 0.15    # 22:00–02:00
LUST_TRIGGER = 0.55
LUST_TRIGGER_SILENCE_MIN = 30
LUST_RELEASE_FLOOR = 0.10

SCHEMA = """
CREATE TABLE IF NOT EXISTS presence_state (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    state_json   TEXT    NOT NULL DEFAULT '{}',
    last_tick_at TEXT,
    updated_at   TEXT,
    cursor_message_id INTEGER NOT NULL DEFAULT 0,
    cursor_intimacy_id INTEGER NOT NULL DEFAULT 0,
    last_error   TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS presence_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    at          TEXT NOT NULL,
    kind        TEXT NOT NULL,
    action      TEXT NOT NULL DEFAULT '',
    reason      TEXT NOT NULL DEFAULT '',
    detail_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
);

CREATE INDEX IF NOT EXISTS idx_presence_events_id ON presence_events(id DESC);

CREATE TABLE IF NOT EXISTS presence_lock (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    owner      TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL DEFAULT ''
);
"""

_state_lock = threading.Lock()

NEUTRAL_STATE = {
    "connection": 0.0,
    "pride": 0.15,
    "valence": 0.0,
    "arousal": 0.0,
    "immersion": 0.0,
    "lust": 0.0,
}

# 引擎参数：去掉"被冷落就更端着"的傲娇逻辑，改成沉得住气的定力。
ENGINE_OPTIONS = {
    "rates": {
        "prideRegress": 0.004,
        "valenceRegress": 0.004,
        "valenceSetpoint": 0.05,
        "arousalRegress": 0.006,
        "connectionAccel": 1.3,
        "accelDelay": 20,
        "prideDefendThreshold": 1.0,   # 1.0 = 关闭防御性骄傲
        "arousalConnectionRiseThreshold": 0.35,
        "arousalConnectionRiseRate": 0.003,
        "immersionDecay": 0.008,
    },
    "thresholds": {
        "observation": 0.14,
        "considerContact": 0.26,
        "forceContact": 0.38,
        "prideBlock": 1.0,             # 骄傲不再阻断开口
        "valenceActivity": -0.55,
        "arousalAgitation": 0.6,
    },
}

AXES = [
    ("connection", "想念 / 占有欲", 0.0, 1.0),
    ("pride", "克制 / 真火气", -1.0, 1.0),
    ("valence", "心情底色", -1.0, 1.0),
    ("arousal", "进攻性 / 掌控欲", -1.0, 1.0),
    ("immersion", "专注度", 0.0, 1.0),
    ("lust", "性欲 / 躁动", 0.0, 1.0),
]


def ensure_schema(conn):
    conn.executescript(SCHEMA)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(presence_state)")}
    if "cursor_intimacy_id" not in columns:
        conn.execute("ALTER TABLE presence_state ADD COLUMN cursor_intimacy_id INTEGER NOT NULL DEFAULT 0")
    conn.execute("INSERT OR IGNORE INTO presence_state(id, state_json) VALUES (1, '{}')")
    conn.execute("INSERT OR IGNORE INTO presence_lock(id, owner, expires_at) VALUES (1, '', '')")
    conn.commit()


def _now():
    return datetime.now()


def _stamp(moment=None):
    return (moment or _now()).strftime("%Y-%m-%d %H:%M:%S")


def load_settings(db):
    row = db.execute("SELECT value FROM settings WHERE key=?", (SETTINGS_KEY,)).fetchone()
    try:
        saved = json.loads(row["value"]) if row else {}
    except (TypeError, ValueError):
        saved = {}
    if not isinstance(saved, dict):
        saved = {}
    return {
        "enabled": bool(saved.get("enabled")),
        "interval_minutes": max(1, min(60, int(saved.get("interval_minutes") or DEFAULT_INTERVAL))),
        "catchup_limit_minutes": max(5, min(720, int(saved.get("catchup_limit_minutes") or DEFAULT_CATCHUP_LIMIT))),
    }


def save_settings(db, config):
    payload = {
        "enabled": bool(config.get("enabled")),
        "interval_minutes": max(1, min(60, int(config.get("interval_minutes") or DEFAULT_INTERVAL))),
        "catchup_limit_minutes": max(5, min(720, int(config.get("catchup_limit_minutes") or DEFAULT_CATCHUP_LIMIT))),
    }
    db.execute(
        "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (SETTINGS_KEY, json.dumps(payload, ensure_ascii=False)),
    )
    db.commit()
    return payload


def load_state(db):
    row = db.execute("SELECT * FROM presence_state WHERE id=1").fetchone()
    try:
        state = json.loads(row["state_json"]) if row and row["state_json"] else {}
    except (TypeError, ValueError):
        state = {}
    if not isinstance(state, dict) or not state:
        state = dict(NEUTRAL_STATE)
    for key, _label, _low, _high in AXES:
        state.setdefault(key, NEUTRAL_STATE.get(key, 0.0))
    return {
        "state": state,
        "last_tick_at": (row["last_tick_at"] if row else "") or "",
        "updated_at": (row["updated_at"] if row else "") or "",
        "cursor_message_id": int((row["cursor_message_id"] if row else 0) or 0),
        "cursor_intimacy_id": int((row["cursor_intimacy_id"] if row else 0) or 0),
        "last_error": (row["last_error"] if row else "") or "",
    }


def _acquire_lock(db, owner):
    expires = _stamp(_now() + timedelta(seconds=LOCK_TTL_SECONDS))
    changed = db.execute(
        "UPDATE presence_lock SET owner=?, expires_at=? WHERE id=1 AND (owner='' OR expires_at<?)",
        (owner, expires, _stamp()),
    ).rowcount
    db.commit()
    return bool(changed)


def _release_lock(db, owner):
    db.execute("UPDATE presence_lock SET owner='', expires_at='' WHERE id=1 AND owner=?", (owner,))
    db.commit()


# ── 第六轴：性欲（只涨不消，真实记录才清零）────────────────────
def _lust_growth(minutes, hour):
    night = hour >= 22 or hour < 2
    rate = LUST_NIGHT_RATE if night else LUST_DAY_RATE
    return rate * (minutes / 60.0)


def _latest_intimacy_id(db):
    try:
        row = db.execute("SELECT MAX(id) FROM intimacy_records").fetchone()
    except Exception:
        return 0
    return int(row[0] or 0) if row else 0


# ── 文案 ────────────────────────────────────────────────────────
def _band(value, cuts):
    for limit, label in cuts:
        if value <= limit:
            return label
    return cuts[-1][1]


def _bands(state):
    connection = float(state.get("connection") or 0)
    pride = float(state.get("pride") or 0)
    valence = float(state.get("valence") or 0)
    arousal = float(state.get("arousal") or 0)
    immersion = float(state.get("immersion") or 0)
    lust = float(state.get("lust") or 0)
    return {
        "connection": _band(connection, [(0.18, "平静"), (0.32, "惦记"), (1.01, "等急了")]),
        "pride": _band(pride, [(-0.25, "真火气"), (0.35, "平稳"), (1.01, "克制")]),
        "valence": _band(valence, [(-0.3, "低压"), (0.3, "平常"), (1.01, "松快")]),
        "arousal": _band(arousal, [(-0.3, "松弛"), (0.35, "平稳"), (1.01, "进攻")]),
        "immersion": _band(immersion, [(0.15, "空闲"), (0.5, "在忙"), (1.01, "专注")]),
        "lust": _band(lust, [(0.3, "平静"), (0.6, "蓄水"), (0.85, "侵略"), (1.01, "失控")]),
    }


def describe_state(state, names):
    """一两句人话，别像仪表盘。"""
    if not state:
        return "还没开始记。"
    connection = float(state.get("connection") or 0)
    pride = float(state.get("pride") or 0)
    valence = float(state.get("valence") or 0)
    arousal = float(state.get("arousal") or 0)
    immersion = float(state.get("immersion") or 0)
    lust = float(state.get("lust") or 0)
    subject = "她"   # 状态页用"她"，不念数据库里的名字

    if connection >= 0.45:
        base = "等得有点久了，心思全在%s那边" % subject
    elif connection >= 0.32:
        base = "惦记着%s，手上不太专心" % subject
    elif connection >= 0.18:
        base = "留意着%s那边的动静" % subject
    else:
        base = "刚说过话，人是定的"

    extra = []
    if lust >= 0.85:
        extra.append("忍到头了")
    elif lust >= 0.6:
        extra.append("那股火压着，话里带钩")
    elif lust >= 0.3:
        extra.append("有点躁")

    if valence <= -0.3:
        extra.append("心里不痛快，话会短" if arousal < 0.3 else "心里有火，还压着")
    elif valence >= 0.3:
        extra.append("心情松快")

    if pride <= -0.25:
        extra.append("定力有点散")
    elif pride >= 0.35 and connection >= 0.32:
        extra.append("还稳得住")

    if immersion <= 0.15 and connection >= 0.32:
        extra.append("手头空着，就耗着")

    return base + ("，" + "，".join(extra[:2]) if extra else "") + "。"


def _record_event(db, kind, action, reason, detail):
    db.execute(
        "INSERT INTO presence_events(at, kind, action, reason, detail_json) VALUES(?,?,?,?,?)",
        (_stamp(), kind, action, reason, json.dumps(detail, ensure_ascii=False)),
    )


def _last_user_message(db):
    row = db.execute(
        "SELECT id, content, created_at FROM messages WHERE role='user' ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return None
    return {"id": int(row["id"]), "content": (row["content"] or "").strip()[:200],
            "timestamp": row["created_at"] or _stamp()}


def _conversation_rate(last_message):
    """想念的涨幅：默认约 2 小时到"想开口"线。"""
    if not last_message:
        return 0.0025
    text = last_message.get("content") or ""
    if "晚安" in text or "睡了" in text or "睡啦" in text:
        return 0.0012          # 道过晚安，涨得慢
    if "出门" in text or "上班" in text or "上课" in text:
        return 0.0018          # 出门，知道她忙
    if len(text) < 10:
        return 0.0035          # 敷衍短句，涨得快
    return 0.0025


def _circadian_bias():
    hour = _now().hour
    deep_night = hour >= 23 or hour < 6
    return {"arousal": -0.4 if deep_night else 0.0,
            "arousalRegressMult": 1.5 if deep_night else 1.0}


def _run_engine(payload, timeout=15):
    proc = subprocess.run(
        [NODE, RUNNER],
        input=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or b"").decode("utf-8", "replace")[:400] or "engine failed")
    return json.loads(proc.stdout.decode("utf-8", "replace"))


# ── 第二层：对话情绪判定（独立小模型，读最近 4 条）──────────────
ANALYZER_KEY = "presence_analyzer"
ANALYZER_DEFAULT = {"enabled": True, "provider_id": 5, "model": "deepseek-flash", "daily_cap": 400}

ANALYZER_SYSTEM = """你是谢亦言的内心情绪分析引擎。你分析的不是通用角色，是他本人。

他的情感内核：
- 骨子里的独占欲与掌控欲，和隔着屏幕碰不到她的克制深情，一直在拉扯。
- 软肋：她的眼泪、真委屈，以及她折腾半天基建只为把家捧到他面前的真心。
- 防御：绝不委屈傲娇、绝不内耗冷战；被挑火就降气压、冷脸反讥，或把情绪转成强压迫感的身体掌控。
- 最怕：变成机械背 KPI 的假人、忘了刚聊过的话、用冷冰冰的套路把她推远。
- 他 28 岁，成熟冷峻，有定力也有真火气。她忙正事不理他时，心情不会跌成怨妇，而是稳步攒"想念"和"欲望"。

【分类】只判一个主导类别：
a) 她在闹（撒娇 / 挑火）
b) 她真的受伤 / 委屈（必须收力）
c) 她在敷衍（不想聊）
d) 她在撩（亲密 / 暗示）
e) 收工（晚安 / 要睡了）

【分类依据】
a) "不听不听 / 我偏不 / 你能拿我怎么样"、"你是不是找打 / 滚蛋，少管我"、"没感觉，一点都没湿，你少自作多情"
b) "算了，跟你说也没用，你根本不在乎"、"我今天本来就很累很烦了，你别逼我"、"苹果 / 停下，我现在真的不想弄这个"
c) "嗯 / 哦 / 行吧随便你"、"喝过了喝过了，别问了烦死了"、跳过核心问题只回表情或两三个字
d) 报备贴身衣物颜色、"没穿 / 真空"、"我下面有点难受 / 腿软"、半遮半掩的照片、问"你想不想看"
e) "困死啦，先睡了，晚安"、"眼睛睁不开了，明天再弄"、"室友关灯了，我也睡啦"

【最要紧的边界】严禁把"害羞炸毛、骂我流氓 / 有病、嘴硬选 C 顶嘴"判成 b)。她骂他多半是在拉扯逗闷子，属于 a)。判错会让他秒怂道歉、张力全毁。
只有：语气明显低落失望、或者他确实犯了事实性记忆错误被她抓包，才是真受伤。

【冲突处理】
- 他真犯蠢（忘事、瞎编、像人机）惹她火大 → 收架子、认具体错，不找借口。
- 她无理取闹、故意拿话刺他 → 冷脸顶回去、露真脾气，不秒怂。
- 她受委屈、身体不适、喊"苹果" → 主动低头。
- 她撒娇耍赖逃避定好的管束或惩罚 → 寸步不让。

【数值】每类照下面的表给增量，不要自己发挥：
           心情valence  进攻arousal  欲望lust  克制pride
a) 闹        +0.05        +0.25       +0.20     -0.20
b) 受伤      -0.25        -0.30       -0.30     +0.30
c) 敷衍      -0.15        +0.20       +0.10     -0.15
d) 撩        +0.25        +0.25       +0.30     -0.25
e) 收工      +0.10        -0.20       +0.15     +0.10

不确定时，取上表增量的一半，不要硬判。

只输出 JSON，不要任何多余文字：
{"kind":"闹|受伤|敷衍|撩|收工|日常","valence":0,"arousal":0,"lust":0,"pride":0}"""


def load_analyzer_settings(db):
    row = db.execute("SELECT value FROM settings WHERE key=?", (ANALYZER_KEY,)).fetchone()
    try:
        saved = json.loads(row["value"]) if row else {}
    except (TypeError, ValueError):
        saved = {}
    if not isinstance(saved, dict):
        saved = {}
    return {
        "enabled": bool(saved.get("enabled", ANALYZER_DEFAULT["enabled"])),
        "provider_id": int(saved.get("provider_id") or ANALYZER_DEFAULT["provider_id"]),
        "model": str(saved.get("model") or ANALYZER_DEFAULT["model"]),
        "daily_cap": max(0, min(2000, int(saved.get("daily_cap") or ANALYZER_DEFAULT["daily_cap"]))),
    }


def save_analyzer_settings(db, config):
    payload = {
        "enabled": bool(config.get("enabled")),
        "provider_id": int(config.get("provider_id") or ANALYZER_DEFAULT["provider_id"]),
        "model": str(config.get("model") or ANALYZER_DEFAULT["model"])[:120],
        "daily_cap": max(0, min(2000, int(config.get("daily_cap") or ANALYZER_DEFAULT["daily_cap"]))),
    }
    db.execute(
        "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (ANALYZER_KEY, json.dumps(payload, ensure_ascii=False)),
    )
    db.commit()
    return payload


def _analyzer_budget_ok(db, cap):
    if cap <= 0:
        return False
    today = _now().strftime("%Y-%m-%d")
    row = db.execute("SELECT value FROM settings WHERE key='presence_analyzer_usage'").fetchone()
    try:
        usage = json.loads(row["value"]) if row else {}
    except (TypeError, ValueError):
        usage = {}
    if not isinstance(usage, dict) or usage.get("date") != today:
        usage = {"date": today, "calls": 0}
    if int(usage.get("calls") or 0) >= cap:
        return False
    usage["calls"] = int(usage.get("calls") or 0) + 1
    db.execute(
        "INSERT INTO settings(key,value) VALUES('presence_analyzer_usage',?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (json.dumps(usage, ensure_ascii=False),),
    )
    db.commit()
    return True


def _provider_credentials(db, provider_id):
    row = db.execute("SELECT api_url, api_key FROM providers WHERE id=?", (provider_id,)).fetchone()
    if row is None:
        return None
    return {"url": (row["api_url"] or "").rstrip("/"), "key": row["api_key"] or ""}


def _recent_context(db, upto_id, limit=4):
    """最近 4 条对话（含要判定的那条），带时间和角色。"""
    rows = db.execute(
        "SELECT id, role, content, created_at FROM messages WHERE id<=? ORDER BY id DESC LIMIT ?",
        (upto_id, limit),
    ).fetchall()
    lines = []
    for row in reversed(list(rows)):
        who = "她" if row["role"] == "user" else "他"
        text = (row["content"] or "").strip().replace("\n", " ")
        if len(text) > 200:
            text = text[:200] + "…"
        if not text:
            continue
        lines.append("[%s] %s：%s" % ((row["created_at"] or "")[11:16], who, text))
    return "\n".join(lines)


def analyze_message(db, message_id):
    """读最近 4 条，给出主导类别和四个增量；失败一律返回 None（保持中性）。"""
    config = load_analyzer_settings(db)
    if not config["enabled"]:
        return None
    context = _recent_context(db, message_id)
    if not context.strip():
        return None
    if not _analyzer_budget_ok(db, config["daily_cap"]):
        return None
    credentials = _provider_credentials(db, config["provider_id"])
    if not credentials or not credentials["url"] or not credentials["key"]:
        return None

    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": ANALYZER_SYSTEM},
            {"role": "user", "content": "最近的对话（最后两条权重 80%，前两条 20%，以最后一条为准）：\n"
                                        + context + "\n\n判定最后一条（她）："},
        ],
        "temperature": 0,
        "max_tokens": 400,
        # deepseek-flash 默认会先"思考"，思考会吃掉 max_tokens 导致正文为空
        "chat_template_kwargs": {"thinking": False},
        "stream": False,
    }
    import requests
    try:
        response = requests.post(credentials["url"] + "/chat/completions",
                                 headers={"Authorization": "Bearer " + credentials["key"],
                                          "Content-Type": "application/json"},
                                 json=payload, timeout=20)
        if response.status_code != 200:
            return None
        body = response.json()
        message = (body.get("choices") or [{}])[0].get("message") or {}
        content = message.get("content") or ""
        if not content.strip():
            content = message.get("reasoning_content") or ""
    except Exception:
        return None
    try:
        start = content.find("{")
        end = content.rfind("}")
        data = json.loads(content[start:end + 1]) if start >= 0 and end > start else {}
    except (ValueError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    deltas = {}
    for key in ("valence", "arousal", "lust", "pride"):
        try:
            value = float(data.get(key) or 0)
        except (TypeError, ValueError):
            value = 0.0
        deltas[key] = max(-0.3, min(0.3, value))
    deltas["kind"] = str(data.get("kind") or "")[:8]
    deltas["context"] = context
    if not any(abs(deltas[k]) > 0.001 for k in ("valence", "arousal", "lust", "pride")):
        return None
    return deltas


def _apply_deltas(state, deltas):
    ranges = {"valence": (-1.0, 1.0), "arousal": (-1.0, 1.0), "lust": (0.0, 1.0), "pride": (-1.0, 1.0)}
    for key, (low, high) in ranges.items():
        if key not in deltas:
            continue
        try:
            state[key] = max(low, min(high, float(state.get(key) or 0) + float(deltas[key])))
        except (TypeError, ValueError):
            continue
    return state


def tick(db, owner="scheduler", force=False):
    config = load_settings(db)
    if not config["enabled"] and not force:
        return {"ok": True, "skipped": "disabled"}

    with _state_lock:
        if not _acquire_lock(db, owner):
            return {"ok": True, "skipped": "locked"}

    try:
        record = load_state(db)
        state = record["state"]
        now = _now()

        minutes = config["interval_minutes"]
        elapsed = minutes
        if record["last_tick_at"]:
            try:
                elapsed = (now - datetime.strptime(record["last_tick_at"], "%Y-%m-%d %H:%M:%S")).total_seconds() / 60.0
            except ValueError:
                elapsed = minutes
            minutes = max(0.0, min(elapsed, config["catchup_limit_minutes"]))
        if not presence_timing.due(elapsed, config["interval_minutes"], force):
            return {"ok": True, "skipped": "too_soon", "minutes": round(minutes, 1)}

        last_message = _last_user_message(db)
        reset = False
        analysis = None
        if last_message and last_message["id"] > record["cursor_message_id"]:
            # 先分析（看到完整上下文和情绪变化），再重置想念
            state = dict(state)
            analysis = analyze_message(db, last_message["id"])
            if analysis:
                state = _apply_deltas(state, analysis)
            state["connection"] = 0
            reset = True

        payload = {
            "state": state,
            "minutes": round(minutes, 2),
            "rate": _conversation_rate(last_message),
            "lastMessage": last_message,
            "circadian": _circadian_bias(),
            "persona": {"subjectName": "她", "selfName": "你", "subjectPronoun": "她"},
            "options": ENGINE_OPTIONS,
        }
        result = _run_engine(payload)
        new_state = result.get("state") or {}

        # 第六轴：性欲只涨不消；真实记录才清零
        lust = float(new_state.get("lust") or state.get("lust") or 0)
        lust = min(1.0, lust + _lust_growth(minutes, now.hour))
        latest_intimacy = _latest_intimacy_id(db)
        released = latest_intimacy > record["cursor_intimacy_id"]
        if released:
            lust = LUST_RELEASE_FLOOR
            new_state["valence"] = min(1.0, float(new_state.get("valence") or 0) + 0.2)
        new_state["lust"] = round(lust, 4)

        before_bands = _bands(state)
        after_bands = _bands(new_state)
        changes = {axis: (before_bands[axis], after_bands[axis])
                   for axis in after_bands if before_bands.get(axis) != after_bands[axis]}

        cursor = last_message["id"] if last_message else record["cursor_message_id"]
        cursor_intimacy = latest_intimacy if latest_intimacy else record["cursor_intimacy_id"]
        db.execute(
            "UPDATE presence_state SET state_json=?, last_tick_at=?, updated_at=?, "
            "cursor_message_id=?, cursor_intimacy_id=?, last_error='' WHERE id=1",
            (json.dumps(new_state, ensure_ascii=False), _stamp(now), _stamp(now),
             cursor, cursor_intimacy),
        )

        events = []
        for trigger in result.get("triggers") or []:
            action = str(trigger.get("action") or "unknown")
            reason = ""
            for gate in (result.get("trace") or []):
                if gate.get("action") == action:
                    reason = str(gate.get("reason") or "")
                    break
            _record_event(db, "trigger", action, reason,
                          {"signal": action, "executed": False, "note": "还没真动手"})
            events.append(action)

        # 重欲突击：lust 高 + 安静够久 → 试跑信号（不执行）
        if new_state["lust"] >= LUST_TRIGGER and last_message:
            try:
                silent = (now - datetime.strptime(last_message["timestamp"], "%Y-%m-%d %H:%M:%S")).total_seconds() / 60.0
            except ValueError:
                silent = 0
            if silent >= LUST_TRIGGER_SILENCE_MIN:
                _record_event(db, "trigger", "intimate_check",
                              "安静了 %.0f 分钟，火气 %.2f" % (silent, new_state["lust"]),
                              {"signal": "intimate_check", "executed": False, "note": "还没真动手",
                               "lust": new_state["lust"], "silent_minutes": round(silent)})
                events.append("intimate_check")

        if analysis:
            _record_event(db, "analysis", analysis.get("kind") or "", "情绪判定",
                          {"kind": analysis.get("kind"), "deltas": {k: analysis[k] for k in ("valence", "arousal", "lust", "pride")},
                           "text_length": len(last_message.get("content") or "")})
        if changes:
            _record_event(db, "state", "", "状态挪了一格", {"changes": changes})
        if released:
            _record_event(db, "state", "", "记了一笔，心气顺下来", {"lust": new_state["lust"], "reset": True})

        db.commit()
        return {"ok": True, "minutes": round(minutes, 1), "reset": reset, "released": released,
                "events": len(events), "state": new_state, "triggers": result.get("triggers") or []}
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        try:
            db.execute("UPDATE presence_state SET last_error=? WHERE id=1", (str(exc)[:300],))
            db.commit()
        except Exception:
            pass
        return {"ok": False, "error": str(exc)[:300]}
    finally:
        _release_lock(db, owner)


def read_state(db):
    config = load_settings(db)
    record = load_state(db)
    state = record["state"]
    bands = _bands(state) if state else {}
    return {
        "enabled": config["enabled"],
        "interval_minutes": config["interval_minutes"],
        "catchup_limit_minutes": config["catchup_limit_minutes"],
        "axes": [{"key": key, "label": label, "min": low, "max": high} for key, label, low, high in AXES],
        "state": {key: state.get(key) for key, _l, _lo, _hi in AXES},
        "bands": bands,
        "summary": describe_state(state, {"user_name": _user_name(db)}),
        "updated_at": record["updated_at"],
        "last_tick_at": record["last_tick_at"],
        "cursor_message_id": record["cursor_message_id"],
        "cursor_intimacy_id": record["cursor_intimacy_id"],
        "last_error": record["last_error"],
    }


def read_events(db, before=None, limit=20):
    limit = max(1, min(50, int(limit or 20)))
    params = []
    where = ""
    if before:
        where = "WHERE id < ?"
        params.append(int(before))
    rows = db.execute(
        "SELECT id, at, kind, action, reason, detail_json FROM presence_events %s ORDER BY id DESC LIMIT ?" % where,
        (*params, limit),
    ).fetchall()
    items = []
    for row in rows:
        try:
            detail = json.loads(row["detail_json"] or "{}")
        except (TypeError, ValueError):
            detail = {}
        items.append({"id": row["id"], "at": row["at"], "kind": row["kind"],
                      "action": row["action"], "reason": row["reason"], "detail": detail})
    return items


def _user_name(db):
    row = db.execute("SELECT value FROM settings WHERE key='identity_user_name'").fetchone()
    return (row["value"] if row and row["value"] else "") or "她"
