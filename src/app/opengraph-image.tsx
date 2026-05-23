import { ImageResponse } from "next/og";

/**
 * Default Open Graph image for the marketing root.
 *
 * Generated at build time with @vercel/og. We hand-roll the layout
 * (no Tailwind here — `next/og` doesn't run user CSS) to match the
 * "Jailbroken Terminal" aesthetic: pure black, condensed display
 * typography, signal-green accents, monospace HUD strip.
 *
 * 1200×630 is the OpenGraph standard and what Twitter/Discord/Slack
 * preview cards target.
 */
export const runtime = "nodejs";
export const alt = "VOIDEXX // AI Trade Autopsy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#f4f4f8",
          fontFamily: "Helvetica, Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          position: "relative",
          backgroundImage:
            "radial-gradient(900px 500px at 80% 20%, rgba(0,229,255,0.10), transparent 60%), radial-gradient(700px 400px at 10% 90%, rgba(123,43,255,0.10), transparent 60%)",
        }}
      >
        {/* Top HUD strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#8a8a9e",
          }}
        >
          <span>// AI Trade Autopsy</span>
          <span style={{ color: "#00ff9d" }}>SIGNAL ACTIVE</span>
        </div>

        {/* Main brand crush */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontWeight: 900,
              fontSize: 220,
              lineHeight: 0.85,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
            }}
          >
            VOID
            <span style={{ color: "#00ff9d", marginLeft: 14 }}>EXX_</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 36,
              maxWidth: 900,
              lineHeight: 1.2,
              color: "#c4c4d0",
              fontWeight: 300,
            }}
          >
            Drop your losing trades. The engine reads the chart, exposes the
            liquidity grab, and writes the autopsy a prop-firm desk would.
          </div>
        </div>

        {/* Bottom HUD strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid #1d1d23",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#8a8a9e",
          }}
        >
          <span>VOIDEXX.IO</span>
          <span style={{ color: "#00e5ff" }}>VISION → STRUCTURE → VERDICT</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
