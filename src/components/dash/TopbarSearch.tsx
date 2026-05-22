"use client";

import { Search } from "lucide-react";

export function TopbarSearch() {
  return (
    <div className="hidden items-center gap-2 border border-void-300/70 bg-void-100/60 px-3 py-1.5 font-mono text-[11px] text-void-700 md:flex">
      <Search className="h-3.5 w-3.5" />
      <input
        placeholder="Search trades, journals, sessions"
        className="w-64 bg-transparent placeholder:text-void-600 focus:outline-none"
      />
      <span className="ml-2 border border-void-300 px-1 text-[10px]">⌘ K</span>
    </div>
  );
}
