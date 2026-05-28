"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import { toast } from "@/lib/toast";

interface ShareAutopsyButtonProps {
  /** Persisted Autopsy.id. Falsy in demo mode → button shows demo toast. */
  autopsyId: string | null | undefined;
  /** True when no DB is configured server-side. */
  demoMode: boolean;
}

/**
 * Share-link control attached to a finished autopsy report.
 *
 * Click flow:
 *   1. Open modal.
 *   2. Toggle "share publicly" → POSTs to /api/autopsy/[id]/share.
 *   3. URL appears with Copy / Open / native Share buttons.
 *   4. Toggle off (or close) leaves the link revoked but remembered;
 *      re-enabling resurrects the same URL unless "Rotate token" is
 *      ticked.
 *
 * Demo mode: the button still renders, but clicking surfaces an amber
 * toast explaining sharing needs DATABASE_URL — same pattern as the
 * other demo-mode UX.
 */
export function ShareAutopsyButton({ autopsyId, demoMode }: ShareAutopsyButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [rotate, setRotate] = useState(false);
  const [copied, setCopied] = useState(false);

  function click() {
    if (demoMode || !autopsyId) {
      toast.demo(
        "Share — demo mode",
        "Public links need a DB to look up the share token. Set DATABASE_URL.",
      );
      return;
    }
    setOpen(true);
  }

  async function toggle(next: boolean) {
    if (!autopsyId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/autopsy/${autopsyId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next, rotate: next ? rotate : false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "share_failed");
      setEnabled(data.enabled);
      setShareUrl(data.shareUrl);
      setRotate(false);
      if (data.enabled) {
        toast.success("Public link active", "Anyone with the URL can view this autopsy.");
      } else {
        toast.info("Public link revoked", "URL stops resolving immediately.");
      }
    } catch (e) {
      toast.error("Share failed", e instanceof Error ? e.message : "unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("URL copied");
    } catch {
      toast.error("Copy failed", "Browser refused clipboard access.");
    }
  }

  async function share() {
    if (!shareUrl) return;
    if (!navigator.share) {
      // No native share API — fall back to copy.
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: "Trade autopsy",
        text: "Check out this AI-generated forensic report on a trade.",
        url: shareUrl,
      });
    } catch {
      // user cancelled — no toast needed
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={click}
        className="btn-ghost"
      >
        <Share2 className="h-3 w-3" />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-void-0/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="brackets cell relative w-full max-w-md p-6"
          >
            <span className="b1" />
            <span className="b2" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-void-700 hover:text-signal-red"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
              // share · autopsy
            </div>
            <h2 className="display-crush mt-2 text-3xl">Public link</h2>
            <p className="mt-2 text-sm text-void-700">
              Generate a shareable URL. Anyone with the link can view this
              autopsy in read-only mode. Revoke any time — the URL stops
              resolving the moment you toggle off.
            </p>

            <div className="mt-5 flex items-center justify-between border border-void-300/70 bg-void-100/40 px-3 py-3">
              <span className="font-mono text-[11px] uppercase tracking-widest2 text-void-900">
                Share publicly
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(!enabled)}
                disabled={busy}
                className={`relative inline-block h-5 w-10 cursor-pointer border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  enabled
                    ? "border-signal-green bg-signal-green/20"
                    : "border-void-400 bg-void-200 hover:border-void-500"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 transition-all ${
                    enabled
                      ? "left-[calc(100%-14px)] bg-signal-green"
                      : "left-1 bg-void-700"
                  }`}
                />
              </button>
            </div>

            {enabled && shareUrl && (
              <>
                <div className="mt-4 flex items-center gap-2 border border-signal-green/40 bg-signal-green/[0.04] p-3 font-mono text-[11px]">
                  <Link2 className="h-3 w-3 shrink-0 text-signal-green" />
                  <span className="flex-1 truncate text-void-900" title={shareUrl}>
                    {shareUrl}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={copy} className="btn-ghost flex-1 justify-center">
                    {copied ? <Check className="h-3 w-3 text-signal-green" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy URL"}
                  </button>
                  <button onClick={share} className="btn-primary flex-1 justify-center">
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                </div>
                <label className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  <input
                    type="checkbox"
                    checked={rotate}
                    onChange={(e) => setRotate(e.target.checked)}
                    className="accent-signal-cyan"
                  />
                  Rotate token on next enable
                </label>
              </>
            )}

            {busy && (
              <div className="mt-4 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Talking to server…
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
