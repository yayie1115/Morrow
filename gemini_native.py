"""Gemini GenerateContent transport sharing the existing chat/tool orchestrator."""
import copy
import json
import re
import time
import uuid
from urllib.parse import quote

import requests
import request_trace


def api_root(base_url):
    base = base_url.rstrip('/')
    return base if re.search(r'/v1(?:beta)?$', base) else base + '/v1beta'


def endpoint(base_url, model, stream=True):
    model = model.removeprefix('models/')
    suffix = ':streamGenerateContent?alt=sse' if stream else ':generateContent'
    return api_root(base_url) + '/models/' + quote(model, safe='/.-_') + suffix


def usage_numbers(raw):
    """Keep native accounting alongside the shared non-overlapping usage fields."""
    return {
        'prompt_tokens': int(raw.get('promptTokenCount') or 0),
        'completion_tokens': int(raw.get('candidatesTokenCount') or 0) + int(raw.get('thoughtsTokenCount') or 0),
        'total_tokens': int(raw.get('totalTokenCount') or 0),
        'prompt_tokens_details': {'cached_tokens': int(raw.get('cachedContentTokenCount') or 0)},
        'completion_tokens_details': {'reasoning_tokens': int(raw.get('thoughtsTokenCount') or 0)},
        'gemini_usage': copy.deepcopy(raw),
    }


def contents(messages):
    out, calls = [], {}
    for message in messages:
        role = 'model' if message['role'] == 'assistant' else 'user'
        parts = []
        if message.get('_gemini_parts') is not None:
            parts = copy.deepcopy(message['_gemini_parts'])
            native_calls = [p['functionCall'] for p in parts if p.get('functionCall')]
            for call, native_call in zip(message.get('tool_calls') or [], native_calls):
                calls[call['id']] = (call['function']['name'], native_call.get('id'))
        elif message['role'] == 'tool':
            call_id = message.get('tool_call_id')
            if call_id in calls:
                name, native_id = calls[call_id]
                response = {'name': name, 'response': {'result': message.get('content', '')}}
                if native_id: response['id'] = native_id
                parts = [{'functionResponse': response}]
            else:
                # Older persisted tool history has no native signatures. Present it
                # as sourced history, never forge signatures or replay unsigned calls.
                parts = [{'text': '【历史工具结果】\n' + str(message.get('content') or '')}]
        else:
            value = message.get('content') or ''
            for item in value if isinstance(value, list) else [{'type': 'text', 'text': value}]:
                if item.get('type') == 'text':
                    if item.get('text'): parts.append({'text': item['text']})
                elif item.get('type') == 'image_url':
                    url = item['image_url']['url']
                    match = re.fullmatch(r'data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)', url)
                    if not match:
                        raise ValueError('Gemini 图片需要内联数据；未发送不支持的图片地址。')
                    parts.append({'inlineData': {'mimeType': match[1], 'data': match[2]}})
                else:
                    raise ValueError('Gemini 请求包含尚未支持的消息内容类型。')
            for call in message.get('tool_calls') or []:
                parts.append({'text': '【历史工具调用】' + call['function']['name'] + '\n' + call['function']['arguments']})
        if parts:
            if out and out[-1]['role'] == role:
                out[-1]['parts'].extend(parts)
            else:
                out.append({'role': role, 'parts': parts})
    return out


def payload(engine, model, messages, think, definitions, max_tokens=None):
    converted = engine._compat_prompt_messages(engine._bounded_tool_context(messages))
    config = {'maxOutputTokens': max_tokens or engine.CHAT_MAX_TOKENS,
              'thinkingConfig': {'includeThoughts': True}}
    if think:
        if re.search(r'gemini-[34]', model, re.I):
            config['thinkingConfig']['thinkingLevel'] = 'high'
        else:
            config['thinkingConfig']['thinkingBudget'] = 8192
    result = {'contents': contents(converted), 'generationConfig': config,
              'safetySettings': [s for s in engine._gemini_safety_settings()
                                 if s['category'] != 'HARM_CATEGORY_CIVIC_INTEGRITY']}
    functions = []
    for definition in definitions or []:
        fn = definition.get('function') or {}
        if not fn.get('name'): continue
        functions.append({'name': fn['name'], 'description': fn.get('description', ''),
                          'parametersJsonSchema': copy.deepcopy(fn.get('parameters') or {'type': 'object', 'properties': {}})})
    if functions:
        result['tools'] = [{'functionDeclarations': functions}]
    return result


