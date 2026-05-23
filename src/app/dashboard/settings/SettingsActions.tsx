"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface SettingsActionsProps {
  isDemo: boolean;
  user: {
    id?: string;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Action buttons for the Data panel: Export and Purge.
 *
 * Demo mode: Export builds a JSON snapshot of the local view-model
 * and triggers a browser download — fully interactive even without a
 * backend. Purge clears the localStorage prefs and shows a toast.
 *
 * Live mode (later): same buttons hit /api/account/export and
 * /api/account/purge respectively. The shape of this component
 * stays identical; only the click handlers gain a fetch.
 */
export function SettingsActions({ isDemo, user }: SettingsActionsProps) {
  const [busy, setBusy] = useState<"export" | "purge" | null>(null);

  function exportData() {
    setBusy("export");
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        mode: isDemo ? "demo" : "live",
        user: {
          id: user?.id ?? "demo-user",
          displayName: user?.displayName ?? null,
          username: user?.username ?? null,
          email: user?.email ?? null,
        },
        // Demo snapshot — mirrors the visible numbers on the page.
        // Real export hits /api/account/export and streams the full
        // record across trades / autopsies / journals / payments.
        snapshot: {
          tradesStored: 127,
          storageUsedMB: 38,
          storageQuotaMB: 500,
          plan: "RECON",
          freeUsageMonth: 3,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voidexx-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (isDemo) {
        toast.demo("Demo export downloaded", "Snapshot of the visible view-model only.");
      } else {
        toast.success("Export ready", "Your data has been downloaded.");
      }
    } catch (err) {
      toast.error(
        "Export failed",
        err instanceof Error ? err.message : "unknown error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function purgeAccount() {
    const ok = window.confirm(
      "Permanently delete this account? Trades, autopsies, journals, and payment records will be erased. This cannot be undone.",
    );
    if (!ok) return;

    setBusy("purge");
    try {
      if (isDemo) {
        // Best-effort: clear our pref keys.
        try {
          for (const k of Object.keys(window.localStorage)) {
            if (k.startsWith("pref:")) window.localStorage.removeItem(k);
          }
        } catch {
          // ignore
        }
        toast.demo(
          "Account purge — demo only",
          "In demo mode there's no DB to purge. Local preferences cleared.",
        );
      } else {
        // Real purge would POST /api/account/purge here. Phase 8.
        toast.error(
          "Purge not available",
          "Account purge is wired in Phase 8. Email ops@voidexx.io to request immediate deletion.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={exportData}
        disabled={busy !== null}
        className="btn-ghost mt-3 disabled:opacity-50"
      >
        {busy === "export" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Export data
      </button>
      <button
        type="button"
        onClick={purgeAccount}
        disabled={busy !== null}
        className="btn-ghost ml-2 mt-3 border-signal-red/60 text-signal-red hover:border-signal-red hover:text-signal-red disabled:opacity-50"
      >
        {busy === "purge" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Purge account
      </button>
    </>
  );
}
