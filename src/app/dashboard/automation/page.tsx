import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Bot, Power, Shield, Zap } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { env } from "@/lib/env";
import { AutomationClient } from "./AutomationClient";
import { DEFAULT_RISK_CAPS } from "@/lib/exchange/risk";
import type { Venue } from "@prisma/client";

const STRATS = [
  { name: "London OB sniper", status: "armed", venue: "BingX", rr: "1:3.2", win: 64 },
  { name: "NY overlap reversal", status: "running", venue: "BingX", rr: "1:2.4", win: 58 },
  { name: "Asia raid hunter", status: "paused", venue: "—", rr: "1:1.8", win: 47 },
];

interface ConnectionRow {
  id: string;
  venue: Venue;
  paperMode: boolean;
  enabled: boolean;
  lastBalanceUsd: number | null;
  lastBalanceAt: string | null;
  lastError: string | null;
}

const DEMO_ROWS: ConnectionRow[] = [
  {
    id: "demo_bingx",
    venue: "BINGX",
    paperMode: true,
    enabled: true,
    lastBalanceUsd: 8420.18,
    lastBalanceAt: new Date().toISOString(),
    lastError: null,
  },
];

const DEMO_POSITIONS = [
  { sym: "BTC / USDT", side: "LONG", size: "0.014", entry: "67,290.0", pnl: "+0.7R", c: "green" },
  { sym: "ETH / USDT", side: "SHORT", size: "0.41", entry: "3,251.4", pnl: "−0.3R", c: "red" },
];

async function loadConnections(): Promise<ConnectionRow[]> {
  const user = await getSessionUser();
  const db = tryGetDb();
  if (!user || user.isDemo || !db) return DEMO_ROWS;

  const rows = await db.exchangeConnection.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      venue: true,
      paperMode: true,
      enabled: true,
      lastBalanceCents: true,
      lastBalanceAt: true,
      lastError: true,
    },
  });

  if (rows.length === 0) return [];
  return rows.map((r) => ({
    id: r.id,
    venue: r.venue,
    paperMode: r.paperMode,
    enabled: r.enabled,
    lastBalanceUsd:
      r.lastBalanceCents != null ? Number(r.lastBalanceCents) / 100 : null,
    lastBalanceAt: r.lastBalanceAt?.toISOString() ?? null,
    lastError: r.lastError,
  }));
}

export default async function AutomationPage() {
  const connections = await loadConnections();
  const usingDemo = connections === DEMO_ROWS;

  return (
    <>
      <Topbar
        title="Automation hub"
        sub={
          env.exchange.enabled
            ? "strategy desk · risk caps engaged · paper mode"
            : "strategy desk · demo (set EXCHANGE_ENCRYPTION_KEY)"
        }
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              k: "Daily loss cap",
              v: `−${DEFAULT_RISK_CAPS.dailyLossCapR.toFixed(1)}R`,
              icon: Shield,
              c: "text-signal-red",
            },
            {
              k: "Max concurrent",
              v: `${DEFAULT_RISK_CAPS.maxConcurrent} pos`,
              icon: Zap,
              c: "text-signal-cyan",
            },
            { k: "Per-trade size", v: "0.5%", icon: Power, c: "text-signal-amber" },
            { k: "AI override", v: "ON", icon: Bot, c: "text-signal-green" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.k} className="cell brackets relative p-4">
                <span className="b1" />
                <span className="b2" />
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  <span>{s.k}</span>
                  <Icon className={`h-3.5 w-3.5 ${s.c}`} />
                </div>
                <div className={`mt-3 font-display text-3xl tracking-wide ${s.c}`}>{s.v}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel
            title="Connected venues"
            meta={env.exchange.enabled ? "encrypted · server-only" : "demo · ephemeral"}
            className="xl:col-span-2"
          >
            {connections.length === 0 ? (
              <div className="grid place-items-center py-12 text-center">
                <div className="font-display text-2xl tracking-wide text-void-700">
                  No exchange connected
                </div>
                <p className="mt-2 max-w-md text-sm text-void-700">
                  Link a read-only BingX API key to track balance, positions, and PnL on this
                  desk. Live trading remains opt-in and disabled by default.
                </p>
                <AutomationClient
                  connections={[]}
                  exchangeConfigured={env.exchange.enabled}
                  dbConfigured={env.db.enabled}
                />
              </div>
            ) : (
              <AutomationClient
                connections={connections}
                exchangeConfigured={env.exchange.enabled}
                dbConfigured={env.db.enabled}
              />
            )}
          </Panel>

          <Panel title="Open positions" meta={usingDemo ? "demo · static" : "real-time"}>
            <ul className="space-y-3 font-mono text-[12px]">
              {DEMO_POSITIONS.map((p, i) => (
                <li key={i} className="border-l-2 border-void-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tracking-wide">{p.sym}</span>
                    <span
                      className={`text-[10px] uppercase tracking-widest2 ${
                        p.side === "LONG" ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {p.side}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-void-700">
                      {p.size} @ {p.entry}
                    </span>
                    <span
                      className={p.c === "green" ? "text-signal-green" : "text-signal-red"}
                    >
                      {p.pnl}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {!usingDemo && (
              <div className="mt-4 border border-signal-violet/30 bg-signal-violet/[0.05] p-3 font-mono text-[10px] uppercase tracking-widest2 text-signal-violet">
                Positions feed lands in Phase 5.5 · BingX swap API
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Strategy templates">
          <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
            {STRATS.map((s) => (
              <div key={s.name} className="bg-void-50/60 p-5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2">
                  <span
                    className={
                      s.status === "running"
                        ? "text-signal-green"
                        : s.status === "armed"
                          ? "text-signal-cyan"
                          : "text-void-700"
                    }
                  >
                    ● {s.status}
                  </span>
                  <span className="text-void-700">{s.venue}</span>
                </div>
                <div className="mt-2 font-display text-2xl tracking-wide">{s.name}</div>
                <div className="mt-3 grid grid-cols-2 gap-px bg-void-300/60">
                  <div className="bg-void-100/60 p-2 text-center font-mono text-[11px]">
                    <div className="text-[9px] uppercase tracking-widest2 text-void-700">R:R</div>
                    <div className="text-void-900">{s.rr}</div>
                  </div>
                  <div className="bg-void-100/60 p-2 text-center font-mono text-[11px]">
                    <div className="text-[9px] uppercase tracking-widest2 text-void-700">Win</div>
                    <div className="text-signal-green">{s.win}%</div>
                  </div>
                </div>
                <button className="btn-ghost mt-4 w-full justify-center" disabled>
                  Configure (Phase 6) →
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
