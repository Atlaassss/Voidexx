"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  Brain,
  CreditCard,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Settings,
  Shield,
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
  { href: "/dashboard/admin", label: "Admin", icon: Shield, group: "Admin" },
];

const GROUPS = ["Operate", "Mind", "Trade", "Account", "Admin"] as const;

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-6">
      {GROUPS.map((g) => {
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
  );
}
