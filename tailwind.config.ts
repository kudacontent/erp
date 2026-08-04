import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1f33",
        paper: "#f3f8fb",
        line: "#d5e4ee",
        marine: "#0b5f8a",
        signal: "#1aa6c8",
        steel: "#4c6475"
      }
    }
  },
  plugins: []
};

export default config;
