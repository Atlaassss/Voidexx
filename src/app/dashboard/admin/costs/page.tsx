"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import {
  Brain,
  DollarSign,
  TrendingDown,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface CostData {
  daily: Array<{ date: string; costUsd: number; count: number; avgCostUsd: number }>;
  byModel: Array<{ model: string; costUsd: number; count: number; avgCostUsd: number }>;
  totalCostUsd: number;
  totalAutopsies: number;
  avgCostPerAutopsy: number;
  periodDays: number;
  demo?: boolean;
}

export default function AICostDashboardPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/costs?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [days]);

  return (
    <>
      <Topbar title="AI Cost Dashboard" />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Period selector */}
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-void-500">
            Period
          </span>
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 font-mono text-[11px] transition-colors ${
                days === d
                  ? "bg-signal-violet/20 text-signal-violet"
                  : "bg-void-900 text-void-500 hover:text-void-300"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {!data ? (
          <div className="text-void-500 font-mono text-sm">Loading cost data...</div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total AI Spend"
                value={`$${data.totalCostUsd.toFixed(2)}`}
                icon={DollarSign}
                color="text-signal-red"
              />
              <KpiCard
                label="Autopsies Run"
                value={data.totalAutopsies.toLocaleString()}
                icon={Brain}
                color="text-signal-violet"
              />
              <KpiCard
                label="Avg Cost / Autopsy"
                value={`$${data.avgCostPerAutopsy.toFixed(4)}`}
                icon={TrendingDown}
                color="text-signal-cyan"
              />
              <KpiCard
                label="Daily Run Rate"
                value={`$${(data.totalCostUsd / data.periodDays).toFixed(2)}/day`}
                icon={Activity}
                color="text-signal-amber"
              />
            </div>

            {/* Daily cost chart (text-based bar chart) */}
            <Panel title="Daily Cost" className="mb-6 p-4" bracketed={false}>
              <div className="space-y-1">
                {data.daily.map((d) => {
                  const maxCost = Math.max(...data.daily.map((x) => x.costUsd));
                  const barWidth = maxCost > 0 ? (d.costUsd / maxCost) * 100 : 0;
                  return (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 font-mono text-[10px] text-void-600">
                        {d.date.slice(5)}
                      </span>
                      <div className="flex-1">
                        <div
                          className="h-4 bg-signal-violet/30"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-void-400">
                        ${d.costUsd.toFixed(2)}
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-void-600">
                        {d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* By model breakdown */}
            <Panel title="Cost by Model" className="mb-6 p-4" bracketed={false}>
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-void-800 text-left text-void-600 uppercase tracking-widest">
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2 text-right">Cost</th>
                    <th className="px-2 py-2 text-right">Runs</th>
                    <th className="px-2 py-2 text-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.map((m) => (
                    <tr key={m.model} className="border-b border-void-900">
                      <td className="px-2 py-2 text-signal-cyan">{m.model}</td>
                      <td className="px-2 py-2 text-right text-void-300">
                        ${m.costUsd.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-void-400">
                        {m.count}
                      </td>
                      <td className="px-2 py-2 text-right text-void-500">
                        ${m.avgCostUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {data.demo && (
              <div className="rounded border border-signal-amber/30 bg-signal-amber/5 p-3 font-mono text-xs text-signal-amber">
                <AlertTriangle className="mr-2 inline h-3.5 w-3.5" />
                Demo mode — mock cost data. Connect DATABASE_URL to see real AI spend.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="cell relative flex items-center gap-3 p-4">
      <Icon className={`h-7 w-7 ${color}`} />
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-void-500">
          {label}
        </div>
        <div className="font-heading text-xl text-void-100">{value}</div>
      </div>
    </div>
  );
}
