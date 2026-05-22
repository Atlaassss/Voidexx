"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, NotebookPen, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Cmd", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Scan", icon: Upload },
  { href: "/dashboard/journal", label: "Log", icon: NotebookPen },
  { href: "/dashboard/automation", label: "Auto", icon: Bot },
  { href: "/dashboard/settings", label: "Me", icon: User },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-void-300/70 bg-void-0/95 backdrop-blur-md lg:hidden">
      {ITEMS.map((it) => {
        const active = path === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 font-mono text-[10px] uppercase tracking-widest2 transition",
              active ? "text-signal-green" : "text-void-700",
            )}
          >
            {active && <span className="absolute top-0 h-px w-10 bg-signal-green" />}
            <Icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
