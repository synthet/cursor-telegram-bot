# MCP Server: agent-remote-control

## Tools

- `remote.status`
- `remote.notify`
- `remote.request_approval`
- `remote.ask_user`
- `remote.checkpoint`
- `remote.report_diff`
- `remote.loopback_enqueue`

## Resources

- `agent-remote://sessions`
- `agent-remote://approvals`
- `agent-remote://events/recent`
- `agent-remote://config/status`

## Transport

Stdio (primary). Set `AGENT_REMOTE_BRIDGE_URL` and `AGENT_REMOTE_BRIDGE_TOKEN` in env — never pass secrets on the command line.

## Failure modes

If the bridge is down, tools return actionable diagnostics to start the bridge from the extension.
