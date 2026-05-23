"use client";

import { useState, useEffect } from "react";
import { Panel } from "@/components/dash/Panel";
import {
  Users,
  DollarSign,
  Brain,
  ScrollText,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalAutopsies: number;
  recentAutopsies: number;
  totalRevenueCents: number;
  aiCostMicros: number;
  demo?: boolean;
}

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
  freeUsageMonth: number;
  createdAt: string;
}

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

export function AdminClient() {
  const [stats, setStats] = useState<LoadState<AdminStats>>({ kind: "loading" });
  const [users, setUsers] = useState<LoadState<UserRow[]>>({ kind: "loading" });
  const [auditLogs, setAuditLogs] = useState<LoadState<AuditEntry[]>>({ kind: "loading" });
  const [tab, setTab] = useState<"overview" | "users" | "audit">("overview");

  useEffect(() => {
    loadJson<AdminStats>("/api/admin/stats")
      .then((data) => setStats({ kind: "ok", data }))
      .catch((err: Error) => setStats({ kind: "error", message: err.message }));

    loadJson<{ users?: UserRow[] }>("/api/admin/users?limit=10")
      .then((d) => setUsers({ kind: "ok", data: d.users ?? [] }))
      .catch((err: Error) => setUsers({ kind: "error", message: err.message }));

    loadJson<{ logs?: AuditEntry[] }>("/api/admin/audit?limit=10")
      .then((d) => setAuditLogs({ kind: "ok", data: d.logs ?? [] }))
      .catch((err: Error) => setAuditLogs({ kind: "error", message: err.message }));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mb-6 flex gap-1 border-b border-void-300/70">
        {(["overview", "users", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest2 transition-colors ${
              tab === t
                ? "border-b-2 border-signal-cyan text-signal-cyan"
                : "text-void-700 hover:text-void-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab state={stats} />}
      {tab === "users" && <UsersTab state={users} />}
      {tab === "audit" && <AuditTab state={auditLogs} />}
    </div>
  );
}

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="border border-signal-red/40 bg-signal-red/[0.06] p-4 font-mono text-[11px] text-signal-red">
      <AlertTriangle className="mr-2 inline h-3 w-3" />
      Failed to load: {message}
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="ml-3 underline hover:text-signal-amber"
        >
          retry
        </button>
      )}
    </div>
  );
}

function OverviewTab({ state }: { state: LoadState<AdminStats> }) {
  if (state.kind === "loading") {
    return <div className="font-mono text-sm text-void-700">Loading stats...</div>;
  }
  if (state.kind === "error") {
    return <ErrorPanel message={state.message} />;
  }
  const stats = state.data;

  const cards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-signal-cyan" },
    { label: "Active Subs", value: stats.activeSubscriptions.toLocaleString(), icon: TrendingUp, color: "text-signal-green" },
    { label: "Total Autopsies", value: stats.totalAutopsies.toLocaleString(), icon: Brain, color: "text-signal-violet" },
    { label: "Last 30d", value: stats.recentAutopsies.toLocaleString(), icon: Activity, color: "text-signal-amber" },
    { label: "Revenue", value: `$${(stats.totalRevenueCents / 100).toLocaleString()}`, icon: DollarSign, color: "text-signal-green" },
    { label: "AI Cost", value: `$${(stats.aiCostMicros / 1_000_000).toFixed(2)}`, icon: AlertTriangle, color: "text-signal-red" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="cell brackets p-4">
            <span className="b1" />
            <span className="b2" />
            <div className="flex items-center gap-3">
              <c.icon className={`h-7 w-7 ${c.color}`} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  {c.label}
                </div>
                <div className="font-display text-2xl tracking-wide text-void-900">{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {stats.demo && (
        <div className="border border-signal-amber/40 bg-signal-amber/[0.06] p-3 font-mono text-[11px] text-signal-amber">
          <AlertTriangle className="mr-2 inline h-3 w-3" />
          Demo mode — these are mock stats. Set DATABASE_URL to read real data.
        </div>
      )}
    </div>
  );
}

function UsersTab({ state }: { state: LoadState<UserRow[]> }) {
  if (state.kind === "loading") {
    return <div className="font-mono text-sm text-void-700">Loading users...</div>;
  }
  if (state.kind === "error") {
    return <ErrorPanel message={state.message} />;
  }
  const users = state.data;

  if (users.length === 0) {
    return <div className="font-mono text-sm text-void-700">No users loaded.</div>;
  }

  return (
    <Panel title="Users" meta={`${users.length} loaded`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-void-300/70 text-left uppercase tracking-widest2 text-void-700">
              <th className="px-3 py-2 font-normal">User</th>
              <th className="px-3 py-2 font-normal">Role</th>
              <th className="px-3 py-2 font-normal">Plan</th>
              <th className="px-3 py-2 font-normal">Status</th>
              <th className="px-3 py-2 font-normal">Usage</th>
              <th className="px-3 py-2 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-void-300/40 hover:bg-void-100/40">
                <td className="px-3 py-2">
                  <div className="text-void-900">{u.displayName ?? u.username ?? "—"}</div>
                  <div className="text-void-700">{u.email}</div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest2 ${
                      u.role === "ADMIN"
                        ? "bg-signal-red/[0.12] text-signal-red"
                        : u.role === "SUPPORT"
                          ? "bg-signal-amber/[0.12] text-signal-amber"
                          : "bg-void-200 text-void-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-void-800">{u.plan}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      u.subscriptionStatus === "active"
                        ? "text-signal-green"
                        : u.subscriptionStatus === "past_due"
                          ? "text-signal-amber"
                          : "text-void-700"
                    }
                  >
                    {u.subscriptionStatus ?? "free"}
                  </span>
                </td>
                <td className="px-3 py-2 text-void-700">{u.freeUsageMonth}/5</td>
                <td className="px-3 py-2 text-void-700">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AuditTab({ state }: { state: LoadState<AuditEntry[]> }) {
  if (state.kind === "loading") {
    return <div className="font-mono text-sm text-void-700">Loading audit log...</div>;
  }
  if (state.kind === "error") {
    return <ErrorPanel message={state.message} />;
  }
  const logs = state.data;

  if (logs.length === 0) {
    return <div className="font-mono text-sm text-void-700">No audit entries.</div>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="cell flex items-start gap-3 p-3">
          <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-signal-violet" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[11px] font-bold text-signal-cyan">
                {log.action}
              </span>
              <span className="font-mono text-[10px] text-void-700">
                by {log.actorId}
              </span>
            </div>
            {log.targetType && (
              <div className="mt-0.5 font-mono text-[10px] text-void-700">
                target: {log.targetType}/{log.targetId}
              </div>
            )}
            {log.meta && (
              <pre className="mt-1 max-h-20 overflow-hidden whitespace-pre-wrap font-mono text-[10px] text-void-700">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            )}
          </div>
          <div className="shrink-0 font-mono text-[10px] text-void-700">
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
