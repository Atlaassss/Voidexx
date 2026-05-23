import type { Metadata, Viewport } from "next";
import { Anton, Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { DemoBanner } from "@/components/DemoBanner";
import { Toaster } from "@/components/Toaster";

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
  metadataBase: new URL(env.app.url),
  title: {
    default: "VOIDEXX // AI Trade Autopsy",
    template: "%s · VOIDEXX",
  },
  description:
    "Upload a screenshot of a losing trade. The engine reads the chart, decodes the smart-money manipulation that took your stop, scores your psychology, and writes the autopsy a prop-firm desk would.",
  applicationName: "VOIDEXX",
  authors: [{ name: "VOIDEXX Systems" }],
  creator: "VOIDEXX Systems",
  publisher: "VOIDEXX Systems",
  keywords: [
    "AI trading",
    "trade journal",
    "trade autopsy",
    "ICT",
    "SMC",
    "smart money concepts",
    "liquidity grab",
    "prop firm",
    "crypto trading",
    "forex trading",
    "trading psychology",
    "BingX",
    "trading dashboard",
  ],
  category: "finance",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "VOIDEXX",
    title: "VOIDEXX // AI Trade Autopsy",
    description:
      "Bloomberg Terminal meets cyberpunk AI. Find out exactly why your trades lose.",
    url: env.app.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VOIDEXX // AI Trade Autopsy",
    description:
      "Drop your losing trade. The engine writes the autopsy a prop-firm desk would.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        <html lang="en" className="dark" suppressHydrationWarning>
          <body className={bodyClass}>
            <DemoBanner />
            {children}
            <Toaster />
          </body>
        </html>
      </ClerkProvider>
    );
  }
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={bodyClass}>
        <DemoBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
