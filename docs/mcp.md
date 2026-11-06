# MCP Server: agent-remote-control

## Tools

- `remote_status`
- `remote_notify`
- `remote_request_approval`
- `remote_ask_user`
- `remote_checkpoint`
- `remote_report_diff`
- `remote_loopback_enqueue`

## Resources

- `agent-remote://sessions`
- `agent-remote://approvals`
- `agent-remote://events/recent`
- `agent-remote://config/status`

## Transport

Stdio (primary). Set `AGENT_REMOTE_BRIDGE_URL` and `AGENT_REMOTE_BRIDGE_TOKEN` in env — never pass secrets on the command line.

## Failure modes

If the bridge is down, tools return actionable diagnostics to start the bridge from the extension.
