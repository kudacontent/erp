import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // src/lib 안에도 Tailwind 클래스 문자열이 들어 있다
    // (calendar-data.ts 의 카테고리 색, dashboard-data.ts 의 tone, status-tone.ts 의 뱃지 클래스).
    // 이 줄이 없으면 해당 클래스들이 전부 purge 되어 색이 사라진다.
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "Noto Sans KR",
          "sans-serif"
        ]
      },
      colors: {
        // --- 기존 브랜드 토큰 (유지) ---
        ink: "#0b1f33",
        paper: "#f3f8fb",
        line: "#d5e4ee",
        marine: "#0b5f8a",
        signal: "#1aa6c8",
        steel: "#4c6475",

        // --- 추가: 표면 ---
        surface: "#ffffff",
        "surface-muted": "#f7fafc",

        // --- 추가: 시맨틱 상태 색상 ---
        // 각 항목의 fg 는 bg 위에서 WCAG AA(4.5:1) 이상을 만족하도록 골랐다.
        success: {
          bg: "#e7f6ec",
          fg: "#116b3a",
          border: "#bfe3cd"
        },
        warning: {
          bg: "#fdf1dc",
          fg: "#8a5a09",
          border: "#f2dcae"
        },
        danger: {
          bg: "#fdeceb",
          fg: "#a3231c",
          border: "#f5c9c6"
        },
        info: {
          bg: "#e8f5fb",
          fg: "#0b5f8a",
          border: "#c5e3f2"
        },
        neutral: {
          bg: "#eef3f7",
          fg: "#4c6475",
          border: "#d5e4ee"
        }
      }
    }
  },
  plugins: []
};

export default config;
