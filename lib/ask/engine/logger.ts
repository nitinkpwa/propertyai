type LogLevel = "info" | "warn" | "error";

interface AskLogPayload {
  event: string;
  level?: LogLevel;
  [key: string]: unknown;
}

export function logAsk(payload: AskLogPayload): void {
  const { event, level = "info", ...data } = payload;
  const entry = {
    service: "areaiq-ask",
    event,
    level,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
