"use client";

import { Bell, Cpu, Search, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function Topbar({ title, sub }: { title: string; sub?: string }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      setT(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-void-300/70 bg-void-0/80 px-4 backdrop-blur-md sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl leading-none tracking-wide text-void-900">{title}</h1>
        {sub && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            {sub}
          </div>
        )}
      </div>

      <div className="hidden items-center gap-2 border border-void-300/70 bg-void-100/60 px-3 py-1.5 font-mono text-[11px] text-void-700 md:flex">
        <Search className="h-3.5 w-3.5" />
        <input
          placeholder="Search trades, journals, sessions"
          className="w-64 bg-transparent placeholder:text-void-600 focus:outline-none"
        />
        <span className="ml-2 border border-void-300 px-1 text-[10px]">⌘ K</span>
      </div>

      <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-void-700 lg:flex">
        <Status icon={Wifi} label="Exch" value="BingX" tone="green" />
        <Status icon={Cpu} label="AI" value="ready" tone="green" />
        <span className="text-void-600">{t || "--:--:--"} UTC</span>
      </div>

      <button className="relative grid h-9 w-9 place-items-center border border-void-300/70 bg-void-100/40 text-void-700 hover:text-signal-cyan">
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-signal-amber" />
      </button>

      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center border border-void-300/70 bg-signal-violet/[0.08] font-mono text-xs text-signal-violet">
          KX
        </span>
      </div>
    </header>
  );
}

function Status({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "green" | "red" | "amber";
}) {
  const c =
    tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-signal-amber";
  return (
    <div className="flex items-center gap-1.5 border border-void-300/70 bg-void-100/40 px-2 py-1.5">
      <Icon className={`h-3 w-3 ${c}`} />
      <span className="text-void-700">{label}</span>
      <span className={c}>{value}</span>
    </div>
  );
}
