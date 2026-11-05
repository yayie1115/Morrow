"""Bounded structure-only diagnostics. No text or arbitrary field values retained."""
import json

FIELDS = frozenset('id object choices delta message content reasoning reasoning_content thinking tool_calls function_call function arguments name finish_reason usage error code type candidates parts text thought functionCall finishReason promptFeedback blockReason safetyRatings role index stop_reason stop_sequence'.split())
REASONS = frozenset('stop length tool_calls function_call content_filter end_turn tool_use max_tokens stop_sequence STOP MAX_TOKENS SAFETY RECITATION OTHER BLOCKLIST PROHIBITED_CONTENT SPII MALFORMED_FUNCTION_CALL MALFORMED_RESPONSE'.split())
EVENTS = frozenset('message_start message_delta message_stop content_block_start content_block_delta content_block_stop ping error'.split())


class Collector:
    def __init__(self, headers):
        mime = str(headers.get('Content-Type', '')).split(';')[0].lower().strip()
        self.data = {'content_type': mime if mime in ('text/event-stream','application/json','text/html','text/plain') else 'other', 'lines':0, 'data_events':0, 'json_events':0, 'invalid_json':0, 'done':False, 'html_seen':False, 'non_sse_json':0, 'fields':{}, 'finish_reasons':[], 'event_types':[]}

    def observe(self, line):
        if not isinstance(line, str):
            return
        d = self.data
        d['lines'] += 1
        s = line.strip()
        if s.lower().startswith(('<!doctype html','<html')):
            d['html_seen'] = True
        if s.startswith('data:'):
            d['data_events'] += 1
            s = s[5:].strip()
            if s == '[DONE]':
                d['done'] = True
                return
        elif s.startswith(('{','[')):
            d['non_sse_json'] += 1
        else:
            return
        try:
            obj = json.loads(s)
        except (ValueError, TypeError):
            d['invalid_json'] += 1
            return
        d['json_events'] += 1

        def visit(value, depth=0):
            if depth > 7:
                return
            if isinstance(value, dict):
                for key, item in list(value.items())[:64]:
                    label = key if key in FIELDS else 'other'
                    d['fields'][label] = d['fields'].get(label, 0) + 1
                    if key in ('finish_reason','finishReason','stop_reason','blockReason') and item is not None:
                        reason = item if isinstance(item, str) and item in REASONS else 'other'
                        if reason not in d['finish_reasons']:
                            d['finish_reasons'].append(reason)
                    if key == 'type' and isinstance(item, str) and item in EVENTS and item not in d['event_types']:
                        d['event_types'].append(item)
                    if isinstance(item, (dict, list)):
                        visit(item, depth+1)
            elif isinstance(value, list):
                for item in value[:8]:
                    visit(item, depth+1)
        visit(obj)
