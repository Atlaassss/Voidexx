"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(800px 400px at 80% 20%, rgba(0,229,255,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-4 pt-24 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="display-crush text-[16vw] leading-[0.85] sm:text-[120px] lg:text-[180px]">
            VOID<br />
            <span className="text-signal-green">EXX_</span>
          </h2>
          <Link href="/dashboard" className="hidden btn-primary sm:inline-flex">
            Run autopsy
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-void-300/70 py-10 font-mono text-[11px] uppercase tracking-widest2 sm:grid-cols-6">
          <FCol title="Product">
            <a href="#features">Features</a>
            <a href="#demo">Live demo</a>
            <a href="#pricing">Pricing</a>
            <Link href="/dashboard">Dashboard</Link>
          </FCol>
          <FCol title="Modules">
            <Link href="/dashboard/upload">Autopsy</Link>
            <Link href="/dashboard/journal">Journal</Link>
            <Link href="/dashboard/news">News</Link>
            <Link href="/dashboard/learn">Learn</Link>
          </FCol>
          <FCol title="Resources">
            <Link href="/blog">Field notes</Link>
            <Link href="/dashboard/referrals">Referrals</Link>
            <a href="#">Changelog</a>
            <a href="#">Roadmap</a>
          </FCol>
          <FCol title="Company">
            <a href="#">About</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
            <a href="#">Contact</a>
          </FCol>
          <FCol title="Legal">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Security</a>
            <a href="#">DPA</a>
          </FCol>
          <FCol title="Status">
            <span className="flex items-center gap-2 text-signal-green">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
              All systems online
            </span>
            <span className="text-void-700">v0.1.0 · build #00427</span>
          </FCol>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-void-300/70 py-6 font-mono text-[10px] uppercase tracking-widest2 text-void-700 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} VOIDEXX SYSTEMS. All rights reserved.</span>
          <span>
            Trading involves substantial risk. VOIDEXX is analytical software,
            <span className="editorial text-void-800"> not advice.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-void-600">{title}</div>
      <div className="flex flex-col gap-2 text-void-800 [&_a:hover]:text-signal-cyan [&_a]:transition">
        {children}
      </div>
    </div>
  );
}
