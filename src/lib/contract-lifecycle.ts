/**
 * 계약 진행 단계.
 *
 * 우리 업무는 이 순서로 흐른다.
 *   견적서 → 스케줄 → 검사 → 인보이스 → 세금계산서 → 입금
 *
 * 이전 화면은 "업체 선택 → 견적 → 계약 → 진행 → 완료 → 계산서 → 정산" 7단계를 보여줬는데,
 * 현재 위치를 이렇게 계산했다.
 *
 *   const activeIndex = payment === "입금 완료" ? 6 : billing === "발행 완료" ? 5 : status === "완료" ? 4 : 3;
 *
 * 앞의 세 단계는 어떤 계약에서도 활성화되지 않았다. 보기엔 그럴듯하지만 정보가 없는 장식이었다.
 * 이제 각 단계마다 "무엇이 있으면 끝난 것인가" 를 실제 데이터로 판정한다.
 *
 * 이 파일에는 DB 접근이 없다. 판정 규칙만 두고 테스트로 못박는다.
 */

export type InspectionStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "ON_HOLD";
export type PaymentStatusValue = "UNPAID" | "PARTIAL" | "PAID";

/** 각 단계의 완료 여부를 판정하는 데 필요한 사실들 */
export type LifecycleSignals = {
  /** 이 계약과 연결된 견적서 수 */
  estimateCount: number;
  /** 캘린더에 잡힌 이 계약의 일정 수 */
  scheduleCount: number;
  inspectionStatus: InspectionStatusValue;
  /** 발행한 인보이스 수 */
  invoiceCount: number;
  /** 거래처에 보낸 인보이스가 있는가 */
  invoiceSent: boolean;
  /** 세금계산서가 실제로 발행됐는가 */
  taxInvoiceIssued: boolean;
  paymentStatus: PaymentStatusValue;
  canceled: boolean;
};

export type StepState =
  /** 끝난 단계 */
  | "done"
  /** 지금 해야 할 단계 */
  | "active"
  /** 아직 차례가 아닌 단계 */
  | "waiting"
  /** 손이 필요한 단계 (검사 불합격 등) */
  | "attention";

export type LifecycleStep = {
  key: string;
  label: string;
  detail: string;
  state: StepState;
};

type StepDefinition = {
  key: string;
  label: string;
  /** 이 단계가 끝났는지 */
  isDone: (signals: LifecycleSignals) => boolean;
  /** 손이 필요한 상태인지 (있으면 done 보다 우선한다) */
  needsAttention?: (signals: LifecycleSignals) => boolean;
  /** 상태에 따라 다른 설명을 보여준다 */
  detail: (signals: LifecycleSignals) => string;
};

const STEPS: StepDefinition[] = [
  {
    key: "estimate",
    label: "견적서",
    isDone: (s) => s.estimateCount > 0,
    detail: (s) => (s.estimateCount > 0 ? `견적서 ${s.estimateCount}건` : "견적서 작성")
  },
  {
    key: "schedule",
    label: "스케줄",
    isDone: (s) => s.scheduleCount > 0,
    detail: (s) => (s.scheduleCount > 0 ? `일정 ${s.scheduleCount}건` : "작업 일정 등록")
  },
  {
    key: "inspection",
    label: "검사",
    // 검사는 우리가 수행하는 용역이다. 이 작업이 끝나야 청구할 수 있다.
    isDone: (s) => s.inspectionStatus === "DONE",
    // 멈춰 있는 건은 잊히기 쉬워서 눈에 띄게 둔다
    needsAttention: (s) => s.inspectionStatus === "ON_HOLD",
    detail: (s) => {
      if (s.inspectionStatus === "DONE") return "검사 완료";
      if (s.inspectionStatus === "IN_PROGRESS") return "검사 진행 중";
      if (s.inspectionStatus === "ON_HOLD") return "보류 중";
      return "검사 수행";
    }
  },
  {
    key: "invoice",
    label: "인보이스",
    // 만들어만 두고 안 보냈으면 아직 끝난 게 아니다
    isDone: (s) => s.invoiceSent,
    detail: (s) => {
      if (s.invoiceSent) return `인보이스 ${s.invoiceCount}건 발송`;
      if (s.invoiceCount > 0) return "작성됨 — 발송 전";
      return "청구서 작성";
    }
  },
  {
    key: "taxInvoice",
    label: "세금계산서",
    isDone: (s) => s.taxInvoiceIssued,
    detail: (s) => (s.taxInvoiceIssued ? "발행 완료" : "발행 요청")
  },
  {
    key: "payment",
    label: "입금",
    isDone: (s) => s.paymentStatus === "PAID",
    needsAttention: (s) => s.paymentStatus === "PARTIAL",
    detail: (s) => {
      if (s.paymentStatus === "PAID") return "입금 완료";
      if (s.paymentStatus === "PARTIAL") return "부분 입금";
      return "입금 확인";
    }
  }
];

/**
 * 각 단계의 상태를 계산한다.
 *
 * 규칙:
 *   - 끝난 단계는 done
 *   - 끝나지 않은 것 중 첫 번째가 active (지금 할 일)
 *   - 나머지는 waiting
 *   - 손이 필요한 단계는 순서와 무관하게 attention (검사 불합격을 지나쳐 진행하면 안 되므로)
 *
 * 앞 단계를 건너뛴 계약도 있다. 견적 없이 바로 들어온 일감이 그렇다.
 * 그런 경우 뒤 단계가 끝나 있으면 앞 단계도 done 으로 본다 —
 * 실제로 일이 진행됐는데 "견적서 없음" 때문에 1단계에 머물러 있으면 화면이 거짓말을 한다.
 */
export function buildContractLifecycle(signals: LifecycleSignals): LifecycleStep[] {
  const done = STEPS.map((step) => step.isDone(signals));

  // 뒤 단계가 끝났으면 앞 단계도 지나간 것으로 본다
  for (let i = done.length - 2; i >= 0; i -= 1) {
    if (done[i + 1]) done[i] = true;
  }

  const activeIndex = done.indexOf(false);

  return STEPS.map((step, index) => {
    const attention = step.needsAttention?.(signals) ?? false;

    let state: StepState;

    if (signals.canceled) {
      state = "waiting";
    } else if (attention) {
      state = "attention";
    } else if (done[index]) {
      state = "done";
    } else if (index === activeIndex) {
      state = "active";
    } else {
      state = "waiting";
    }

    return { key: step.key, label: step.label, detail: step.detail(signals), state };
  });
}

/** 지금 해야 할 단계의 라벨. 없으면 null (전부 끝났거나 취소됨) */
export function currentStepLabel(steps: LifecycleStep[]) {
  return steps.find((step) => step.state === "attention" || step.state === "active")?.label ?? null;
}
