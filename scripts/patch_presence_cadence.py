"""Apply the narrow cadence fix to an existing external jiwen adapter."""
from pathlib import Path


def transform(text):
    old = 'if minutes < 1 and not force:'
    new = 'if not presence_timing.due(elapsed, config["interval_minutes"], force):'
    if new in text and 'import presence_timing' in text:
        return text
    if text.count(old) != 1 or text.count('import json\n') != 1:
        raise ValueError('Unexpected adapter version; inspect before patching')
    return text.replace('import json\n', 'import json\nimport presence_timing\n', 1).replace('        minutes = config["interval_minutes"]\n', '        minutes = config["interval_minutes"]\n        elapsed = minutes\n', 1).replace(old, new, 1)


if __name__ == '__main__':
    import sys
    path = Path(sys.argv[1])
    path.write_text(transform(path.read_text(encoding='utf-8')), encoding='utf-8')
