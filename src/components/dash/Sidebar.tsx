"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  BookOpen,
  Brain,
  CreditCard,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Settings,
  Trophy,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon; group: string }[] = [
  { href: "/dashboard", label: "Command", icon: LayoutDashboard, group: "Operate" },
  { href: "/dashboard/upload", label: "Autopsy", icon: Upload, group: "Operate" },
  { href: "/dashboard/journal", label: "Journal", icon: NotebookPen, group: "Operate" },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart, group: "Operate" },

  { href: "/dashboard/psychology", label: "Psychology", icon: Brain, group: "Mind" },
  { href: "/dashboard/leaderboards", label: "Leaderboards", icon: Trophy, group: "Mind" },

  { href: "/dashboard/automation", label: "Automation", icon: Bot, group: "Trade" },
  { href: "/dashboard/learn", label: "Learn", icon: BookOpen, group: "Trade" },

  { href: "/dashboard/settings", label: "Settings", icon: Settings, group: "Account" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, group: "Account" },
];

export function Sidebar() {
  const path = usePathname();
  const groups = ["Operate", "Mind", "Trade", "Account"] as const;

  return (
    <aside className="hidden h-screen w-[240px] shrink-0 flex-col border-r border-void-300/70 bg-void-50/40 lg:flex">
      <Link href="/" className="flex h-14 items-center gap-3 border-b border-void-300/70 px-4">
        <span className="grid h-7 w-7 place-items-center bg-signal-green text-void-0 font-mono text-[11px] font-bold">
          VX
        </span>
        <span className="font-display text-xl tracking-widest">VOIDEXX</span>
      </Link>

      <div className="px-3 py-3">
        <div className="flex items-center gap-2 border border-void-300/70 bg-void-100/60 px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-signal-green" />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Engine
            </div>
            <div className="font-mono text-[11px] text-void-900">Online · idle</div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((g) => {
          const items = NAV.filter((n) => n.group === g);
          return (
            <div key={g} className="mt-3">
              <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-widest3 text-void-600">
                {g}
              </div>
              <ul className="space-y-px">
                {items.map((it) => {
                  const active = path === it.href;
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          "group relative flex items-center gap-3 px-2 py-2 font-mono text-[12px] uppercase tracking-widest2 transition",
                          active
                            ? "bg-signal-green/[0.08] text-signal-green"
                            : "text-void-800 hover:bg-void-100 hover:text-signal-cyan",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-0 h-full w-[2px] bg-signal-green" />
                        )}
                        <Icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="m-3 mt-0 border border-signal-violet/30 bg-signal-violet/[0.06] p-3">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-violet">
          Plan · Recon
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-void-800">
          3 / 5 free autopsies used this month.
        </div>
        <Link
          href="/dashboard/billing"
          className="mt-3 block bg-signal-violet px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest2 text-void-0"
        >
          Upgrade →
        </Link>
      </div>
    </aside>
  );
}
