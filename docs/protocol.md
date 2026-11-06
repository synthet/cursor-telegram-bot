# Bridge RPC Protocol

Base URL: `http://127.0.0.1:<port>`

Auth: `Authorization: Bearer <token>` (all routes except `GET /health`)

## Endpoints

| Method | Path                           | Description           |
| ------ | ------------------------------ | --------------------- |
| GET    | `/health`                      | Safe metadata         |
| GET    | `/config/status`               | Bridge status         |
| POST   | `/pairing/create`              | Generate pairing code |
| POST   | `/pairing/confirm`             | Confirm pairing       |
| GET    | `/sessions`                    | List sessions         |
| POST   | `/sessions`                    | Start session         |
| POST   | `/sessions/:id/message`        | Send message          |
| POST   | `/sessions/:id/stop`           | Stop session          |
| GET    | `/sessions/:id/logs`           | Session logs          |
| GET    | `/sessions/:id/diff`           | Diff summary          |
| GET    | `/approvals`                   | Pending approvals     |
| POST   | `/approvals/:id/approve`       | Approve               |
| POST   | `/approvals/:id/deny`          | Deny                  |
| POST   | `/hooks/events`                | Ingest hook event     |
| GET    | `/hooks/status`                | Hooks status          |
| GET    | `/mcp/status`                  | MCP status            |
| GET    | `/loopback/:sessionId`         | List loopback events  |
| POST   | `/loopback/:sessionId/enqueue` | Enqueue event         |
| GET    | `/events/recent`               | Audit events          |
| GET    | `/events/stream`               | SSE stream            |
