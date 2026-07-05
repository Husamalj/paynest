type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function cleanFields(fields: LogFields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return { message: String(error) };
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...cleanFields(fields),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logError(event: string, error: unknown, fields: LogFields = {}) {
  logEvent("error", event, {
    ...fields,
    error: serializeError(error),
  });
}
