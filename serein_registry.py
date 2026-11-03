"""Bounded, private registry plan shared by the UI and the system synchronizer."""
import hashlib
import json
import sqlite3
from urllib.parse import urlsplit

KEY = 'serein_registry_v1'
STATUS = 'serein_registry_status_v1'


def read(conn, key=KEY):
    try:
        row = conn.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()
    except sqlite3.OperationalError as error:
        if 'no such table' in str(error):
            return {}
        raise
    try:
        value = json.loads(row[0]) if row else {}
        return value if isinstance(value, dict) else {}
    except (ValueError, TypeError):
        return {}


def write(conn, key, value):
    conn.execute('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
                 (key, json.dumps(value, ensure_ascii=False)))


def eligible(model):
    name = str(model).lower()
    return not any(word in name for word in ('embedding', 'rerank', 'bge-', 'whisper', 'tts', 'speech', 'image-', 'imagen', 'dall-e', 'flux', 'veo', 'seedance'))


def plan(conn):
    policy = read(conn)
    excluded = policy.get('excluded_provider_ids', [])
    groups, mapping, unavailable = [], {}, []
    for row in conn.execute('SELECT id,name,format,api_url,api_key,models FROM providers ORDER BY id'):
        pid, name, protocol, url, secret, raw = tuple(row)
        if pid in excluded:
            continue
        try:
            models = json.loads(raw or '[]')
        except ValueError:
            models = []
        models = [m for m in models if isinstance(m, dict) and isinstance(m.get('id'), str) and m['id'] and eligible(m['id'])]
        if not models:
            continue
        if protocol not in ('openai', 'claude'):
            unavailable.append(pid)
            continue
        parsed = urlsplit(url or '')
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or not secret:
            unavailable.append(pid)
            continue
        group_name = 'Sakie managed ' + str(pid)
        entries = []
        for model in models:
            model_id = model['id']
            entries.append({'id': 'sakie-managed-' + str(pid) + '-' + hashlib.sha256(model_id.encode()).hexdigest()[:16],
                            'label': model_id, 'upstream_model': model_id, 'reasoning_content_compat': 'auto'})
            mapping.setdefault(str(pid), {})[model_id] = group_name + '/' + model_id
        groups.append({'id': 'sakie-managed-provider-' + str(pid), 'name': group_name,
                       'protocol': 'anthropic' if protocol == 'claude' else 'openai',
                       'base_url': url.rstrip('/'), 'api_key': secret, 'models': entries})
    payload = {'enabled': policy.get('enabled') is True, 'groups': groups, 'mapping': mapping,
               'excluded_provider_ids': excluded, 'unavailable_provider_ids': unavailable}
    payload['signature'] = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return payload


def public_status(conn):
    desired = plan(conn)
    status = read(conn, STATUS)
    return {'enabled': desired['enabled'], 'excluded_provider_ids': desired['excluded_provider_ids'],
            'unavailable_provider_ids': desired['unavailable_provider_ids'],
            'state': ('disabled' if not desired['enabled'] else
                      'ready' if status.get('signature') == desired['signature'] and status.get('state') == 'ready' else
                      'error' if status.get('state') == 'error' and status.get('attempt_signature') == desired['signature'] else 'pending'),
            'synced_at': status.get('synced_at'), 'model_count': sum(len(v) for v in desired['mapping'].values())}
