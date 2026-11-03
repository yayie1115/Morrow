"""System job: sync only Sakie-owned chat routes, never memory/model task assignments.

Install beside serein_registry.py in a root-owned directory, outside app-writable code.
"""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
import serein_registry as registry


def atomic(path, data):
    st = path.stat()
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.registry-')
    try:
        with os.fdopen(fd, 'w') as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.flush(); os.fsync(file.fileno())
        os.chown(name, st.st_uid, st.st_gid); os.chmod(name, st.st_mode & 0o777)
        os.replace(name, path)
    finally:
        if os.path.exists(name): os.unlink(name)


def synchronize(conn, config_path, execute):
    if not registry.read(conn):
        return
    desired = registry.plan(conn)
    prior = registry.read(conn, registry.STATUS)
    if prior.get('signature') == desired['signature'] and prior.get('state') == 'ready':
        return
    config = json.loads(config_path.read_text())
    try:
        backup_dir = config_path.parent / 'registry-backups'
        backup_dir.mkdir(mode=0o700, exist_ok=True)
        backup = backup_dir / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex + '.json')
        descriptor = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as file:
            json.dump({'gateway': config, 'status': prior}, file)
        if desired['enabled']:
            if desired['unavailable_provider_ids']:
                raise ValueError('Unsupported or incomplete chat provider')
            current = execute('read')
            descriptor = os.open(str(backup) + '.upstreams', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, 'w') as file:
                json.dump({'upstreams': current['upstreams'], 'settings_version': current['settings_version']}, file)
            managed_ids = {g['id'] for g in desired['groups']}
            # Preserve routes assigned to background tasks; do not silently remove them.
            assigned = set(current.get('assignments', {}).values())
            keep = []
            for group in current['upstreams']:
                owned = str(group.get('id', '')).startswith('sakie-managed-provider-')
                if owned and group['id'] not in managed_ids and any(m['id'] in assigned for m in group.get('models', [])):
                    raise ValueError('Managed route is assigned to a background task')
                if not owned: keep.append(group)
            if registry.plan(conn)['signature'] != desired['signature']:
                return
            execute('save', {'expected_version': current['settings_version'], 'upstreams': keep + desired['groups']})
        # Never overwrite concurrent operator changes to the protected transport config.
        fresh = json.loads(config_path.read_text())
        if fresh != config: raise ValueError('Transport configuration changed concurrently')
        fresh['providers'] = desired['mapping'] if desired['enabled'] else {}
        fresh['enabled'] = desired['enabled']
        atomic(config_path, fresh)
        registry.write(conn, registry.STATUS, {'state': 'ready', 'signature': desired['signature'],
                       'synced_at': datetime.now(timezone.utc).isoformat()})
        conn.commit()
    except Exception:
        registry.write(conn, registry.STATUS, {'state': 'error', 'attempt_signature': desired['signature']})
        conn.commit()
        # Exceptions may contain upstream secrets; only a fixed message reaches system logs.
        print('Serein registry synchronization failed; inspect the private configuration.')


def main():
    import fcntl
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', required=True); parser.add_argument('--gateway-config', required=True)
    parser.add_argument('--container', required=True); parser.add_argument('--serein-database', default='/data/serein.db')
    parser.add_argument('--lock', required=True)
    args = parser.parse_args()
    with open(args.lock, 'w') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: return
        def execute(action, payload=None):
            code = ('import json,sys;from serein.deployment import read_settings,save_settings;'
                    'p=json.load(sys.stdin);s=read_settings(p["db"]) if p["action"]=="read" else save_settings(p["db"],p["changes"]);'
                    'print(json.dumps(s))')
            result = subprocess.run(['docker', 'exec', '-i', args.container, 'python', '-c', code],
                                    input=json.dumps({'db': args.serein_database, 'action': action, 'changes': payload}),
                                    capture_output=True, text=True, timeout=45, check=True)
            return json.loads(result.stdout)
        with sqlite3.connect(args.database, timeout=10) as conn:
            synchronize(conn, Path(args.gateway_config), execute)


if __name__ == '__main__': main()
