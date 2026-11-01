"""Single-shot compatible analyzer, optionally kept warm by the upload server."""
import os, sys, json, subprocess, time
from pathlib import Path
root = Path(sys.argv[1])
persistent = sys.argv[2] == '--persistent'
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HOME']=str(root/'models')
os.environ['PATH']=str(root/'.venv'/'Scripts')+os.pathsep+os.environ.get('PATH','')
sys.path.insert(0,str(root))
protocol=sys.stdout
if persistent: sys.stdout=sys.stderr
import imageio_ffmpeg
import soundfile as sf
import numpy as np
import cochlea
from faster_whisper import WhisperModel
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
snapshots=list((root/'models'/'hub'/'models--Systran--faster-whisper-base'/'snapshots').glob('*'))
model_path=next(p for p in snapshots if (p/'model.bin').exists())
model=WhisperModel(str(model_path),device='cpu',compute_type='int8',local_files_only=True)

def analyze_job(job):
    started=time.perf_counter()
    audio=next(job.glob('upload.*'))
    wav=job/'decoded.wav'
    # Bound decoded audio even if a small compressed file describes hours of sound.
    subprocess.run([ffmpeg,'-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',str(audio),'-t','301','-ar','22050','-ac','1',str(wav)],check=True,timeout=90)
    import soundfile as sf
    if sf.info(wav).duration>300: raise ValueError('录音超过 5 分钟限制')
    import cochlea
    y,sr=cochlea.load_audio(wav)
    if len(y)<sr*.1: raise ValueError('录音过短')
    info=cochlea.analyze(y,sr)
    cochlea.render(y,sr,info,'手机上传录音',job/'listen.png')
    (job/'summary.json').write_text(json.dumps({k:v for k,v in info.items() if not k.startswith('_')},ensure_ascii=False,indent=2),encoding='utf-8')
    segments,info=model.transcribe(str(wav),language='zh',vad_filter=True,initial_prompt='以下是普通话的日常聊天语音，可能夹杂笑声和哼唱。')
    lines=[{'start':round(s.start,2),'end':round(s.end,2),'text':s.text.strip()} for s in segments]
    (job/'transcript.json').write_text(json.dumps({'model':'base','language':info.language,'duration':round(info.duration,2),'segments':lines,'text':''.join(s['text'] for s in lines)},ensure_ascii=False,indent=2),encoding='utf-8')
    
    wav.unlink(missing_ok=True)
    return round(time.perf_counter()-started,3)

def emit(value):
    protocol.write(json.dumps(value,ensure_ascii=False)+'\n');protocol.flush()

if persistent:
    # Synthetic warmup only; no user files and no network access.
    y=(.05*np.sin(2*np.pi*180*np.arange(22050)/22050)).astype('float32')
    cochlea.analyze(y,22050)
    segments,_=model.transcribe(np.zeros(16000,dtype='float32'),language='zh',vad_filter=True)
    list(segments)
    emit({'ready':True})
    for line in sys.stdin:
        request={}
        try:
            request=json.loads(line);job=Path(request['job'])
            elapsed=analyze_job(job)
            emit({'id':request['id'],'ok':True,'elapsed':elapsed})
        except Exception:
            import traceback
            traceback.print_exc(file=sys.stderr)
            emit({'id':request.get('id') if isinstance(request,dict) else None,'ok':False})
else:
    analyze_job(Path(sys.argv[2]))
