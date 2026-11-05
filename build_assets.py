"""Build hashed static assets from the editable sources.

Source of truth:
  static/app.src.js
  static/app.src.css

Output:
  app-<hash10>.js / app-<hash10>.css  (+ index.html references rewritten)

Run after editing either source file:  python build_assets.py
"""

import hashlib
import os
import re

STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
HTML = os.path.join(STATIC, "index.html")


def build_one(src_name, ext):
    src_path = os.path.join(STATIC, src_name)
    body = open(src_path, encoding="utf-8").read()
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()[:10]
    out_name = "app-%s.%s" % (digest, ext)
    with open(os.path.join(STATIC, out_name), "w", encoding="utf-8") as handle:
        handle.write(body)
    return out_name


def main():
    js_name = build_one("app.src.js", "js")
    css_name = build_one("app.src.css", "css")

    html = open(HTML, encoding="utf-8").read()
    new_html = re.sub(r"app-[0-9a-f]{10}\.js", js_name, html)
    new_html = re.sub(r"app-[0-9a-f]{10}\.css", css_name, new_html)
    if new_html != html:
        open(HTML, "w", encoding="utf-8").write(new_html)

    for name in os.listdir(STATIC):
        if re.fullmatch(r"app-[0-9a-f]{10}\.(js|css)", name) and name not in (js_name, css_name):
            os.remove(os.path.join(STATIC, name))
            print("removed stale:", name)

    print("js:", js_name, "| css:", css_name, "| html:", len(new_html), "chars")


if __name__ == "__main__":
    main()
