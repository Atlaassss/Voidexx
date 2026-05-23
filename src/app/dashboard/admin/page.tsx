"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dash/Topbar";
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

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "audit">("overview");

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/admin/users?limit=10").then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => {});
    fetch("/api/admin/audit?limit=10").then((r) => r.json()).then((d) => setAuditLogs(d.logs ?? [])).catch(() => {});
  }, []);

  return (
    <>
      <Topbar title="Admin Panel" />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 border-b border-void-800">
          {(["overview", "users", "audit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                tab === t
                  ? "border-b-2 border-signal-cyan text-signal-cyan"
                  : "text-void-500 hover:text-void-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab stats={stats} />}
        {tab === "users" && <UsersTab users={users} />}
        {tab === "audit" && <AuditTab logs={auditLogs} />}
      </div>
    </>
  );
}

function OverviewTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return <div className="text-void-500 font-mono text-sm">Loading stats...</div>;
  }

  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-signal-cyan",
    },
    {
      label: "Active Subs",
      value: stats.activeSubscriptions.toLocaleString(),
      icon: TrendingUp,
      color: "text-signal-green",
    },
    {
      label: "Total Autopsies",
      value: stats.totalAutopsies.toLocaleString(),
      icon: Brain,
      color: "text-signal-violet",
    },
    {
      label: "Last 30d Autopsies",
      value: stats.recentAutopsies.toLocaleString(),
      icon: Activity,
      color: "text-signal-amber",
    },
    {
      label: "Revenue",
      value: `$${(stats.totalRevenueCents / 100).toLocaleString()}`,
      icon: DollarSign,
      color: "text-signal-green",
    },
    {
      label: "AI Cost",
      value: `$${(stats.aiCostMicros / 1_000_000).toFixed(2)}`,
      icon: AlertTriangle,
      color: "text-signal-red",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Panel key={c.label} title={c.label} className="flex items-center gap-4 p-4" bracketed={false}>
          <c.icon className={`h-8 w-8 ${c.color}`} />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-void-500">
              {c.label}
            </div>
            <div className="font-heading text-2xl text-void-100">{c.value}</div>
          </div>
        </Panel>
      ))}
      {stats.demo && (
        <div className="col-span-full mt-4 rounded border border-signal-amber/30 bg-signal-amber/5 p-3 font-mono text-xs text-signal-amber">
          <AlertTriangle className="mr-2 inline h-3.5 w-3.5" />
          Demo mode — these are mock stats. Connect DATABASE_URL to see real data.
        </div>
      )}
    </div>
  );
}

function UsersTab({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return <div className="text-void-500 font-mono text-sm">No users loaded.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-void-800 text-left text-void-500 uppercase tracking-widest">
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Plan</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Usage</th>
            <th className="px-3 py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-void-900 hover:bg-void-950/50">
              <td className="px-3 py-2">
                <div className="text-void-200">{u.displayName ?? u.username ?? "—"}</div>
                <div className="text-void-600">{u.email}</div>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    u.role === "ADMIN"
                      ? "bg-signal-red/20 text-signal-red"
                      : u.role === "SUPPORT"
                        ? "bg-signal-amber/20 text-signal-amber"
                        : "bg-void-800 text-void-400"
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-3 py-2 text-void-300">{u.plan}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    u.subscriptionStatus === "active"
                      ? "text-signal-green"
                      : u.subscriptionStatus === "past_due"
                        ? "text-signal-amber"
                        : "text-void-600"
                  }
                >
                  {u.subscriptionStatus ?? "free"}
                </span>
              </td>
              <td className="px-3 py-2 text-void-400">{u.freeUsageMonth}/5</td>
              <td className="px-3 py-2 text-void-600">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ logs }: { logs: AuditEntry[] }) {
  if (logs.length === 0) {
    return <div className="text-void-500 font-mono text-sm">No audit entries.</div>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Panel key={log.id} title={log.action} className="flex items-start gap-3 p-3" bracketed={false}>
          <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-signal-violet" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs font-bold text-signal-cyan">
                {log.action}
              </span>
              <span className="font-mono text-[10px] text-void-600">
                by {log.actorId}
              </span>
            </div>
            {log.targetType && (
              <div className="mt-0.5 font-mono text-[10px] text-void-500">
                target: {log.targetType}/{log.targetId}
              </div>
            )}
            {log.meta && (
              <pre className="mt-1 max-h-16 overflow-hidden text-[10px] text-void-600">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            )}
          </div>
          <div className="shrink-0 font-mono text-[10px] text-void-700">
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </Panel>
      ))}
    </div>
  );
}
