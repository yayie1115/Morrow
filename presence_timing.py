"""Honor configured jiwen cadence while retaining bounded elapsed-time catchup."""


def due(elapsed_minutes, interval_minutes, force=False):
    return bool(force or elapsed_minutes >= interval_minutes)
