# Optional private VPS administration MCP

This component provides real Bash administration, including sudo if the selected
Unix account already has it. It is not a sandbox or a UI-only editor. Enable it
only for the owner of a trusted single-household installation. It does not change
sudo policy, SSH access, persona text, or the main application's routes.

Deploy `server.py` as a separate service under the existing administration user,
using one Gunicorn worker with threads and a listener on loopback only. Do not
publish it through a public reverse proxy or container port. The server requires
Flask and a host with systemd and an already authorized sudo account.

Private environment variables (never commit actual values):

- `VPS_ADMIN_TOKEN_FILE`: file containing an independently generated random token.
- `VPS_ADMIN_STATE`: private directory for the task SQLite ledger and capped output.
- `VPS_ADMIN_UNIX_USER`: existing authorized Unix administration account.
- `VPS_ADMIN_DEFAULT_CWD`: existing absolute default working directory.

The Gunicorn factory is `server:from_environment()`. Set a private umask and use
exactly one worker: the execution slot is intentionally process-local. Authenticate
Morrow's MCP entry with the same private token; do not send the token to the model.
The endpoint is `/mcp`, implementing the stateless JSON response form of MCP
Streamable HTTP, compatible with Morrow's existing client.

Tools:

- `vps_run_command`: starts a persistent task and returns its ID immediately.
- `vps_task_status`: reads the real state, exit code and last 16 KB of output.
- `vps_cancel_task`: requests a stop; does not undo completed side effects.

Use a stable `request_id` when retrying a lost response. Changing the command,
working directory or timeout under the same request ID is rejected. There is one
active task at a time; maximum duration is 900 seconds. Logs retain at most 1 MiB
per task. Task files can contain private output; keep them out of Git and backups
shared with third parties. A cancelled or interrupted command is not a rollback.

Production jobs use separate transient systemd services with the selected user,
512 MiB memory/one CPU limits, a runtime limit and control-group cancellation.
On administration-server restart, unfinished recorded jobs are stopped and marked
interrupted, never silently rerun. A command that deliberately launches an
independent service or daemon can outlive its task; inspect the actual server
before retrying an interrupted change. Regular Morrow/Serein services are not
restarted by merely installing or registering this component.

Browser-origin requests are rejected, including on loopback. All endpoints require
a private bearer token. The tools still confer the configured account's full host
privileges: a malicious or mistaken model instruction can damage files or other
services. Model tool access should not be treated as human supervision. Do not
expose this server to untrusted users, plugins or remote MCP clients.

To revoke: disable this MCP entry in Morrow, stop/disable its dedicated service,
and rotate or remove its private token. This cannot undo commands already run.
Do not use task commands to print keys or private conversation content.

Verification: `python -m unittest discover -s tests -p test_vps_admin.py`.
The execution fixtures run only in temporary directories on Linux and use no
real credentials, external APIs, production databases or systemd jobs. A separate
read-only deployed smoke check is required for the actual systemd job integration.
