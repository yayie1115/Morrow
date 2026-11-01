import io,json,os,sqlite3,unittest,uuid
from unittest import mock
import app,chat_engine,incoming_voice
import test_app_smoke as fixtures

class IncomingVoiceTests(unittest.TestCase):
    setUp=fixtures.AppSmokeTest.setUp
    tearDown=fixtures.AppSmokeTest.tearDown
    def client(self):
        c=app.app.test_client();c.post('/api/login',json={'password':app.AUTH_PASSWORD})
        with app.app.app_context():
            db=app.get_db();sid=db.execute("INSERT INTO sessions(title) VALUES ('Synthetic voice')").lastrowid;db.commit()
        return c,sid
    def upload(self,c,sid,key=None,body=b'RIFF synthetic audio'):
        with mock.patch('incoming_voice.configured',return_value=True),mock.patch('incoming_voice.schedule',return_value=True):
            return c.post('/api/chat/voice-input',data={'session_id':str(sid),'request_id':key or str(uuid.uuid4()),'audio':(io.BytesIO(body),'recording.wav')})
    def test_auth_scope_and_upload_idempotence(self):
        self.assertEqual(app.app.test_client().get('/api/chat/voice-input').status_code,401)
        c,sid=self.client();key=str(uuid.uuid4());a=self.upload(c,sid,key);self.assertEqual(a.status_code,202)
        aid=a.get_json()['id'];self.assertEqual(self.upload(c,sid,key).get_json()['id'],aid)
        self.assertEqual(self.upload(c,sid,key,b'different').status_code,409)
        self.assertEqual(c.get(f'/api/chat/voice-input/{aid}?session_id={sid+1}').status_code,404)
        self.assertEqual(c.post(f'/api/chat/voice-input/{aid}/retry',json={'session_id':sid+1}).status_code,404)
    def test_only_verified_analysis_can_send_and_retries_cannot_duplicate(self):
        c,sid=self.client();aid=self.upload(c,sid).get_json()['id']
        self.assertEqual(c.post('/api/chat/send',json={'session_id':sid,'voice_input_id':aid}).status_code,409)
        with app.app.app_context():
            db=app.get_db();db.execute("UPDATE message_artifacts SET status='ready',visible_text='合成语音',meta=? WHERE id=?",(json.dumps({'summary':{'pitch':{'mean':180}},'duration':3,'chart_path':'synthetic.png'}),aid));db.commit()
        with mock.patch('app._live_sse_response',return_value=app.Response('{}',mimetype='application/json')),mock.patch('app._queue_image_descriptions'):
            self.assertEqual(c.post('/api/chat/send',json={'session_id':sid,'voice_input_id':aid}).status_code,200)
            self.assertEqual(c.post('/api/chat/send',json={'session_id':sid,'voice_input_id':aid}).status_code,409)
        with app.app.app_context():
            db=app.get_db();row=db.execute("SELECT * FROM messages WHERE session_id=?",(sid,)).fetchone()
            self.assertEqual(db.execute('SELECT count(*) FROM messages WHERE session_id=?',(sid,)).fetchone()[0],1)
            self.assertEqual(row['content'],'合成语音');self.assertEqual(json.loads(row['attachments'])[0]['type'],'voice_input')
            self.assertEqual(db.execute('SELECT message_id FROM message_artifacts WHERE id=?',(aid,)).fetchone()[0],row['id'])
    def test_disabled_upload_does_not_create_message(self):
        c,sid=self.client()
        with mock.patch('incoming_voice.configured',return_value=False):
            self.assertEqual(c.post('/api/chat/voice-input',data={}).status_code,503)
        with app.app.app_context():self.assertEqual(app.get_db().execute('SELECT count(*) FROM messages').fetchone()[0],0)
    def test_voice_measurements_are_not_claimed_as_emotion(self):
        value=chat_engine._message_content('合成文字',[{'type':'voice_input','summary':{'pitch':{'mean':180}}}],include_images=False)
        self.assertIn('合成文字',value);self.assertIn('不是确定情绪的证据',value);self.assertIn('180',value)
        self.assertNotIn('data:image',value)
    def test_failed_remote_task_can_retry_with_a_new_task(self):
        import time
        c,sid=self.client();aid=self.upload(c,sid).get_json()['id'];remote='a'*32
        with app.app.app_context():
            db=app.get_db();db.execute('UPDATE message_artifacts SET meta=? WHERE id=?',(json.dumps({'remote_id':remote}),aid));db.commit()
        def wait_done():
            for _ in range(400):
                if aid not in incoming_voice._running:return
                time.sleep(.01)
            self.fail('worker did not finish')
        http=mock.MagicMock();http.__enter__.return_value=http
        http.get.return_value.json.return_value={'id':remote,'status':'failed'}
        with mock.patch('incoming_voice.connection',return_value=(http,'http://127.0.0.1:18765')):
            self.assertTrue(incoming_voice.schedule(app.DB_PATH,app.UPLOAD_DIR,aid));wait_done()
        with app.app.app_context():
            row=app.get_db().execute('SELECT status,meta FROM message_artifacts WHERE id=?',(aid,)).fetchone()
            self.assertEqual(row['status'],'failed');self.assertNotIn('remote_id',json.loads(row['meta']))
        remote='b'*32;http=mock.MagicMock();http.__enter__.return_value=http
        http.post.return_value.json.return_value={'id':remote}
        complete=mock.Mock();complete.json.return_value={'id':remote,'status':'complete','transcript':{'text':'合成转写'},'summary':{'duration_sec':2,'pitch':{}}}
        chart=mock.Mock();chart.content=b'\x89PNG\r\n\x1a\n'+b'synthetic'
        http.get.side_effect=[complete,chart]
        with mock.patch('incoming_voice.connection',return_value=(http,'http://127.0.0.1:18765')):
            self.assertTrue(incoming_voice.schedule(app.DB_PATH,app.UPLOAD_DIR,aid));wait_done()
        with app.app.app_context():
            row=app.get_db().execute('SELECT status,visible_text FROM message_artifacts WHERE id=?',(aid,)).fetchone()
            self.assertEqual(tuple(row),('ready','合成转写'))
        self.assertEqual(http.post.call_count,1)

    def test_cancel_before_upload_and_after_saved_message(self):
        c,sid=self.client();token=str(uuid.uuid4());body={'session_id':sid,'request_id':token}
        self.assertEqual(app.app.test_client().post('/api/chat/voice-input/cancel',json=body).status_code,401)
        self.assertEqual(c.post('/api/chat/voice-input/cancel',json=body).status_code,200)
        self.assertEqual(c.post('/api/chat/voice-input/cancel',json=body).status_code,200)
        self.assertEqual(self.upload(c,sid,token).status_code,410)
        self.assertEqual(c.get(f'/api/chat/voice-input?session_id={sid}').get_json()['items'],[])
        with app.app.app_context():aid=app.get_db().execute("SELECT id FROM message_artifacts WHERE run_id=?",(token,)).fetchone()[0]
        self.assertEqual(c.post(f'/api/chat/voice-input/{aid}/retry',json={'session_id':sid}).status_code,410)
        self.assertEqual(c.post('/api/chat/send',json={'session_id':sid,'voice_input_id':aid}).status_code,409)
        with app.app.app_context():
            db=app.get_db();mid=db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,'user','synthetic saved')",(sid,)).lastrowid
            db.execute("UPDATE message_artifacts SET status='ready',message_id=? WHERE id=?",(mid,aid));db.commit()
        result=c.post('/api/chat/voice-input/cancel',json=body)
        self.assertEqual(result.status_code,409);self.assertEqual(result.get_json()['message_id'],mid)
        with app.app.app_context():self.assertEqual(app.get_db().execute('SELECT count(*) FROM messages WHERE id=?',(mid,)).fetchone()[0],1)

    def test_cancel_during_analysis_prevents_late_commit(self):
        import threading,time
        c,sid=self.client();token=str(uuid.uuid4());aid=self.upload(c,sid,token).get_json()['id'];entered=threading.Event();release=threading.Event();remote='c'*32
        http=mock.MagicMock();http.__enter__.return_value=http;http.post.return_value.json.return_value={'id':remote}
        def response(url,**kwargs):
            value=mock.Mock()
            if url.endswith('/listen.png'):value.content=b'\x89PNG\r\n\x1a\nsynthetic';return value
            entered.set();release.wait(3)
            value.json.return_value={'id':remote,'status':'complete','transcript':{'text':'synthetic transcript'},'summary':{'duration_sec':2}}
            return value
        http.get.side_effect=response
        with mock.patch('incoming_voice.connection',return_value=(http,'http://127.0.0.1:18765')):
            incoming_voice.schedule(app.DB_PATH,app.UPLOAD_DIR,aid)
            try:
                self.assertTrue(entered.wait(3))
                self.assertEqual(c.post('/api/chat/voice-input/cancel',json={'session_id':sid,'request_id':token}).status_code,200)
            finally:release.set()
            for _ in range(400):
                if aid not in incoming_voice._running:break
                time.sleep(.01)
        self.assertNotIn(aid,incoming_voice._running)
        with app.app.app_context():
            row=app.get_db().execute('SELECT status,visible_text,message_id FROM message_artifacts WHERE id=?',(aid,)).fetchone()
            self.assertEqual(tuple(row),('cancelled','',None))

    def test_hold_to_talk_waits_for_ready_and_stops_tracks(self):
        from pathlib import Path
        code=Path('static/chat-voice-input.js').read_text(encoding='utf-8')
        self.assertIn('getTracks().forEach(t=>t.stop())',code)
        self.assertIn("t.job?.status!=='ready'",code)
        self.assertIn('requestId:crypto.randomUUID()',code)
        self.assertNotIn('get_latest_voice',code)
        self.assertIn("hold.addEventListener('pointerdown'",code)
        self.assertIn('c.startY-event.clientY>65',code)
        self.assertIn("value.status==='cancelled'||t.cancelled",code)

if __name__=='__main__':unittest.main()
