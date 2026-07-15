export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(level: LogLevel = "info"): Logger {
  const threshold = LEVEL_ORDER[level];

  function log(lvl: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LEVEL_ORDER[lvl] < threshold) return;
    const entry = {
      level: lvl,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  return {
    debug: (msg, meta) => log("debug", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    error: (msg, meta) => log("error", msg, meta),
  };
}
