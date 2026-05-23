import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Prisma } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Coerce any value into a Prisma-safe JSON value.
 *
 * Deep-clones via JSON round-trip, which:
 *   - Strips `undefined`, functions, Symbols (would crash Prisma's JSON column).
 *   - Converts Date → ISO string (prevents Prisma's "Date is not a valid JSON" error).
 *   - Validates the value is actually JSON-serializable (throws on cycles).
 *
 * Use this whenever writing to a Prisma `Json` field. Direct casts
 * with `as unknown as Record<string, unknown>` or `as object` skip
 * the validation and let bad data through to runtime, which then
 * surfaces as a generic Prisma error in production.
 */
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
