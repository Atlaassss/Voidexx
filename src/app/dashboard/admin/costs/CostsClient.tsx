"use client";

import { useState, useEffect } from "react";
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

export function CostsClient() {
  const [data, setData] = useState<CostData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/costs?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [days]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      {/* Period selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          Window
        </span>
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest2 transition-colors ${
              days === d
                ? "border-signal-violet/60 bg-signal-violet/[0.10] text-signal-violet"
                : "border-void-300/70 text-void-700 hover:border-signal-cyan/40 hover:text-signal-cyan"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {!data ? (
        <div className="font-mono text-sm text-void-700">Loading cost data...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              label="Avg / Autopsy"
              value={`$${data.avgCostPerAutopsy.toFixed(4)}`}
              icon={TrendingDown}
              color="text-signal-cyan"
            />
            <KpiCard
              label="Daily Run Rate"
              value={`$${(data.totalCostUsd / Math.max(1, data.periodDays)).toFixed(2)}/d`}
              icon={Activity}
              color="text-signal-amber"
            />
          </div>

          <Panel title="Daily cost" meta={`${data.daily.length} days`}>
            {data.daily.length === 0 ? (
              <div className="py-6 text-center font-mono text-[11px] text-void-700">
                No autopsies in this window.
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.daily.map((d) => {
                  const maxCost = Math.max(...data.daily.map((x) => x.costUsd), 0.0001);
                  const barWidth = (d.costUsd / maxCost) * 100;
                  return (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 font-mono text-[10px] text-void-700">
                        {d.date.slice(5)}
                      </span>
                      <div className="relative flex-1 bg-void-200">
                        <div
                          className="h-3 bg-signal-violet/40"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-void-800">
                        ${d.costUsd.toFixed(2)}
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-void-700">
                        ×{d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Cost by model" meta={`${data.byModel.length} variants`}>
            {data.byModel.length === 0 ? (
              <div className="py-6 text-center font-mono text-[11px] text-void-700">
                No model usage in this window.
              </div>
            ) : (
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-void-300/70 text-left uppercase tracking-widest2 text-void-700">
                    <th className="px-2 py-2 font-normal">Model</th>
                    <th className="px-2 py-2 text-right font-normal">Cost</th>
                    <th className="px-2 py-2 text-right font-normal">Runs</th>
                    <th className="px-2 py-2 text-right font-normal">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.map((m) => (
                    <tr key={m.model} className="border-b border-void-300/40">
                      <td className="px-2 py-2 text-signal-cyan">{m.model}</td>
                      <td className="px-2 py-2 text-right text-void-800">
                        ${m.costUsd.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-void-800">{m.count}</td>
                      <td className="px-2 py-2 text-right text-void-700">
                        ${m.avgCostUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {data.demo && (
            <div className="border border-signal-amber/40 bg-signal-amber/[0.06] p-3 font-mono text-[11px] text-signal-amber">
              <AlertTriangle className="mr-2 inline h-3 w-3" />
              Demo mode — mock cost data. Set DATABASE_URL to read real Autopsy.costMicros.
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="cell brackets p-4">
      <span className="b1" />
      <span className="b2" />
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${color}`} />
        <div className="min-w-0">
          <div className="truncate font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            {label}
          </div>
          <div className="truncate font-display text-xl tracking-wide text-void-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
