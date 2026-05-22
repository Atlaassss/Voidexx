import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Voidexx palette — "Jailbroken Terminal"
        void: {
          0: "#000000",
          50: "#0a0a0b",
          100: "#101013",
          200: "#16161a",
          300: "#1d1d23",
          400: "#262630",
          500: "#3a3a48",
          600: "#5a5a6e",
          700: "#8a8a9e",
          800: "#c4c4d0",
          900: "#f4f4f8",
        },
        signal: {
          red: "#ff2e3b",
          green: "#00ff9d",
          amber: "#ffb000",
          violet: "#7b2bff",
          cyan: "#00e5ff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
        widest3: "0.4em",
      },
      animation: {
        "scan": "scan 8s linear infinite",
        "ticker": "ticker 60s linear infinite",
        "blink": "blink 1.1s steps(2, start) infinite",
        "rise": "rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        "grid-drift": "gridDrift 30s linear infinite",
        "marquee": "ticker 40s linear infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(0,255,157,0.7)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 0 8px rgba(0,255,157,0)" },
        },
        gridDrift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "60px 60px" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
