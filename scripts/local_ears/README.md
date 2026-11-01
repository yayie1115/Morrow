# Local audio worker

Optional Windows-side worker for an existing authenticated audio-upload service.
It reuses the installed `mubai-ears` cochlea module and local faster-whisper base model; no model is downloaded.

`PersistentAnalyzer(root, base).analyze(job)` expects a job directory containing `upload.<extension>`.
Outputs remain `transcript.json`, `summary.json` and `listen.png`. Keep one supervisor and serialize jobs.
Use `start()` at service startup to prewarm; use `close()` on orderly shutdown. Failed or timed-out workers are replaced on retry.
Preserve the existing HTTP authentication, upload limits and original data when integrating this worker.

The web backend reads `EARS_KEY_FILE` (default `/etc/morrow/ears-access-key`) and connects only to loopback `EARS_LOCAL_PORT` (default 18765).
An authenticated private tunnel must forward that port to the local upload service. Do not publish the upload port or put credentials in the browser.
Windows must be online and logged in. No GPU acceleration is enabled by this change.