@request_trace.traced
def stream(engine, base_url, api_key, model, messages, think, provider_meta, tool_definitions=None, max_tokens=None):
    started = time.monotonic()
    url = endpoint(base_url, model)
    usage, text, calls, native_parts = None, [], [], []
    raw_reply_parts = []
    finished, failed, response = False, False, None
    splitter = engine._ThinkSplitter(detect_markers=True)
    definitions = engine.tools.chat_tool_definitions() if tool_definitions is None else tool_definitions
    try:
        body = payload(engine, model, messages, think, definitions, max_tokens=max_tokens)
        for key, native_key, ceiling in (("temperature", "temperature", 2.0), ("top_p", "topP", 1.0)):
            value = (provider_meta.get("generation") or {}).get(key)
            if value is not None:
                number = float(value)
                if not 0 <= number <= ceiling:
                    raise ValueError("Invalid generation parameter")
                body["generationConfig"][native_key] = number
        response = request_trace.post(requests.post, url, headers={'x-goog-api-key': api_key, 'Content-Type': 'application/json'},
                                 json=body, stream=True, timeout=engine.REQUEST_TIMEOUT)
        if response.status_code != 200:
            yield 'error', {'status': response.status_code, 'message': engine._http_error_reason(response)}
            failed = True
            return ''.join(text), [], usage
        for line in engine._sse_lines(response):
            if not line.startswith('data:'): continue
            data = line[5:].strip()
            if not data or data == '[DONE]': continue
            obj = json.loads(data)
            request_trace.response_id(obj.get("responseId"))
            if obj.get('error'):
                failed = True
                yield 'error', {'status': (obj['error'] or {}).get('code'), 'message': 'Gemini 上游流式请求失败。'}
                return ''.join(text), [], usage
            if obj.get('usageMetadata'):
                usage = usage_numbers(obj['usageMetadata'])
            feedback = obj.get('promptFeedback') or {}
            if feedback.get('blockReason'):
                failed = True
                yield 'error', {'status': 200, 'message': 'Gemini 请求被拦截：' + str(feedback['blockReason'])}
                return ''.join(text), [], usage
            candidates = obj.get('candidates') or []
            if not candidates: continue
            candidate = candidates[0]
            for part in (candidate.get('content') or {}).get('parts') or []:
                native_parts.append(copy.deepcopy(part))
                if part.get('text'):
                    if part.get('thought'):
                        yield 'reasoning', part['text']
                    else:
                        raw_reply_parts.append(part['text'])
                        if engine._looks_like_runaway(''.join(raw_reply_parts)):
                            failed = True
                            yield 'error', {'status': 200, 'code': 'REPETITION_ABORT', 'origin': 'upstream_text',
                                            'message': '回复出现持续重复，已停止；已收到内容予以保留。'}
                            return ''.join(text), [], usage
                        for kind, chunk in splitter.feed(part['text']):
                            if kind == 'delta': text.append(chunk)
                            yield kind, chunk
                if part.get('functionCall'):
                    fn = part['functionCall']
                    if not isinstance(fn.get('args', {}), dict) or not fn.get('name'):
                        raise ValueError('Gemini 返回了无效的工具参数。')
                    call_id = fn.get('id') or 'gemini_' + uuid.uuid4().hex
                    calls.append({'id': call_id, 'name': fn['name'],
                                  'arguments': json.dumps(fn.get('args') or {}, ensure_ascii=False)})
            reason = candidate.get('finishReason')
            if reason:
                finished = True
                if reason != 'STOP':
                    failed = True
                    yield 'error', {'status': 200, 'message': 'Gemini 回复未完整完成：' + str(reason)}
                    return ''.join(text), [], usage
            if engine._looks_like_runaway(''.join(text)):
                failed = True
                yield 'error', {'status': 200, 'code': 'REPETITION_ABORT',
                                'message': '回复出现持续重复，已停止；已收到内容予以保留。'}
                return ''.join(text), [], usage
        for kind, chunk in splitter.flush():
            if kind == 'delta': text.append(chunk)
            yield kind, chunk
        if not finished or not (text or calls):
            raise ValueError('Gemini 回复流未完成或没有返回正文，请核对已保存内容。')
        if calls:
            calls[0]['_gemini_parts'] = native_parts
        return ''.join(text), calls, usage
    except (requests.RequestException, OSError, ValueError, TypeError, KeyError):
        failed = True
        for kind, chunk in splitter.flush():
            if kind == 'delta': text.append(chunk)
            yield kind, chunk
        yield 'error', {'status': getattr(response, 'status_code', None),
                        'message': 'Gemini 原生请求失败或响应不完整；已收到内容请核对保存状态。'}
        return ''.join(text), [], usage
    finally:
        if response is not None: response.close()
        engine._log_http_request(provider_meta, model, url, not failed,
                                 status_code=getattr(response, 'status_code', None),
                                 elapsed_ms=int((time.monotonic() - started) * 1000),
                                 error_type='GeminiTransportError' if failed else '',
                                 msg_count=len(messages))
