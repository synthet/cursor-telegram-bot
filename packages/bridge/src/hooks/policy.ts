import type { HookEvent, HookPhase, HookPolicyMode } from "@agent-remote/shared";
import type { RiskLevel } from "@agent-remote/shared";

const DEFAULT_POLICIES: Record<HookPhase, HookPolicyMode> = {
  agent_start: "notify",
  agent_stop: "notify",
  before_shell: "approval",
  after_shell: "observe",
  before_file_edit: "approval",
  after_file_edit: "observe",
  before_tool: "observe",
  after_tool: "observe",
  before_mcp_tool: "observe",
  after_mcp_tool: "observe",
  error: "notify",
  completion: "notify",
  unknown: "observe",
};

export class HookPolicyEngine {
  constructor(private policies: Record<HookPhase, HookPolicyMode> = DEFAULT_POLICIES) {}

  getMode(phase: HookPhase): HookPolicyMode {
    return this.policies[phase] ?? "observe";
  }

  shouldRequestApproval(event: HookEvent): boolean {
    const mode = this.getMode(event.phase);
    if (mode === "approval" || mode === "block") {
      const risk = event.risk ?? "medium";
      return risk === "medium" || risk === "high" || risk === "critical";
    }
    return false;
  }

  shouldBlock(event: HookEvent): boolean {
    return this.getMode(event.phase) === "block";
  }

  classifyRisk(command?: string): RiskLevel {
    if (!command) return "low";
    const highRisk = /(rm\s+-rf|git\s+push|npm\s+install|curl|wget|deploy)/i;
    if (highRisk.test(command)) return "high";
    return "medium";
  }
}
