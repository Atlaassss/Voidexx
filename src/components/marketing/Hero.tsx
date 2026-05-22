"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { TerminalCard } from "./TerminalCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-void-300/60">
      {/* Layered atmospheric background */}
      <div className="absolute inset-0 bg-grid animate-grid-drift opacity-60" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.6]"
        style={{
          background:
            "radial-gradient(800px 400px at 75% 30%, rgba(123,43,255,0.18), transparent 60%), radial-gradient(600px 300px at 15% 80%, rgba(0,229,255,0.14), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 noise" aria-hidden />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:py-28">
        {/* LEFT: copy */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
            <span>Live // Build 0.1.0 // Autopsy engine online</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="display-crush mt-6 text-[15vw] leading-[0.84] sm:text-[88px] lg:text-[120px]"
          >
            Your trades<br />
            failed for<br />
            <span className="text-signal-green">a reason.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-xl text-[15px] leading-relaxed text-void-700 sm:text-base"
          >
            Upload a screenshot of any losing trade. VOIDEXX dissects the{" "}
            <span className="editorial text-void-900">manipulation</span>, liquidity grabs,
            structural errors and emotional triggers — and writes you the autopsy a prop
            firm desk would.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link href="/dashboard" className="btn-primary group">
              Start free trial
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#demo" className="btn-ghost group">
              <Play className="h-3 w-3" />
              Watch live autopsy
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-void-300/70 border border-void-300/70 bg-void-100/40 font-mono text-[10px] uppercase tracking-widest2 text-void-700"
          >
            <Stat k="Trades dissected" v="148,392" />
            <Stat k="Avg. score lift" v="+34%" tone="green" />
            <Stat k="Active desks" v="11,204" />
          </motion.div>
        </div>

        {/* RIGHT: terminal */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <TerminalCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "green" | "red" }) {
  const c = tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-void-900";
  return (
    <div className="px-4 py-4">
      <div className="text-void-700">{k}</div>
      <div className={`mt-1 font-display text-2xl tracking-wide ${c}`}>{v}</div>
    </div>
  );
}
