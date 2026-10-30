import sqlite3
import unittest
import shutil
import subprocess
from pathlib import Path
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

    @unittest.skipUnless(shutil.which("node"),"Node unavailable")
    def test_unchanged_server_preferences_do_not_repaint(self):
        script=r"""
const vm=require('vm'),fs=require('fs'),assert=require('assert');
const values=new Map([['prefTheme','pink']]);let cloud={prefTheme:'pink'},paints=0;
const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const context={window:{},document:{addEventListener(){}},addEventListener(){},localStorage,setTimeout,clearTimeout,
fetch:async(url,options)=>{if(options.method==='PUT')Object.assign(cloud,JSON.parse(options.body).values);return{ok:true,json:async()=>({values:{...cloud}})}}};
vm.runInNewContext(fs.readFileSync('static/ui-preferences.js','utf8'),context);
(async()=>{
 const start=()=>context.window.sakieUiPreferences.start(()=>paints++);
 await start();assert.equal(paints,0);
 cloud.prefTheme='green';await start();assert.equal(paints,1);assert.equal(values.get('prefTheme'),'green');
 await start();assert.equal(paints,1);
 cloud.prefTheme=null;await start();assert.equal(paints,2);assert.equal(values.has('prefTheme'),false);
 await start();assert.equal(paints,2);
})().catch(e=>{console.error(e);process.exitCode=1});
"""
        subprocess.run([shutil.which("node"),"-e",script],check=True)
