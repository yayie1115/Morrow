"""Let existing closeness state modestly contribute to one shared contact signal."""
import json
import math
import sqlite3
from datetime import datetime, timedelta
import presence_frequency

MAX_BOOST = .08
MIN_CONNECTION = .18
LUST_START = .6


def augment(db, triggers, *, threshold=.26, pride_block=1., now=None):
    items = list(triggers or [])
    signals = {item.get('action') for item in items if isinstance(item, dict)}
    if 'contact' in signals or not signals.intersection({'observation', 'intimate_check'}):
        return items
    if not presence_frequency.policy(db):
        return items
    try:
        setting = db.execute("SELECT value FROM settings WHERE key='presence_engine'").fetchone()
        if not setting or json.loads(setting[0]).get('enabled') is not True:
            return items
        row = db.execute('SELECT state_json,last_tick_at,last_error FROM presence_state WHERE id=1').fetchone()
        if not row or row[2] or not row[1]:
            return items
        age = (now or datetime.now()) - datetime.fromisoformat(row[1])
        if age < timedelta(minutes=-2) or age > timedelta(minutes=30):
            return items
        state = json.loads(row[0])
        values = [state[key] for key in ('connection', 'lust', 'valence', 'pride')]
        if any(type(v) not in (int, float) or not math.isfinite(v) for v in values):
            return items
        connection, lust, valence, pride = values
        if not (0 <= connection <= 1 and 0 <= lust <= 1 and -1 <= valence <= 1 and -1 <= pride <= 1):
            return items
        if connection < MIN_CONNECTION or lust <= LUST_START or valence <= -.3 or pride >= pride_block:
            return items
        boost = MAX_BOOST * (lust-LUST_START)/(1-LUST_START)
        if connection + boost + 1e-9 < threshold:
            return items
        basis = {'source': 'connection_lust', 'connection': connection, 'lust': lust,
                 'boost': round(boost, 4), 'threshold': threshold, 'state_at': row[1]}
        return items + [{'action': 'contact', 'contact_basis': basis}]
    except (sqlite3.Error, ValueError, TypeError, KeyError, AttributeError):
        return items
