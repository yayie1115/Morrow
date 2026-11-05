"""Bounded tone hints from an existing jiwen snapshot; never advances the engine."""
import json
import math
from pathlib import Path
import sqlite3
from datetime import datetime,timedelta


def describe(state):
    def value(key):
        result=state.get(key,0)
        if type(result) not in (int,float) or not math.isfinite(result):return 0
        return max(-1,min(1,result))
    hints=[]
    connection=value('connection')
    hints.append('有些惦记对方，想自然地靠近。' if connection>=.26 else '牵挂较轻，表达从容。')
    valence=value('valence')
    if valence>=.3:hints.append('心情松快，可以轻松些。')
    elif valence<=-.3:hints.append('心情略低，表达可以短一些。')
    else:hints.append('心情平稳。')
    arousal=value('arousal')
    if arousal>=.3:hints.append('精神较活跃，表达可以更有力度。')
    elif arousal<=-.3:hints.append('精神较放松，语速和节奏可以舒缓些。')
    pride=value('pride')
    if pride>=.35:hints.append('表达保持沉稳克制。')
    elif pride<=-.25:hints.append('克制比平时少，那股劲直接摆在明面上。')
    if value('immersion')>=.5:hints.append('注意力较集中，表达不必铺陈；状态不能证明正在进行某项实际活动。')
    lust=value('lust')
    if lust>=.85:hints.append('欲望与占有欲高涨，想和她亲近一下。')
    elif lust>=.6:hints.append('亲近的意愿偏强，想离她近一点。')
    return ('【本次主动联系的积温状态参考】\n'+''.join(hints)+
            '\n这是模拟状态提供的轻量表达参考，不是新的人设或必须照做的台词；无需复述状态标签或数值，'
            '不把推算当成真实发生的事。仍可自行决定暂不发送。')[:600]


def read(database,now=None,snapshot=None):
    path=Path(database)
    if not path.is_file():return ''
    try:
        db=sqlite3.connect('file:'+path.resolve().as_posix()+'?mode=ro',uri=True,timeout=.5)
        try:
            setting=db.execute("SELECT value FROM settings WHERE key='presence_engine'").fetchone()
            if not setting or json.loads(setting[0]).get('enabled') is not True:return ''
            row=db.execute('SELECT state_json,last_tick_at,last_error FROM presence_state WHERE id=1').fetchone()
        finally:db.close()
        if not row or row[2] or not row[1]:return ''
        stamp=datetime.fromisoformat(row[1]);age=(now or datetime.now())-stamp
        if age<timedelta(minutes=-2) or age>timedelta(minutes=30):return ''
        state=json.loads(row[0])
        if isinstance(snapshot,dict) and isinstance(state,dict):
            snapshot.update(at=row[1], values={key:state.get(key) for key in ('connection','pride','valence','arousal','immersion','lust')})
        return describe(state) if isinstance(state,dict) else ''
    except (sqlite3.Error,ValueError,TypeError,AttributeError):return ''
