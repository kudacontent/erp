import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "dev@local.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

test.describe("로그인과 접근 제한", () => {
  test("로그인하지 않으면 보호된 화면에서 로그인으로 보낸다", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login/);
  });

  test("잘못된 비밀번호는 빨간 오류 메시지를 보여준다", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("nobody@example.test");
    await page.getByLabel("비밀번호").fill("wrong-password-1234");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();
  });

  test("로그인하면 대시보드로 들어간다", async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD 환경변수가 있어야 실행됩니다");

    await page.goto("/login");
    await page.getByLabel("이메일").fill(ADMIN_EMAIL);
    await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByRole("heading", { name: "오늘 할 일" })).toBeVisible();
  });
});
