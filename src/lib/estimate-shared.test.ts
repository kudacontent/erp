import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEstimateNo, buildItemRows, computeItemAmounts, sumRows } from "./estimate-shared.ts";

function item(overrides: Partial<Parameters<typeof computeItemAmounts>[0]> = {}) {
  return {
    section: null,
    name: "품목",
    spec: null,
    unit: null,
    quantity: 1,
    unitPrice: 1000,
    taxType: "TAXABLE" as const,
    memo: null,
    ...overrides
  };
}

describe("computeItemAmounts", () => {
  it("공급가액은 수량 × 단가", () => {
    const { supply } = computeItemAmounts(item({ quantity: 3, unitPrice: 250000 }));
    assert.equal(supply, BigInt(750000));
  });

  it("과세 품목의 부가세는 공급가액의 10%", () => {
    const { vat } = computeItemAmounts(item({ quantity: 1, unitPrice: 2500000 }));
    assert.equal(vat, BigInt(250000));
  });

  it("영세율·면세 품목의 부가세는 0", () => {
    assert.equal(computeItemAmounts(item({ taxType: "ZERO_RATED" })).vat, BigInt(0));
    assert.equal(computeItemAmounts(item({ taxType: "EXEMPT" })).vat, BigInt(0));
  });

  it("소수 수량도 원 단위로 반올림된다", () => {
    // 0.5일 × 333,333원 = 166,666.5 → 166,667
    const { supply } = computeItemAmounts(item({ quantity: 0.5, unitPrice: 333333 }));
    assert.equal(supply, BigInt(166667));
  });

  it("수량이나 단가가 0이면 금액도 0", () => {
    assert.equal(computeItemAmounts(item({ quantity: 0 })).supply, BigInt(0));
    assert.equal(computeItemAmounts(item({ unitPrice: 0 })).vat, BigInt(0));
  });
});

describe("buildItemRows", () => {
  it("입력 순서를 sortOrder 로 굳힌다", () => {
    const rows = buildItemRows([item({ name: "가" }), item({ name: "나" }), item({ name: "다" })]);
    assert.deepEqual(rows.map((row) => [row.name, row.sortOrder]), [["가", 0], ["나", 1], ["다", 2]]);
  });

  it("빈 문자열 필드는 null 로 저장한다 (빈칸과 '입력 안 함'을 구분하지 않기 위해)", () => {
    const [row] = buildItemRows([item({ spec: "  ", unit: "", section: "   " })]);
    assert.equal(row.spec, null);
    assert.equal(row.unit, null);
    assert.equal(row.section, null);
  });
});

describe("sumRows", () => {
  it("합계 = 공급가액 합 + 부가세 합", () => {
    const rows = buildItemRows([
      item({ quantity: 2, unitPrice: 1000000 }),
      item({ quantity: 1, unitPrice: 500000, taxType: "EXEMPT" })
    ]);

    const totals = sumRows(rows);
    assert.equal(totals.supplyAmount, BigInt(2500000));
    assert.equal(totals.vatAmount, BigInt(200000)); // 면세 항목은 빠진다
    assert.equal(totals.totalAmount, BigInt(2700000));
  });

  it("품목이 없으면 0", () => {
    const totals = sumRows([]);
    assert.equal(totals.totalAmount, BigInt(0));
  });
});

describe("buildEstimateNo", () => {
  it("Q-YYYYMMDD-NN 형식", () => {
    assert.equal(buildEstimateNo(new Date(2026, 7, 31), 1), "Q-20260831-01");
  });

  it("월·일이 한 자리여도 두 자리로 채운다", () => {
    assert.equal(buildEstimateNo(new Date(2026, 0, 5), 12), "Q-20260105-12");
  });

  it("같은 날짜의 번호는 문자열 정렬로도 순서가 맞는다 (다음 번호 계산이 정렬에 기댄다)", () => {
    const numbers = [9, 10, 2].map((sequence) => buildEstimateNo(new Date(2026, 7, 31), sequence));
    assert.deepEqual([...numbers].sort(), ["Q-20260831-02", "Q-20260831-09", "Q-20260831-10"]);
  });
});
