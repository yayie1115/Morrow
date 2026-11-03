import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

NODE=os.environ.get('JIWEN_TEST_NODE') or shutil.which('node')


@unittest.skipUnless(NODE,'Node runtime unavailable')
class JiwenRunnerProtocolTest(unittest.TestCase):
    def test_engine_diagnostics_never_pollute_json_stdout(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'vendor/jiwen').mkdir(parents=True)
            shutil.copyfile('jiwen_runner.cjs',root/'jiwen_runner.cjs')
            (root/'package.json').write_text('{"type":"commonjs"}')
            (root/'vendor/jiwen/jiwen.js').write_text('''
console.log('upstream loading diagnostic');
exports.createJiwen = () => ({
 tick: async () => { console.log('threshold diagnostic'); console.info('info'); console.debug('debug'); return [{action:'contact'}]; },
 getState: async () => ({connection:0.8}),getTriggerTrace:()=>[],getStateSummary:()=>'',getPromptContext:()=>'',getStyleGuidance:()=>''
});
''')
            result=subprocess.run([NODE,str(root/'jiwen_runner.cjs')],input=json.dumps({'minutes':5,'options':{'verbose':True}}).encode(),capture_output=True,check=True)
            data=json.loads(result.stdout)
            self.assertEqual(data['triggers'],[{'action':'contact'}])
            self.assertIn(b'threshold diagnostic',result.stderr)
            self.assertIn(b'upstream loading diagnostic',result.stderr)
            self.assertNotIn(b'diagnostic',result.stdout)
