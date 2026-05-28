import { env } from "@/lib/env";

/**
 * Shows when one or more backend subsystems are unconfigured. Hidden
 * once everything is wired (production). Server component — reads env
 * at request time. Lives at the very top of the document.
 */
export function DemoBanner() {
  const missing: string[] = [];
  if (!env.clerk.enabled) missing.push("auth");
  if (!env.db.enabled) missing.push("db");
  if (!env.s3.enabled) missing.push("uploads");
  if (!env.openai.enabled) missing.push("ai");
  if (!env.stripe.enabled && !env.paymongo.enabled) missing.push("billing");
  if (!env.admin.enabled) missing.push("admin");
  if (!env.email.enabled) missing.push("email");

  if (missing.length === 0) return null;

  return (
    <div className="relative z-[60] border-b border-signal-amber/30 bg-signal-amber/[0.04]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber sm:px-6">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-amber" />
        <span>Demo mode</span>
        <span className="text-void-700">
          unwired: {missing.map((m) => `[${m}]`).join(" ")}
        </span>
        <span className="ml-auto hidden text-void-700 sm:inline">
          set env vars in <span className="text-signal-cyan">.env.example</span> to graduate
        </span>
      </div>
    </div>
  );
}
