import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "dev@local.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

test.beforeEach(async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD 환경변수가 있어야 실행됩니다");

  await page.goto("/login");
  await page.getByLabel("이메일").fill(ADMIN_EMAIL);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL("/");
});

test.describe("거래처 등록 → 목록 반영 → 수정 → 보관", () => {
  test("등록한 거래처가 목록에 바로 나타난다", async ({ page }) => {
    // 목록이 정적 생성되던 시절에는 등록해도 재빌드 전까지 보이지 않았다
    const name = `테스트거래처-${Date.now()}`;

    await page.goto("/clients/new");
    await page.getByLabel(/거래처명/).fill(name);
    await page.getByLabel(/담당자 이름/).fill("홍길동");
    await page.getByRole("button", { name: "저장" }).click();

    await page.goto("/clients");
    await expect(page.getByText(name)).toBeVisible();
  });

  test("상세에서 정보를 수정할 수 있다", async ({ page }) => {
    const name = `수정테스트-${Date.now()}`;

    await page.goto("/clients/new");
    await page.getByLabel(/거래처명/).fill(name);
    await page.getByLabel(/담당자 이름/).fill("김담당");
    await page.getByRole("button", { name: "저장" }).click();

    // 등록 후 상세로 이동한다
    await page.getByRole("button", { name: "정보 수정" }).click();
    await page.getByLabel(/대표 연락처/).fill("051-000-0000");
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("수정 내용을 저장했습니다.")).toBeVisible();
  });
});
