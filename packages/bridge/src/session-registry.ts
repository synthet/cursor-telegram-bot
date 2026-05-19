import type { Session, SessionStatus, StartSessionInput } from "@agent-remote/shared";
import { generateId } from "./lib/ids.js";

export class SessionRegistry {
  private sessions = new Map<string, Session>();

  register(id: string, input: StartSessionInput, adapter: Session["adapter"]): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id,
      workspaceUri: input.workspaceUri,
      workspaceName: input.workspaceName,
      adapter,
      status: "starting",
      createdAt: now,
      updatedAt: now,
      title: input.title ?? input.prompt.slice(0, 80),
      lastMessage: input.prompt,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  create(input: StartSessionInput, adapter: Session["adapter"]): Session {
    return this.register(generateId("sess"), input, adapter);
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  updateStatus(id: string, status: SessionStatus, lastError?: string): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    session.status = status;
    session.updatedAt = new Date().toISOString();
    if (lastError) session.lastError = lastError;
    return session;
  }

  list(): Session[] {
    return [...this.sessions.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
}
