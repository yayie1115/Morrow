"""Start/end metadata in the existing HTTP ledger, without prompts or secrets."""
from contextvars import ContextVar
from contextlib import closing
from functools import wraps
import inspect
import json
import sqlite3
import time
import uuid
from urllib.parse import urlsplit, urlunsplit

_current = ContextVar('model_http_trace', default=None)
_HEADERS = ('x-request-id', 'request-id', 'x-ofoxai-request-id', 'x-ofox-request-id',
            'x-goog-request-id', 'x-amzn-requestid', 'x-correlation-id')


def _safe_id(value):
    return str(value)[:160] if isinstance(value, str) and all(32 <= ord(c) < 127 for c in value) else ''


def _write(state, outcome):
    attempt = state.get('attempt')
    if not attempt or not attempt.get('row_id'): return
    metadata = {'trace_id': attempt['trace_id'], 'outcome': outcome,
                'upstream_ids': attempt.get('upstream_ids', {}),
                'session_id': state['provider'].get('trace_session_id'),
                'user_message_id': state['provider'].get('trace_user_message_id'),
                'repetition_origin': state.get('repetition_origin')}
    try:
        with closing(sqlite3.connect(state['db'], timeout=.3)) as conn, conn:
            conn.execute('UPDATE http_request_logs SET ok=?,status_code=?,elapsed_ms=?,error_type=?,error=? WHERE id=?',
                         (int(outcome == 'complete'), attempt.get('status'),
                          int((time.monotonic() - attempt['started']) * 1000),
                          '' if outcome == 'complete' else outcome,
                          json.dumps(metadata, separators=(',', ':')), attempt['row_id']))
    except sqlite3.Error: pass


def response_id(value):
    state = _current.get()
    if state and state.get('attempt') and _safe_id(value):
        state['attempt'].setdefault('upstream_ids', {})['body_id'] = _safe_id(value)


def legacy(error_type='', ok=False):
    """Existing transport log calls finish their own started row, not a second row."""
    state = _current.get()
    if not state or not state.get('attempt'): return False
    outcome = state['outcome'] if state['outcome'] in ('stream_error', 'repetition_abort', 'cancelled', 'exception', 'connection_error') else ('complete' if ok else (error_type or 'request_error'))
    state['outcome'] = outcome
    _write(state, outcome)
    return True


def post(send, url, **kwargs):
    state = _current.get()
    if not state: return send(url, **kwargs)
    if state.get('attempt'):
        _write(state, 'retry')
        previous = state['attempt'].get('response')
        if previous is not None: previous.close()
    parsed = urlsplit(url)
    endpoint = urlunsplit((parsed.scheme, parsed.netloc.split('@')[-1], parsed.path, '', ''))
    body = kwargs.get('json') or {}
    attempt = {'trace_id': uuid.uuid4().hex, 'started': time.monotonic(), 'row_id': None}
    state['attempt'] = attempt
    state['outcome'] = 'in_flight'
    try:
        with closing(sqlite3.connect(state['db'], timeout=.3)) as conn, conn:
            metadata = state['provider']
            cursor = conn.execute(
                'INSERT INTO http_request_logs(provider_id,provider_name,format,model,endpoint,ok,error_type,error,req_bytes,msg_count) '
                'VALUES (?,?,?,?,?,0,?,?,?,?)',
                (metadata.get('id'), '', metadata.get('format') or '', state['model'], endpoint,
                 'in_flight', json.dumps({'trace_id': attempt['trace_id'],
                                          'session_id': metadata.get('trace_session_id'),
                                          'user_message_id': metadata.get('trace_user_message_id')}),
                 len(json.dumps(body, ensure_ascii=False).encode()),
                 len(body.get('messages') or body.get('contents') or [])))
            attempt['row_id'] = cursor.lastrowid
    except (sqlite3.Error, TypeError, ValueError): pass
    try:
        response = send(url, **kwargs)
    except BaseException:
        state['outcome'] = 'connection_error'
        _write(state, state['outcome'])
        raise
    attempt['response'] = response
    attempt['status'] = response.status_code
    headers = getattr(response, 'headers', {}) or {}
    attempt['upstream_ids'] = {key: _safe_id(headers.get(key)) for key in _HEADERS
                               if _safe_id(headers.get(key))}
    _write(state, 'in_flight')
    return response


def traced(function):
    signature = inspect.signature(function)

    @wraps(function)
    def run(*args, **kwargs):
        if _current.get() is not None:
            return (yield from function(*args, **kwargs))
        bound = signature.bind(*args, **kwargs).arguments
        engine = bound.get('engine')
        db = engine.DB_PATH if engine else function.__globals__.get('DB_PATH')
        state = {'db': db, 'model': bound.get('model') or '', 'provider': bound.get('provider_meta') or {},
                 'outcome': 'in_flight'}
        token = _current.set(state)
        gen = function(*args, **kwargs)
        completed = False
        try:
            while True:
                try: event = next(gen)
                except StopIteration as done:
                    completed = True
                    return done.value
                if event[0] == 'error':
                    state['outcome'] = 'repetition_abort' if isinstance(event[1], dict) and event[1].get('code') == 'REPETITION_ABORT' else 'stream_error'
                    if state['outcome'] == 'repetition_abort':
                        state['repetition_origin'] = 'upstream_text' if event[1].get('origin') == 'upstream_text' else 'projected_text'
                    _write(state, state['outcome'])
                yield event
        except GeneratorExit:
            if state['outcome'] == 'in_flight': state['outcome'] = 'cancelled'
            raise
        except BaseException:
            if state['outcome'] == 'in_flight': state['outcome'] = 'exception'
            raise
        finally:
            try: gen.close()
            finally:
                if completed and state['outcome'] == 'in_flight': state['outcome'] = 'complete'
                _write(state, state['outcome'])
                response = (state.get('attempt') or {}).get('response')
                try:
                    if response is not None: response.close()
                except Exception:
                    pass
                finally:
                    _current.reset(token)
    return run
