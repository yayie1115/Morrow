"""Authenticated UI preferences stored in the existing settings table."""
import json
KEYS = frozenset("prefTheme prefNight prefFont prefNav prefNook prefDailyChat prefDailyAvatars dailyUserAvatar dailyAssistantAvatar appBgImage appBgOpacity chatBgImage chatBgOpacity".split())
STORE = "shared_ui_preferences_v1"
def read(db):
    row=db.execute("SELECT value FROM settings WHERE key=?",(STORE,)).fetchone()
    return json.loads(row[0]) if row else {}
def save(db, body):
    if not isinstance(body,dict) or not isinstance(body.get("values"),dict):
        raise ValueError("Invalid preferences")
    values=body["values"]
    if set(values)-KEYS: raise ValueError("Unsupported preference")
    for key,value in values.items():
        if value is not None and (not isinstance(value,str) or len(value)>6000000): raise ValueError("Invalid preference value")
        if key.endswith("Image") or key.endswith("Avatar"):
            if value and not (value.startswith("data:image/") or value.startswith("/uploads/")): raise ValueError("Invalid image reference")
    if len(json.dumps(values))>18000000: raise ValueError("Preferences too large")
    db.execute("BEGIN IMMEDIATE")
    try:
        current=read(db)
        for key,value in values.items():
            if body.get("fill_only") and key in current: continue
            current[key]=value
        db.execute("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(STORE,json.dumps(current)))
        db.commit()
        return current
    except Exception:
        db.rollback();raise
