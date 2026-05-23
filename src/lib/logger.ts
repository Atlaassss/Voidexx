/**
 * Structured logging utility.
 *
 * Outputs JSON lines in production (for Vercel Log Drains, Datadog, etc.)
 * and pretty-prints in development. Every log entry includes:
 *   - timestamp (ISO 8601)
 *   - level (info, warn, error, debug)
 *   - service (subsystem identifier)
 *   - message
 *   - optional structured context
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   const log = logger("autopsy");
 *   log.info("Pipeline started", { uploadId, userId });
 *   log.error("Vision call failed", { error: err.message, costMicros });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const LOG_LEVEL = (process.env.LOG_LEVEL ?? (IS_PRODUCTION ? "info" : "debug")) as LogLevel;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_LEVEL];
}

function emit(entry: LogEntry): void {
  if (IS_PRODUCTION) {
    // JSON line — parseable by Vercel Log Drains, Datadog, Grafana, etc.
    const line = JSON.stringify(entry);
    if (entry.level === "error") {
      console.error(line);
    } else if (entry.level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  } else {
    // Dev: human-readable with color
    const color = {
      debug: "\x1b[90m", // gray
      info: "\x1b[36m",  // cyan
      warn: "\x1b[33m",  // yellow
      error: "\x1b[31m", // red
    }[entry.level];
    const reset = "\x1b[0m";
    const { timestamp, level, service, message, ...ctx } = entry;
    const ctxStr = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : "";
    console.log(
      `${color}[${level.toUpperCase()}]${reset} [${service}] ${message}${ctxStr}`,
    );
  }
}

export interface Logger {
  debug(message: string, ctx?: Record<string, unknown>): void;
  info(message: string, ctx?: Record<string, unknown>): void;
  warn(message: string, ctx?: Record<string, unknown>): void;
  error(message: string, ctx?: Record<string, unknown>): void;
}

export function logger(service: string): Logger {
  const log = (level: LogLevel, message: string, ctx?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    emit({
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...ctx,
    });
  };

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, ctx) => log("error", msg, ctx),
  };
}
