import type { Metadata, Viewport } from "next";
import { Anton, Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { DemoBanner } from "@/components/DemoBanner";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VOIDEXX // AI Trade Autopsy",
  description:
    "Upload your losing trades. VOIDEXX exposes the manipulation, liquidity traps, and psychological mistakes destroying your consistency.",
  keywords: [
    "AI trading",
    "trade journal",
    "ICT",
    "SMC",
    "smart money",
    "prop firm",
    "crypto",
    "forex",
    "trade analysis",
  ],
  openGraph: {
    title: "VOIDEXX // AI Trade Autopsy",
    description:
      "Bloomberg Terminal meets cyberpunk AI. Find out exactly why your trades lose.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const fontVars = `${display.variable} ${body.variable} ${mono.variable} ${serif.variable}`;
const bodyClass = `${fontVars} font-body bg-void-0 text-void-900 antialiased selection:bg-signal-green/30 selection:text-signal-green`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Conditionally mount ClerkProvider so the app boots without env keys.
  if (env.clerk.enabled) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="en" className="dark">
          <body className={bodyClass}>
            <DemoBanner />
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }
  return (
    <html lang="en" className="dark">
      <body className={bodyClass}>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
