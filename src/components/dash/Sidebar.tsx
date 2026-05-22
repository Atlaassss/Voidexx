import Link from "next/link";
import { Activity } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { SidebarNav } from "./SidebarNav";

/**
 * Server component shell — resolves session, hands the rest to the
 * client SidebarNav for active-link awareness.
 */
export async function Sidebar() {
  const user = await getSessionUser();
  const plan = "Recon"; // TODO: source from DB once user.plan is read in Phase 3

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
          <div className="flex-1 truncate">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              {user?.isDemo ? "Demo session" : "Operator"}
            </div>
            <div className="truncate font-mono text-[11px] text-void-900">
              {user?.username ?? user?.displayName ?? user?.email ?? "guest"}
            </div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
        </div>
      </div>

      <SidebarNav />

      <div className="m-3 mt-0 border border-signal-violet/30 bg-signal-violet/[0.06] p-3">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-violet">
          Plan · {plan}
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
