import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContractLifecycle, currentStepLabel, type LifecycleSignals } from "./contract-lifecycle.ts";

function signals(overrides: Partial<LifecycleSignals> = {}): LifecycleSignals {
  return {
    estimateCount: 0,
    scheduleCount: 0,
    inspectionStatus: "NOT_STARTED",
    invoiceCount: 0,
    invoiceSent: false,
    taxInvoiceIssued: false,
    paymentStatus: "UNPAID",
    canceled: false,
    ...overrides
  };
}

const states = (s: LifecycleSignals) => buildContractLifecycle(s).map((step) => step.state);

describe("buildContractLifecycle", () => {
  it("여섯 단계를 업무 순서대로 돌려준다", () => {
    assert.deepEqual(
      buildContractLifecycle(signals()).map((step) => step.label),
      ["견적서", "스케줄", "검사", "인보이스", "세금계산서", "입금"]
    );
  });

  it("아무것도 없으면 첫 단계가 지금 할 일", () => {
    assert.deepEqual(states(signals()), ["active", "waiting", "waiting", "waiting", "waiting", "waiting"]);
  });

  it("견적서가 있으면 다음은 스케줄", () => {
    assert.deepEqual(
      states(signals({ estimateCount: 1 })),
      ["done", "active", "waiting", "waiting", "waiting", "waiting"]
    );
  });

  it("검사 작업까지 끝나면 인보이스 차례", () => {
    const s = signals({ estimateCount: 1, scheduleCount: 2, inspectionStatus: "DONE" });
    assert.deepEqual(states(s), ["done", "done", "done", "active", "waiting", "waiting"]);
    assert.equal(currentStepLabel(buildContractLifecycle(s)), "인보이스");
  });

  it("전부 끝나면 지금 할 일이 없다", () => {
    const s = signals({
      estimateCount: 1, scheduleCount: 1, inspectionStatus: "DONE",
      invoiceCount: 1, invoiceSent: true, taxInvoiceIssued: true, paymentStatus: "PAID"
    });
    assert.deepEqual(states(s), ["done", "done", "done", "done", "done", "done"]);
    assert.equal(currentStepLabel(buildContractLifecycle(s)), null);
  });
});

describe("손이 필요한 단계", () => {
  it("보류된 검사는 뒤 단계가 진행돼도 계속 드러난다", () => {
    // 멈춰 있는 건은 잊히기 쉬우므로 청구가 나갔더라도 화면에서 숨기지 않는다
    const s = signals({ estimateCount: 1, scheduleCount: 1, inspectionStatus: "ON_HOLD", invoiceSent: true });
    assert.equal(buildContractLifecycle(s)[2].state, "attention");
    assert.equal(currentStepLabel(buildContractLifecycle(s)), "검사");
  });

  it("진행 중인 검사는 아직 끝난 것이 아니다", () => {
    const s = signals({ estimateCount: 1, scheduleCount: 1, inspectionStatus: "IN_PROGRESS" });
    assert.equal(buildContractLifecycle(s)[2].state, "active");
    assert.equal(buildContractLifecycle(s)[2].detail, "검사 진행 중");
  });

  it("부분 입금은 마감이 아니라 확인이 필요한 상태", () => {
    const s = signals({
      estimateCount: 1, scheduleCount: 1, inspectionStatus: "DONE",
      invoiceSent: true, taxInvoiceIssued: true, paymentStatus: "PARTIAL"
    });
    assert.equal(buildContractLifecycle(s)[5].state, "attention");
  });
});

describe("건너뛴 단계", () => {
  it("견적 없이 들어온 일감도 진행된 만큼 done 으로 본다", () => {
    // 견적서 없이 바로 계약된 건이 '1단계 견적서'에 머물러 있으면 화면이 거짓말을 한다
    const s = signals({ taxInvoiceIssued: true });
    assert.deepEqual(states(s), ["done", "done", "done", "done", "done", "active"]);
  });

  it("입금까지 끝났으면 앞 단계 기록이 없어도 전부 done", () => {
    assert.deepEqual(
      states(signals({ paymentStatus: "PAID" })),
      ["done", "done", "done", "done", "done", "done"]
    );
  });
});

describe("인보이스", () => {
  it("작성만 하고 발송 전이면 아직 끝난 게 아니다", () => {
    const s = signals({ estimateCount: 1, scheduleCount: 1, inspectionStatus: "DONE", invoiceCount: 1 });
    assert.equal(buildContractLifecycle(s)[3].state, "active");
    assert.equal(buildContractLifecycle(s)[3].detail, "작성됨 — 발송 전");
  });
});

describe("취소된 계약", () => {
  it("어느 단계도 진행 중으로 보이지 않는다", () => {
    const s = signals({ estimateCount: 1, canceled: true });
    assert.ok(states(s).every((state) => state === "waiting"));
    assert.equal(currentStepLabel(buildContractLifecycle(s)), null);
  });
});
