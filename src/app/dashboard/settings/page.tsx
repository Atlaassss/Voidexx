import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { previewMode } from "@/lib/preview";
import { SettingsToggles } from "./SettingsToggles";
import { SettingsActions } from "./SettingsActions";

export default async function SettingsPage() {
  const user = await getSessionUser();
  const isDemo = user?.isDemo ?? true;

  return (
    <>
      <Topbar title="Settings" sub="account · security · preferences" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Profile">
            <Field label="Display name" value={user?.displayName ?? "—"} />
            <Field label="Username" value={user?.username ?? "—"} />
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Time zone" value="UTC+08:00 · Asia/Manila" />
            <Field label="Default symbol" value="BTC / USDT" />
            {isDemo && !previewMode && (
              <div className="mt-4 border border-signal-amber/40 bg-signal-amber/[0.06] p-3 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
                Demo session · profile is shared & read-only
              </div>
            )}
          </Panel>

          <Panel title="Security">
            <Field
              label="Auth provider"
              value={env.clerk.enabled ? "Clerk · live" : "Demo (none)"}
              tone={env.clerk.enabled ? "green" : undefined}
            />
            <Field
              label="2FA"
              value={env.clerk.enabled ? "Manage in profile" : "—"}
              tone={env.clerk.enabled ? "green" : undefined}
            />
            <Field
              label="Database"
              value={env.db.enabled ? "Connected" : "Demo (no persistence)"}
              tone={env.db.enabled ? "green" : undefined}
            />
            <Field
              label="Storage"
              value={env.s3.enabled ? "Connected" : "Demo (local blobs)"}
              tone={env.s3.enabled ? "green" : undefined}
            />
            <Field
              label="AI engine"
              value={env.openai.enabled ? "OpenAI · gpt-4o" : "Mock pipeline"}
              tone={env.openai.enabled ? "green" : undefined}
            />
            <Field
              label="Billing"
              value={billingStatusValue(env.stripe.enabled, env.paymongo.enabled)}
              tone={env.stripe.enabled || env.paymongo.enabled ? "green" : undefined}
            />
            <Field
              label="Exchange"
              value={env.exchange.enabled ? "Encrypted · ready" : "Demo (no encryption key)"}
              tone={env.exchange.enabled ? "green" : undefined}
            />
            <Field label="API keys" value="0 / 3 in use" />
          </Panel>

          <Panel title="Notifications">
            <SettingsToggles />
          </Panel>

          <Panel title="Data">
            <Field label="Trades stored" value="127" />
            <Field label="Storage" value="38 / 500 MB" />
            <SettingsActions
              isDemo={isDemo}
              user={
                user
                  ? {
                      id: user.id,
                      displayName: user.displayName,
                      username: user.username,
                      email: user.email,
                    }
                  : null
              }
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-void-300/60 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">{label}</span>
      <span
        className={`max-w-[60%] truncate font-mono text-[12px] ${
          tone === "green" ? "text-signal-green" : "text-void-900"
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Compose the billing-rail status string. Both rails CAN be live in
 * parallel (USD via Stripe, PHP via PayMongo). We surface whichever
 * is configured — and "Demo (no checkout)" only when both are off.
 */
function billingStatusValue(stripe: boolean, paymongo: boolean): string {
  if (stripe && paymongo) return "Stripe + PayMongo · live";
  if (stripe) return "Stripe · live";
  if (paymongo) return "PayMongo · live (PH)";
  return "Demo (no checkout)";
}
