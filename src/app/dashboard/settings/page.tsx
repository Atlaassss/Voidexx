import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";

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
            {isDemo && (
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
            <Field label="API keys" value="0 / 3 in use" />
          </Panel>

          <Panel title="Notifications">
            <Toggle label="Daily AI insight email" on />
            <Toggle label="Tilt detector push" on />
            <Toggle label="Funding-rate alerts" />
            <Toggle label="Discord webhooks" />
          </Panel>

          <Panel title="Data">
            <Field label="Trades stored" value="127" />
            <Field label="Storage" value="38 / 500 MB" />
            <button className="btn-ghost mt-3">Export data</button>
            <button className="btn-ghost ml-2 mt-3 border-signal-red/60 text-signal-red hover:border-signal-red hover:text-signal-red">
              Purge account
            </button>
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

function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-void-900">{label}</span>
      <span
        className={`relative inline-block h-5 w-10 cursor-pointer border ${
          on ? "border-signal-green bg-signal-green/20" : "border-void-400 bg-void-200"
        }`}
      >
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 transition-all ${
            on ? "left-[calc(100%-14px)] bg-signal-green" : "left-1 bg-void-700"
          }`}
        />
      </span>
    </div>
  );
}
