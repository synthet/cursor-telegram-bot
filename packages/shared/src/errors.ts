export class AgentRemoteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AgentRemoteError";
  }
}

export class BridgeError extends AgentRemoteError {
  constructor(message: string, code = "BRIDGE_ERROR", statusCode = 500) {
    super(message, code, statusCode);
    this.name = "BridgeError";
  }
}

export class TelegramError extends AgentRemoteError {
  constructor(message: string, code = "TELEGRAM_ERROR", statusCode = 502) {
    super(message, code, statusCode);
    this.name = "TelegramError";
  }
}

export class AuthError extends AgentRemoteError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, code, 401);
    this.name = "AuthError";
  }
}
