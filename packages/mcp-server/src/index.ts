#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  MCP_PROMPT_NAMES,
  MCP_RESOURCE_URIS,
  MCP_SERVER_NAME,
  MCP_TOOL_NAMES,
  RemoteAskUserInputSchema,
  RemoteCheckpointInputSchema,
  RemoteLoopbackEnqueueInputSchema,
  RemoteNotifyInputSchema,
  RemoteReportDiffInputSchema,
  RemoteRequestApprovalInputSchema,
} from "@agent-remote/shared";
import { McpBridgeClient } from "./bridge-client.js";
const bridgeUrl = process.env.AGENT_REMOTE_BRIDGE_URL ?? "http://127.0.0.1:3847";
const bridgeToken = process.env.AGENT_REMOTE_BRIDGE_TOKEN ?? "";

if (!bridgeToken) {
  console.error(
    "agent-remote-mcp: AGENT_REMOTE_BRIDGE_TOKEN not set. Start the bridge from the VS Code extension first.",
  );
  process.exit(1);
}

function getBridge(): McpBridgeClient {
  return new McpBridgeClient(bridgeUrl, bridgeToken);
}

const server = new Server(
  { name: MCP_SERVER_NAME, version: "0.1.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: MCP_TOOL_NAMES.status,
      description: "Returns bridge and session status",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: MCP_TOOL_NAMES.notify,
      description: "Send notification to paired Telegram chat",
      inputSchema: {
        type: "object",
        properties: {
          level: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    {
      name: MCP_TOOL_NAMES.requestApproval,
      description: "Request Telegram user approval for an action",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" }, summary: { type: "string" } },
      },
    },
    {
      name: MCP_TOOL_NAMES.askUser,
      description: "Ask the Telegram user a question and wait for reply",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" }, question: { type: "string" } },
      },
    },
    {
      name: MCP_TOOL_NAMES.checkpoint,
      description: "Register a named checkpoint",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" }, title: { type: "string" } },
      },
    },
    {
      name: MCP_TOOL_NAMES.reportDiff,
      description: "Report diff summary to Telegram",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" }, files: { type: "array" } },
      },
    },
    {
      name: MCP_TOOL_NAMES.loopbackEnqueue,
      description: "Queue a loopback event for a session",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" }, kind: { type: "string" } },
      },
    },
  ],
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: MCP_RESOURCE_URIS.sessions, name: "sessions", mimeType: "application/json" },
    { uri: MCP_RESOURCE_URIS.approvals, name: "approvals", mimeType: "application/json" },
    { uri: MCP_RESOURCE_URIS.eventsRecent, name: "recent-events", mimeType: "application/json" },
    { uri: MCP_RESOURCE_URIS.configStatus, name: "config-status", mimeType: "application/json" },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const bridge = getBridge();
  let text = "{}";
  if (req.params.uri === MCP_RESOURCE_URIS.sessions) {
    const data = await bridge.listSessions();
    text = JSON.stringify(data.sessions, null, 2);
  } else if (req.params.uri === MCP_RESOURCE_URIS.approvals) {
    const data = await bridge.listApprovals();
    text = JSON.stringify(data.approvals, null, 2);
  } else if (req.params.uri === MCP_RESOURCE_URIS.eventsRecent) {
    const data = await bridge.recentEvents();
    text = JSON.stringify(data.events, null, 2);
  } else if (req.params.uri === MCP_RESOURCE_URIS.configStatus) {
    const data = await bridge.getStatus();
    text = JSON.stringify(data, null, 2);
  }
  return { contents: [{ uri: req.params.uri, mimeType: "application/json", text }] };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: MCP_PROMPT_NAMES.map((name) => ({
    name,
    description: `Agent remote prompt: ${name}`,
  })),
}));

server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const templates: Record<string, string> = {
    "remote-safe-plan": "Plan changes with explicit approval for risky operations.",
    "remote-approval-required": "This action requires Telegram user approval before proceeding.",
    "remote-session-summary": "Summarize the current agent session for the remote user.",
    "remote-diff-summary": "Summarize file changes in plain language for Telegram.",
  };
  return {
    messages: [
      {
        role: "user",
        content: { type: "text", text: templates[req.params.name] ?? "Agent remote prompt" },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const bridge = getBridge();
  const name = req.params.name;
  const args = req.params.arguments ?? {};

  try {
    if (name === MCP_TOOL_NAMES.status) {
      const s = await bridge.getStatus();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              bridgeRunning: s.bridgeRunning,
              telegramPaired: s.telegramPaired,
              pendingApprovals: s.pendingApprovals,
            }),
          },
        ],
      };
    }

    if (name === MCP_TOOL_NAMES.notify) {
      const input = RemoteNotifyInputSchema.parse(args);
      await bridge.notify(input);
      return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
    }

    if (name === MCP_TOOL_NAMES.requestApproval) {
      const input = RemoteRequestApprovalInputSchema.parse(args);
      const { approvalId } = await bridge.requestApproval(input);
      const result = await bridge.waitApproval(approvalId, input.timeoutMs ?? 300_000);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              approvalId,
              decision: result.decision,
              decidedAt: result.decidedAt,
            }),
          },
        ],
      };
    }

    if (name === MCP_TOOL_NAMES.askUser) {
      const input = RemoteAskUserInputSchema.parse(args);
      // Bridge blocks until the user replies or the timeout fires; no separate wait call needed.
      const result = await bridge.askUser({
        ...input,
        correlationId: `ask_${Date.now()}`,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }

    if (name === MCP_TOOL_NAMES.checkpoint) {
      const input = RemoteCheckpointInputSchema.parse(args);
      const checkpointId = `cp_${Date.now()}`;
      await bridge.enqueueLoopback({
        sessionId: input.sessionId,
        source: "agent",
        kind: "checkpoint",
        payload: { title: input.title, summary: input.summary, checkpointId },
      });
      return { content: [{ type: "text", text: JSON.stringify({ checkpointId }) }] };
    }

    if (name === MCP_TOOL_NAMES.reportDiff) {
      const input = RemoteReportDiffInputSchema.parse(args);
      await bridge.enqueueLoopback({
        sessionId: input.sessionId,
        source: "agent",
        kind: "diff_report",
        payload: input,
      });
      return { content: [{ type: "text", text: JSON.stringify({ accepted: true }) }] };
    }

    if (name === MCP_TOOL_NAMES.loopbackEnqueue) {
      const input = RemoteLoopbackEnqueueInputSchema.parse(args);
      const result = await bridge.enqueueLoopback(input);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
