"""Authenticated image derivatives. Original uploads are never rewritten."""
import hashlib
import math
import os
import tempfile
import threading
from PIL import Image, ImageOps

_LOCK = threading.Semaphore(1)
_VERSION = "v1"


def derivative(upload_dir, data_dir, name, kind="thumb"):
    root = os.path.realpath(upload_dir)
    source = os.path.realpath(os.path.join(root, name))
    if os.path.commonpath([root, source]) != root or not os.path.isfile(source):
        raise FileNotFoundError(name)
    if kind not in {"thumb", "screen", "tool"}:
        raise ValueError("Unknown preview kind")
    stat = os.stat(source)
    key = hashlib.sha256(f"{name}|{stat.st_size}|{stat.st_mtime_ns}|{kind}|{_VERSION}".encode()).hexdigest()
    tool = kind == "tool"
    directory = root if tool else os.path.join(data_dir, ".chat_previews")
    filename = ("tool-preview-" if tool else "") + key + (".jpg" if tool else ".webp")
    target = os.path.join(directory, filename)
    mime = "image/jpeg" if tool else "image/webp"
    if os.path.isfile(target):
        return target, mime
    with _LOCK:
        if os.path.isfile(target):
            return target, mime
        try:
            opened = Image.open(source)
        except Image.DecompressionBombError:
            return source, None
        with opened:
            if opened.width * opened.height > 40000000:
                return source, None
            if getattr(opened, "is_animated", False) and not tool:
                return source, None  # Preserve animation in the browser.
            image = ImageOps.exif_transpose(opened)
            edge = {"thumb":640,"screen":1600,"tool":1568}[kind]
            if tool:
                edge = min(edge, round(max(image.size) * min(1, math.sqrt(1150000 / (image.width * image.height)))))
            image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
            image = image.convert("RGBA")
            if tool:
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            os.makedirs(directory, exist_ok=True)
            handle = tempfile.NamedTemporaryFile(dir=directory, prefix=".preview-", delete=False)
            temp = handle.name
            handle.close()
            try:
                image.save(temp, format="JPEG" if tool else "WEBP", quality=84, **({"optimize":True} if tool else {"method":3}))
                # Do not replace an already-smaller original for display.
                if not tool and os.path.getsize(temp) >= stat.st_size:
                    return source, None
                os.replace(temp, target)
            finally:
                if os.path.isfile(temp):
                    os.unlink(temp)  # Only the temporary file created above.
    return target, mime
