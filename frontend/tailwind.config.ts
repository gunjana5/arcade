import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // scan these so unused neon classes aren't purged
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        press: ["var(--font-press)", "cursive"],
        bubble: ["var(--font-bubble)", "cursive"],
        vt: ["var(--font-vt)", "monospace"],
        // keep old names pointing at pixel fonts so leftover classes still look right
        orbitron: ["var(--font-press)", "cursive"],
        inter: ["var(--font-vt)", "monospace"],
      },
      colors: {
        // map utility names -> css custom props (single source in globals.css)
        "bg-void": "var(--bg-void)",
        "bg-surface": "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-border": "var(--bg-border)",
        "neon-cyan": "var(--neon-cyan)",
        "neon-purple": "var(--neon-purple)",
        "neon-pink": "var(--neon-pink)",
        "neon-orange": "var(--neon-orange)",
        "neon-green": "var(--neon-green)",
        "neon-yellow": "var(--neon-yellow)",
        "neon-magenta": "var(--neon-magenta)",
        "neon-cyan-dim": "var(--neon-cyan-dim)",
        "neon-purple-dim": "var(--neon-purple-dim)",
        "neon-pink-dim": "var(--neon-pink-dim)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        fg: "var(--text-primary)",
        subtle: "var(--text-secondary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        "board-light": "var(--board-sq-light)",
        "board-dark": "var(--board-sq-dark)",
        pure: "var(--border-pure)",
      },
      boxShadow: {
        "glow-cyan": "var(--glow-cyan)",
        "glow-purple": "var(--glow-purple)",
        "glow-pink": "var(--glow-pink)",
        "glow-green": "var(--glow-green)",
        "glow-orange": "var(--glow-orange)",
        "glow-magenta": "var(--glow-magenta)",
        "glow-yellow": "var(--glow-yellow)",
      },
      animation: {
        // float = coin bob on home, flicker = title glitch
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        flicker: "flicker 4s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.9", filter: "brightness(1.2)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        flicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.82" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
