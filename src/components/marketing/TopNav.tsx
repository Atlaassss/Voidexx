"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function TopNav() {
  const [t, setT] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      setT(`${hh}:${mm}:${ss} UTC`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-void-300/60 bg-void-0/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-signal-green text-void-0 font-mono text-[11px] font-bold">
            VX
          </span>
          <span className="font-display text-xl tracking-widest text-void-900">VOIDEXX</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest2 text-void-700 sm:inline">
            // Trade Autopsy
          </span>
        </Link>

        <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-widest2 text-void-800 lg:flex">
          <a href="#features" className="hover:text-signal-cyan transition">Features</a>
          <a href="#demo" className="hover:text-signal-cyan transition">Live demo</a>
          <a href="#pricing" className="hover:text-signal-cyan transition">Pricing</a>
          <Link href="/blog" className="hover:text-signal-cyan transition">Field notes</Link>
          <a href="#faq" className="hover:text-signal-cyan transition">FAQ</a>
          <Link href="/dashboard" className="hover:text-signal-cyan transition">Dashboard</Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] tracking-widest2 text-void-700 sm:inline">
            {t || "--:--:-- UTC"}
          </span>
          <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
          <Link href="/dashboard" className="btn-primary">Start free</Link>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-signal-cyan/40 to-transparent" />
    </header>
  );
}
