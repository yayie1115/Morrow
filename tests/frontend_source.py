"""Read the shipped HTML together with its referenced local JS/CSS for contract tests."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def expand_frontend(page):
    if '<html' not in page.lower():
        return page
    def asset(match):
        path = ROOT / match.group(1).split('?')[0].lstrip('/')
        if not path.is_file():
            raise AssertionError('Missing referenced frontend asset: ' + str(path))
        return match.group(0) + '\n' + path.read_text(encoding='utf-8')
    return re.sub(r'(?:src|href)=["\'](/static/app-[0-9a-f]+\.(?:js|css)(?:\?[^"\']*)?)["\']', asset, page)

def frontend_source():
    return expand_frontend((ROOT / 'static/index.html').read_text(encoding='utf-8'))
