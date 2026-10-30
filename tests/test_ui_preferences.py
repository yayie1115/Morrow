import sqlite3
import unittest
import ui_preferences

class UiPreferencesTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.execute("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)")
        self.addCleanup(self.db.close)
    def test_existing_device_values_win_over_first_launch_defaults(self):
        ui_preferences.save(self.db,{"values":{"prefTheme":"pink"}})
        result=ui_preferences.save(self.db,{"values":{"prefTheme":"paper","prefFont":"16px"},"fill_only":True})
        self.assertEqual(result,{"prefTheme":"pink","prefFont":"16px"})
    def test_partial_update_and_explicit_removal_preserve_other_settings(self):
        ui_preferences.save(self.db,{"values":{"prefTheme":"pink","appBgImage":"data:image/png;base64,AAAA"}})
        result=ui_preferences.save(self.db,{"values":{"appBgImage":None}})
        self.assertEqual(result,{"prefTheme":"pink","appBgImage":None})
        self.assertEqual(ui_preferences.read(self.db),result)
    def test_credentials_and_external_image_references_are_rejected(self):
        for values in ({"api_key":"synthetic"},{"appBgImage":"https://example.test/image.png"},{"prefTheme":123}):
            with self.assertRaises(ValueError):ui_preferences.save(self.db,{"values":values})
        self.assertEqual(ui_preferences.read(self.db),{})
