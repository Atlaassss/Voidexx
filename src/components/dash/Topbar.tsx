import { Cpu, Wifi } from "lucide-react";
import { TopbarClock } from "./TopbarClock";
import { TopbarSearch } from "./TopbarSearch";
import { TopbarBell } from "./TopbarBell";
import { UserChip } from "./UserChip";

/**
 * Dashboard topbar. Server component so it can resolve session info
 * (UserChip) and avoid hydration jitter for the static parts. The
 * clock, search, and notification bell are split into client
 * components so the shell doesn't re-render on each tick / popover.
 */
export function Topbar({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-void-300/70 bg-void-0/80 px-4 backdrop-blur-md sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl leading-none tracking-wide text-void-900">{title}</h1>
        {sub && (
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            {sub}
          </div>
        )}
      </div>

      <TopbarSearch />

      <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-void-700 lg:flex">
        <Status icon={Wifi} label="Exch" value="BingX" />
        <Status icon={Cpu} label="AI" value="ready" />
        <TopbarClock />
      </div>

      <TopbarBell />

      <UserChip />
    </header>
  );
}

function Status({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 border border-void-300/70 bg-void-100/40 px-2 py-1.5">
      <Icon className="h-3 w-3 text-signal-green" />
      <span className="text-void-700">{label}</span>
      <span className="text-signal-green">{value}</span>
    </div>
  );
}
