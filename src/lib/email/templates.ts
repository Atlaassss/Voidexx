/**
 * Email templates — rendered as plain HTML strings.
 *
 * Hand-written HTML (no React Email) keeps the bundle and the mental
 * overhead minimal. The templates use inline styles for max client
 * compatibility (Outlook, Gmail iOS, etc strip <style> blocks).
 *
 * Aesthetic mirrors the "Jailbroken Terminal" style — black background,
 * mono numerals, signal-green accents — but uses web-safe substitutes
 * (Helvetica/Arial) since email clients can't load Google Fonts reliably.
 */

const BG = "#000000";
const FG = "#f4f4f8";
const MUTED = "#8a8a9e";
const BORDER = "#1d1d23";
const ACCENT = "#00ff9d";
const RED = "#ff2e3b";
const VIOLET = "#7b2bff";

interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

/**
 * Common email shell — wraps the `inner` body in the dark VOIDEXX frame.
 * `preheader` sets the snippet text many clients show next to the subject.
 */
function shell(opts: { preheader: string; inner: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>VOIDEXX</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:Helvetica,Arial,sans-serif;">
  <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:${BG};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;border:1px solid ${BORDER};">
          <tr>
            <td style="padding:18px 24px;border-bottom:1px solid ${BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Helvetica,Arial,sans-serif;letter-spacing:0.25em;font-size:11px;color:${MUTED};text-transform:uppercase;">// Voidexx · Trade Autopsy</td>
                  <td align="right" style="font-family:'Courier New',monospace;font-size:11px;color:${ACCENT};">SECURE TRANSMISSION</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              ${opts.inner}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;border-top:1px solid ${BORDER};font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.2em;color:${MUTED};text-transform:uppercase;">
              Trading involves substantial risk. Voidexx is analytical software, not advice.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Standard call-to-action button. */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${ACCENT};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;color:${BG};text-decoration:none;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;font-weight:bold;">${escapeHtml(label)} →</a>
  </td></tr></table>`;
}

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------

export function renderWelcome(opts: { displayName: string }): TemplateOutput {
  const subject = "Welcome to Voidexx — your first autopsy is on the house";
  const safeName = escapeHtml(opts.displayName);
  const inner = `
    <h1 style="font-family:Helvetica,Arial,sans-serif;font-weight:900;font-size:34px;letter-spacing:-0.01em;color:${FG};margin:0 0 16px;text-transform:uppercase;">Operator <span style="color:${ACCENT}">${safeName}</span> online.</h1>
    <p style="font-size:14px;line-height:1.6;color:${FG};margin:0 0 12px;">You now have access to the Trade Autopsy engine — the same forensic decode a prop-firm desk runs on a losing position.</p>
    <p style="font-size:14px;line-height:1.6;color:${FG};margin:0 0 24px;">Your free tier ships with 5 autopsies per month. Drop in a screenshot of any closed trade and the engine reads the structure, exposes the smart-money mechanics that took your stop, and writes the verdict.</p>
    <div style="margin:0 0 28px;">${ctaButton("Run first autopsy", "https://voidexx.io/dashboard/upload")}</div>
    <p style="font-size:12px;line-height:1.7;color:${MUTED};margin:0 0 6px;font-family:'Courier New',monospace;letter-spacing:0.1em;">// QUICK START</p>
    <ol style="font-size:13px;line-height:1.7;color:${FG};margin:0;padding-left:20px;">
      <li>Take a screenshot of a closed trade — TradingView, BingX, Binance, MT5 all work.</li>
      <li>Drop it on the Autopsy page. The engine streams progress in real-time.</li>
      <li>The verdict tells you exactly what was done to you and where the entry should have been.</li>
    </ol>
  `;
  return {
    subject,
    html: shell({ preheader: "Your first autopsy is on the house. Drop a screenshot.", inner }),
    text: `Welcome to Voidexx, ${opts.displayName}.\n\nYou have 5 free autopsies per month. Run your first at https://voidexx.io/dashboard/upload`,
  };
}

