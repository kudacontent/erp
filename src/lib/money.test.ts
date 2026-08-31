import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatWon, formatNumber, parseWon } from "./money.ts";

describe("금액 표시", () => {
  test("천 단위 구분과 원 단위를 붙인다", () => {
    assert.equal(formatWon(2500000), "2,500,000원");
    assert.equal(formatWon(0), "0원");
    assert.equal(formatWon(1), "1원");
  });

  test("BigInt 를 받는다 (Prisma 가 금액을 BigInt 로 준다)", () => {
    assert.equal(formatWon(BigInt(2500000)), "2,500,000원");
  });

  test("문자열도 받는다 (API 응답이 문자열로 직렬화된다)", () => {
    assert.equal(formatWon("2500000"), "2,500,000원");
  });

  test("빈 값은 0원", () => {
    assert.equal(formatWon(null), "0원");
    assert.equal(formatWon(undefined), "0원");
    assert.equal(formatWon(""), "0원");
  });

  test("숫자가 아니면 0원 (화면이 NaN원 을 띄우지 않게)", () => {
    assert.equal(formatWon("abc"), "0원");
  });

  test("소수점은 반올림한다", () => {
    assert.equal(formatWon(2500000.6), "2,500,001원");
  });

  test("formatNumber 는 단위를 붙이지 않는다", () => {
    assert.equal(formatNumber(2500000), "2,500,000");
  });
});

describe("금액 입력 해석", () => {
  test("쉼표가 섞여 있어도 숫자로 읽는다", () => {
    assert.equal(parseWon("2,500,000"), 2500000);
    assert.equal(parseWon("2500000"), 2500000);
  });

  test("원 같은 글자가 붙어도 읽는다", () => {
    assert.equal(parseWon("2,500,000원"), 2500000);
  });

  test("빈 입력은 0", () => {
    assert.equal(parseWon(""), 0);
    assert.equal(parseWon("원"), 0);
  });
});

describe("단위 회귀 방지", () => {
  // 계약은 만원 단위(250), 지출은 원 단위(2500000)로 저장돼 있어서
  // 대시보드가 계약 금액을 "250원" 으로 표시하는 사고가 있었다.
  // 이제 DB 는 항상 원 단위다.
  test("250만원짜리 계약은 2,500,000원으로 보여야 한다", () => {
    const storedInWon = 2_500_000;
    assert.equal(formatWon(storedInWon), "2,500,000원");
    assert.notEqual(formatWon(storedInWon), "250원");
  });
});
