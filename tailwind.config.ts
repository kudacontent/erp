import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // src/lib 안에도 Tailwind 클래스 문자열이 들어 있다.
    // (calendar-data.ts 의 카테고리 색, dashboard-data.ts 의 tone)
    // 이 줄이 없으면 해당 클래스가 전부 purge 되어 화면에서 색이 사라진다.
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
        // ─── 기존 브랜드 토큰 (값 변경 없음) ───────────────────────
        ink: "#0b1f33",      // 본문 진한 글씨. #18394d, #333 을 대체
        paper: "#f3f8fb",    // 화면 바탕
        line: "#d5e4ee",     // 기본 테두리. #dce4e9 를 대체
        marine: "#0b5f8a",   // 주요 파랑. #075985, #0b6e99 을 대체
        signal: "#1aa6c8",   // 강조 하늘색
        steel: "#4c6475",    // 보조 회색 글씨. #657a88, #536b7a, #778592, #62717c 를 대체

        // ─── 추가: 표면과 테두리 ──────────────────────────────────
        surface: "#ffffff",       // 카드/패널 배경
        "surface-sunk": "#eef3f6", // 한 단계 눌린 배경 (코드 블록, 보조 영역)
        "line-strong": "#aebfcb",  // 문서 표 격자처럼 또렷해야 하는 테두리
        muted: "#637585",          // placeholder 전용. 흐리되 흰 배경에서 4.76:1 로 AA 를 넘긴다
        // ─── 문서 워크스페이스(견적서·청구서·세금계산서) 전용 ───
        "surface-subtle": "#f7f9fa",  // 문서 편집 영역의 옅은 바탕. 미세하게 다른 흰색 8종을 하나로 모았다
        "edit-bg": "#fff7c2",         // "여기 입력하세요" 노란 강조. 본문 대비 15.37:1
        "edit-ring": "#1d95b8",       // 편집 필드 포커스 링. 기존 #55c5df 는 2.01:1 로 비텍스트 기준(3:1) 미달이라 조정
        toolbar: "#20384d",           // 문서 상단 어두운 도구 막대
        "toolbar-fg": "#a7e9f5",      // 도구 막대 위 글씨. 9.01:1

        // ─── 추가: 시맨틱 상태 색 ─────────────────────────────────
        // 모든 fg/bg 조합은 WCAG AA(4.5:1) 이상을 확인했다.
        //   success 5.75  warning 6.37  danger 5.75  info 6.26  neutral 5.55
        success: {
          bg: "#e4f4ec",
          fg: "#0f6b45",
          border: "#bfe0cd"
        },
        warning: {
          bg: "#fdf2d9",
          fg: "#92400e",   // 기존 지출 결재 화면에서 쓰던 값을 그대로 승격
          border: "#f2ddab"
        },
        danger: {
          bg: "#fdeceb",
          fg: "#b42318",   // 기존 로그인 화면에서 쓰던 값을 그대로 승격
          border: "#f5c9c6"
        },
        info: {
          bg: "#e8f5fb",
          fg: "#0b5f8a",
          border: "#c5e3f2"
        },
        neutral: {
          bg: "#eef3f6",
          fg: "#4c6475",
          border: "#d5e4ee"
        }
      }
    }
  },
  plugins: []
};

export default config;
