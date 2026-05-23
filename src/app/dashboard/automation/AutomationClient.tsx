"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, RefreshCw, X } from "lucide-react";
import type { Venue } from "@prisma/client";

interface ConnectionRow {
  id: string;
  venue: Venue;
  paperMode: boolean;
  enabled: boolean;
  lastBalanceUsd: number | null;
  lastBalanceAt: string | null;
  lastError: string | null;
}

interface AutomationClientProps {
  connections: ConnectionRow[];
  exchangeConfigured: boolean;
  dbConfigured: boolean;
}

/**
 * Client-side handlers for the Automation page. Wraps the connection
 * list with a "Connect BingX" modal, refresh / disconnect buttons,
 * and inline error display.
 *
 * The page itself is a server component that loads the connection
 * list; this client takes over for everything that needs onClick.
 */
export function AutomationClient({
  connections,
  exchangeConfigured,
  dbConfigured,
}: AutomationClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function refresh(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/exchange/${id}`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.reason ?? data.error ?? "refresh_failed");
      // Soft refresh — re-renders the server component with new DB state.
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Revoke this exchange connection? Stored credentials will be wiped.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/exchange/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "disconnect_failed");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error && (
        <div className="mt-4 border border-signal-red/40 bg-signal-red/[0.06] p-3 font-mono text-[11px] uppercase tracking-widest2 text-signal-red">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-3 w-3" />
          Connect BingX
        </button>

        {!exchangeConfigured && (
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
            Demo · set EXCHANGE_ENCRYPTION_KEY to persist
          </span>
        )}
        {exchangeConfigured && !dbConfigured && (
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
            DB unwired · connections are ephemeral
          </span>
        )}
      </div>

      {connections.length > 0 && (
        <div className="mt-6 divide-y divide-void-300/60 border border-void-300/70">
          {connections.map((c) => (
            <ConnectionRow
              key={c.id}
              row={c}
              busy={busy === c.id}
              onRefresh={() => refresh(c.id)}
              onDisconnect={() => disconnect(c.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

function ConnectionRow({
  row,
  busy,
  onRefresh,
  onDisconnect,
}: {
  row: ConnectionRow;
  busy: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3">
      <span className="col-span-3 font-display text-xl tracking-wide">{row.venue}</span>
      <span
        className={`col-span-2 font-mono text-[11px] uppercase tracking-widest2 ${
          row.enabled ? "text-signal-green" : "text-void-700"
        }`}
      >
        ● {row.enabled ? (row.paperMode ? "paper" : "live") : "disabled"}
      </span>
      <span className="col-span-3 font-mono text-[11px] text-void-900">
        {row.lastBalanceUsd != null
          ? `$${row.lastBalanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—"}
      </span>
      <span className="col-span-2 font-mono text-[10px] text-void-700">
        {row.lastBalanceAt ? new Date(row.lastBalanceAt).toLocaleTimeString() : "never"}
      </span>
      <div className="col-span-2 flex justify-end gap-2">
        <button
          onClick={onRefresh}
          disabled={busy}
          className="btn-ghost px-2 py-1 disabled:opacity-50"
          title="Refresh balance"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </button>
        <button
          onClick={onDisconnect}
          disabled={busy}
          className="btn-ghost border-signal-red/60 px-2 py-1 text-signal-red hover:border-signal-red disabled:opacity-50"
          title="Disconnect"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {row.lastError && (
        <div className="col-span-12 mt-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-red">
          last error · {row.lastError}
        </div>
      )}
    </div>
  );
}

function ConnectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [paperMode] = useState(true); // forced true for v1; live trading lands in Phase 6 admin
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/exchange/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          venue: "BINGX",
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          paperMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "connect_failed");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-void-0/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="brackets cell relative w-full max-w-md p-6"
      >
        <span className="b1" />
        <span className="b2" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-void-700 hover:text-signal-red"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          // venue · BingX
        </div>
        <h2 className="display-crush mt-2 text-3xl">Link BingX</h2>
        <p className="mt-2 text-sm text-void-700">
          Paste a <span className="editorial text-signal-cyan">read-only</span> API key. We probe
          your balance to verify the credential, then encrypt + store it server-side. Live
          trading is opt-in and disabled until Phase 6.
        </p>

        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">API key</span>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="paste BingX API key"
            className="mt-1 w-full border border-void-300/70 bg-void-100/40 px-3 py-2 font-mono text-[12px] text-void-900 focus:border-signal-cyan focus:outline-none"
            required
            minLength={8}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            API secret
          </span>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="paste BingX API secret"
            className="mt-1 w-full border border-void-300/70 bg-void-100/40 px-3 py-2 font-mono text-[12px] text-void-900 focus:border-signal-cyan focus:outline-none"
            required
            minLength={8}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="mt-3 border border-signal-violet/30 bg-signal-violet/[0.05] p-3 font-mono text-[10px] uppercase tracking-widest2 text-signal-violet">
          ● paper mode only · live trading available in Phase 6
        </div>

        {error && (
          <div className="mt-4 border border-signal-red/40 bg-signal-red/[0.06] p-3 font-mono text-[11px] text-signal-red">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-ghost flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || apiKey.length < 8 || apiSecret.length < 8}
            className="btn-primary flex-1 justify-center disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {submitting ? "Probing..." : "Probe & link"}
          </button>
        </div>
      </form>
    </div>
  );
}
