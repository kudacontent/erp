import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  afterInvoiceCanceled,
  afterInvoiceIssued,
  afterPayment,
  type ContractStatusSnapshot
} from "./contract-status-sync.ts";

function snapshot(overrides: Partial<ContractStatusSnapshot> = {}): ContractStatusSnapshot {
  return {
    contractStatus: "SIGNED",
    billingStatus: "PENDING",
    paymentStatus: "UNPAID",
    ...overrides
  };
}

describe("afterInvoiceIssued", () => {
  it("발행 대기 계약은 발행 완료 · 청구 완료가 된다", () => {
    assert.deepEqual(afterInvoiceIssued(snapshot()), {
      billingStatus: "ISSUED",
      contractStatus: "BILLING_DONE"
    });
  });

  it("이미 반영된 계약은 건드리지 않는다 (불필요한 UPDATE 방지)", () => {
    assert.equal(
      afterInvoiceIssued(snapshot({ billingStatus: "ISSUED", contractStatus: "BILLING_DONE" })),
      null
    );
  });

  it("입금까지 끝난 계약을 청구 단계로 되돌리지 않는다", () => {
    const patch = afterInvoiceIssued(snapshot({ contractStatus: "PAID", paymentStatus: "PAID", billingStatus: "PENDING" }));
    assert.deepEqual(patch, { billingStatus: "ISSUED" });
  });

  it("취소된 계약은 아무것도 바꾸지 않는다", () => {
    assert.equal(afterInvoiceIssued(snapshot({ contractStatus: "CANCELED" })), null);
  });

  it("마감된 계약도 그대로 둔다", () => {
    assert.equal(afterInvoiceIssued(snapshot({ contractStatus: "CLOSED" })), null);
  });
});

describe("afterInvoiceCanceled", () => {
  it("발행 완료였다면 발행 대기로 되돌린다", () => {
    assert.deepEqual(afterInvoiceCanceled(snapshot({ billingStatus: "ISSUED", contractStatus: "BILLING_DONE" })), {
      billingStatus: "PENDING",
      contractStatus: "BILLING_PENDING"
    });
  });

  it("발행된 적이 없으면 바꿀 것이 없다", () => {
    assert.equal(afterInvoiceCanceled(snapshot()), null);
  });

  it("입금이 끝난 계약은 되돌리지 않는다", () => {
    assert.equal(
      afterInvoiceCanceled(snapshot({ billingStatus: "ISSUED", paymentStatus: "PAID", contractStatus: "PAID" })),
      null
    );
  });
});

describe("afterPayment", () => {
  const now = new Date("2026-08-31T00:00:00.000Z");

  it("전액 입금이면 계약을 마감하고 날짜를 찍는다", () => {
    assert.deepEqual(afterPayment(snapshot({ billingStatus: "ISSUED", contractStatus: "BILLING_DONE" }), "PAID", now), {
      paymentStatus: "PAID",
      contractStatus: "PAID",
      closedAt: now
    });
  });

  it("부분 입금이면 부분 입금 단계로 옮긴다", () => {
    assert.deepEqual(afterPayment(snapshot({ contractStatus: "BILLING_DONE" }), "PARTIAL", now), {
      paymentStatus: "PARTIAL",
      contractStatus: "PARTIAL_PAYMENT"
    });
  });

  it("이미 같은 입금 상태면 바꾸지 않는다", () => {
    assert.equal(afterPayment(snapshot({ paymentStatus: "PAID", contractStatus: "PAID" }), "PAID", now), null);
  });

  it("취소된 계약에는 입금 상태를 반영하지 않는다", () => {
    assert.equal(afterPayment(snapshot({ contractStatus: "CANCELED" }), "PAID", now), null);
  });
});
