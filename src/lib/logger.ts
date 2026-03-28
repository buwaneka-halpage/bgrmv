import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "api.log");
const ROUTE_WIDTH = 26;
const LEVEL_WIDTH = 4;

function ensureDir(): void {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sanitize a value for logging.
 * - data: URLs → [~NNkB base64]
 * - raw base64 strings (very long, no spaces) → [~NNkB base64]
 * - long strings → truncated
 */
function sanitize(value: unknown): string {
  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      const bytes = Math.round((value.length * 3) / 4 / 1024);
      return `[~${bytes}kB base64]`;
    }
    // Heuristic: raw base64 > 200 chars, no spaces
    if (value.length > 200 && !/\s/.test(value)) {
      const bytes = Math.round((value.length * 3) / 4 / 1024);
      return `[~${bytes}kB base64]`;
    }
    if (value.length > 100) return `"${value.slice(0, 97)}..."`;
    return `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object" && value !== null) {
    const s = JSON.stringify(value);
    return s.length > 120 ? s.slice(0, 117) + "..." : s;
  }
  return String(value ?? "");
}

function formatKv(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${sanitize(v)}`)
    .join("  ");
}

function write(
  level: string,
  route: string,
  arrow: string,
  extra: string,
  data?: Record<string, unknown>
): void {
  const ts = new Date().toISOString();
  const lvl = level.padEnd(LEVEL_WIDTH);
  const rt = route.padEnd(ROUTE_WIDTH);
  const kv = data ? "  " + formatKv(data) : "";
  const line = `[${ts}] ${lvl} ${rt} ${arrow}${extra}${kv}\n`;
  try {
    ensureDir();
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch {
    // Never crash a route due to a logging failure
  }
}

/** Log an incoming API request */
export function logReq(route: string, data: Record<string, unknown>): void {
  write("REQ", route, "→ ", "request", data);
}

/** Log a successful API response */
export function logOk(
  route: string,
  ms: number,
  data?: Record<string, unknown>
): void {
  write("OK", route, "← ", `${ms}ms`, data);
}

/** Log a failed API response */
export function logErr(
  route: string,
  ms: number,
  error: unknown,
  data?: Record<string, unknown>
): void {
  const msg = error instanceof Error ? error.message : String(error);
  write("ERR", route, "← ", `${ms}ms  error="${msg}"`, data);
}
