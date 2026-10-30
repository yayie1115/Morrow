import unittest
from message_time import history_time_prefix
class MessageTimeTest(unittest.TestCase):
    def test_legacy_naive_time_is_not_shifted(self):
        self.assertEqual(history_time_prefix("2026-10-30 18:05:00"),"[2026-10-30 18:05 UTC+8] ")
    def test_aware_sources_convert_across_midnight(self):
        self.assertEqual(history_time_prefix("2026-10-30T20:05:00Z"),"[2026-10-31 04:05 UTC+8] ")
        self.assertEqual(history_time_prefix("2026-10-30T18:05:00+09:00"),"[2026-10-30 17:05 UTC+8] ")
    def test_invalid_source_does_not_invent_a_time(self):
        self.assertEqual(history_time_prefix("not a time"),"")
