"""Request-only timestamp projection; legacy naive message times are UTC+8."""
from datetime import datetime,timedelta,timezone
DEFAULT_TIMEZONE=timezone(timedelta(hours=8))
def history_time_prefix(value):
    text=str(value or "").strip()
    if not text:return ""
    try:
        stamp=datetime.fromisoformat(text[:-1]+"+00:00" if text.endswith("Z") else text)
        if stamp.tzinfo is None:stamp=stamp.replace(tzinfo=DEFAULT_TIMEZONE)
        stamp=stamp.astimezone(DEFAULT_TIMEZONE)
    except (ValueError,TypeError,OverflowError):return ""
    return stamp.strftime("[%Y-%m-%d %H:%M UTC+8] ")
