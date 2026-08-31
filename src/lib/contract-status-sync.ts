/**
 * 계약 상태 자동 전파.
 *
 * 그동안은 세금계산서를 발행해도 계약 화면의 "세금계산서" 칸이 '발행 대기' 그대로였다.
 * 담당자가 계약에 들어가 상태를 손으로 한 번 더 눌러야 했고, 대부분 잊어버렸다.
 * 그래서 대시보드의 미수금·발행 대기 숫자가 실제와 달랐다.
 *
 * 여기서는 "무엇이 일어났을 때 계약이 어떤 상태가 되는지" 만 결정한다.
 * DB 접근이 없는 순수 함수라 테스트로 규칙을 못박아 둘 수 있다.
 */

export type ContractStatusValue =
  | "DRAFT"
  | "SIGNED"
  | "BILLING_PENDING"
  | "BILLING_DONE"
  | "PAYMENT_PENDING"
  | "PARTIAL_PAYMENT"
  | "PAID"
  | "CLOSED"
  | "CANCELED";

export type BillingStatusValue = "PENDING" | "ISSUED" | "CANCELED";
export type PaymentStatusValue = "UNPAID" | "PARTIAL" | "PAID";

export type ContractStatusSnapshot = {
  contractStatus: ContractStatusValue;
  billingStatus: BillingStatusValue;
  paymentStatus: PaymentStatusValue;
};

export type ContractStatusPatch = Partial<{
  contractStatus: ContractStatusValue;
  billingStatus: BillingStatusValue;
  paymentStatus: PaymentStatusValue;
  closedAt: Date;
}>;

/** 진행 순서. 뒤로 되돌리지 않기 위해 자리값을 매겨 둔다 */
const STAGE: Record<ContractStatusValue, number> = {
  DRAFT: 0,
  SIGNED: 1,
  BILLING_PENDING: 2,
  BILLING_DONE: 3,
  PAYMENT_PENDING: 4,
  PARTIAL_PAYMENT: 5,
  PAID: 6,
  CLOSED: 7,
  CANCELED: -1
};

/** 취소·종료된 계약은 자동 전파의 대상이 아니다 */
function isFrozen(snapshot: ContractStatusSnapshot) {
  return snapshot.contractStatus === "CANCELED" || snapshot.contractStatus === "CLOSED";
}

/** 이미 더 진행된 계약을 앞 단계로 되돌리지 않는다 */
function forward(current: ContractStatusValue, target: ContractStatusValue) {
  return STAGE[target] > STAGE[current] ? target : current;
}

/**
 * 세금계산서가 실제로 발행됐을 때.
 * 바꿀 것이 없으면 null 을 돌려준다 (불필요한 UPDATE 와 감사로그를 남기지 않기 위해).
 */
export function afterInvoiceIssued(snapshot: ContractStatusSnapshot): ContractStatusPatch | null {
  if (isFrozen(snapshot)) {
    return null;
  }

  const patch: ContractStatusPatch = {};

  if (snapshot.billingStatus !== "ISSUED") {
    patch.billingStatus = "ISSUED";
  }

  const nextStatus = forward(snapshot.contractStatus, "BILLING_DONE");

  if (nextStatus !== snapshot.contractStatus) {
    patch.contractStatus = nextStatus;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * 세금계산서 발행이 취소되거나 실패했을 때.
 * 계약을 '발행 대기' 로 되돌려 다시 처리 대상이 되게 한다.
 * 이미 입금까지 끝난 계약은 건드리지 않는다 (입금이 사실이라면 발행도 어딘가에서 이루어진 것이다).
 */
export function afterInvoiceCanceled(snapshot: ContractStatusSnapshot): ContractStatusPatch | null {
  if (isFrozen(snapshot) || snapshot.paymentStatus === "PAID") {
    return null;
  }

  if (snapshot.billingStatus !== "ISSUED") {
    return null;
  }

  return { billingStatus: "PENDING", contractStatus: "BILLING_PENDING" };
}

/**
 * 입금이 확인됐을 때.
 * 전액 입금이면 계약을 마감하고 closedAt 을 찍는다.
 */
export function afterPayment(
  snapshot: ContractStatusSnapshot,
  payment: PaymentStatusValue,
  now: Date = new Date()
): ContractStatusPatch | null {
  if (isFrozen(snapshot)) {
    return null;
  }

  if (snapshot.paymentStatus === payment) {
    return null;
  }

  if (payment === "PAID") {
    return { paymentStatus: "PAID", contractStatus: "PAID", closedAt: now };
  }

  if (payment === "PARTIAL") {
    return { paymentStatus: "PARTIAL", contractStatus: forward(snapshot.contractStatus, "PARTIAL_PAYMENT") };
  }

  return { paymentStatus: "UNPAID" };
}