// ---------------------------------------------------------------------------
// Autopsy ready
// ---------------------------------------------------------------------------

export function renderAutopsyReady(opts: {
  displayName: string;
  autopsyId: string;
  score: number;
  verdict: string;
  appUrl: string;
}): TemplateOutput {
  const safeName = escapeHtml(opts.displayName);
  const safeVerdict = escapeHtml(opts.verdict);
  const scoreColor = opts.score >= 75 ? ACCENT : opts.score >= 50 ? "#ffb000" : RED;
  const subject = `Autopsy ready · score ${opts.score}/100`;
  const inner = `
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;color:${MUTED};text-transform:uppercase;margin:0 0 12px;">// Verdict ready · ${safeName}</p>
    <h1 style="font-family:Helvetica,Arial,sans-serif;font-weight:900;font-size:42px;line-height:1;color:${scoreColor};margin:0 0 6px;">${opts.score} <span style="font-size:16px;color:${MUTED};">/ 100</span></h1>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:18px;line-height:1.4;color:${FG};margin:0 0 24px;font-weight:600;">${safeVerdict}</p>
    <div style="margin:0 0 24px;">${ctaButton("Read full autopsy", `${opts.appUrl}/dashboard/journal?autopsy=${opts.autopsyId}`)}</div>
    <p style="font-size:12px;line-height:1.6;color:${MUTED};margin:0;">Pinned to your journal. Concept tags, flags, and improvement plan are all in the dashboard.</p>
  `;
  return {
    subject,
    html: shell({ preheader: `${opts.score}/100 — ${opts.verdict}`, inner }),
    text: `${opts.displayName}, your autopsy is ready.\n\nScore: ${opts.score}/100\n${opts.verdict}\n\n${opts.appUrl}/dashboard/journal?autopsy=${opts.autopsyId}`,
  };
}

// ---------------------------------------------------------------------------
// Plan changed
// ---------------------------------------------------------------------------

export function renderPlanChanged(opts: {
  displayName: string;
  newPlan: string;
  status: string;
  appUrl: string;
}): TemplateOutput {
  const safeName = escapeHtml(opts.displayName);
  const safePlan = escapeHtml(opts.newPlan);
  const safeStatus = escapeHtml(opts.status);
  const upgrading = opts.newPlan !== "RECON";
  const subject = upgrading
    ? `Plan upgraded · ${opts.newPlan}`
    : `Plan changed · ${opts.newPlan}`;
  const headlineColor = upgrading ? ACCENT : VIOLET;
  const inner = `
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;color:${MUTED};text-transform:uppercase;margin:0 0 12px;">// Subscription update · ${safeName}</p>
    <h1 style="font-family:Helvetica,Arial,sans-serif;font-weight:900;font-size:34px;letter-spacing:-0.01em;color:${headlineColor};margin:0 0 16px;text-transform:uppercase;">${safePlan}</h1>
    <p style="font-size:14px;line-height:1.6;color:${FG};margin:0 0 8px;">Your plan is now <strong style="color:${headlineColor}">${safePlan}</strong> — status <code style="font-family:'Courier New',monospace;color:${MUTED}">${safeStatus}</code>.</p>
    ${
      upgrading
        ? `<p style="font-size:14px;line-height:1.6;color:${FG};margin:0 0 24px;">Unlimited autopsies are unlocked. The exchange-wiring and live-trading paths are active too — turn them on from Automation when you're ready.</p>`
        : `<p style="font-size:14px;line-height:1.6;color:${FG};margin:0 0 24px;">You're back on the free RECON tier (5 autopsies/month). Your data and journal stay intact — re-upgrade any time.</p>`
    }
    <div style="margin:0 0 24px;">${ctaButton("Open billing", `${opts.appUrl}/dashboard/billing`)}</div>
  `;
  return {
    subject,
    html: shell({ preheader: `${opts.newPlan} · ${opts.status}`, inner }),
    text: `${opts.displayName}, your plan is now ${opts.newPlan} (${opts.status}).\n\n${opts.appUrl}/dashboard/billing`,
  };
}
