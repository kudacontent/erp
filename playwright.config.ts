import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 테스트 설정.
 *
 * 단위 테스트(npm test)와 달리 실제 서버와 DB 가 필요하다.
 *
 *   npm i -D @playwright/test && npx playwright install chromium
 *   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db redis
 *   npx prisma migrate deploy && node scripts/bootstrap-admin.mjs
 *   npm run test:e2e
 *
 * 로그인 계정은 .env 의 ADMIN_EMAIL / ADMIN_PASSWORD 를 그대로 쓴다.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 120_000
      }
});
