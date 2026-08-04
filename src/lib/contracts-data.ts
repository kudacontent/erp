export const contractStats = [
  { label: "이번 달 계약", value: "0건", amount: "0원" },
  { label: "입금 대기", value: "0건", amount: "0원" },
  { label: "발행 대기", value: "0건", amount: "0원" },
  { label: "정산 완료", value: "0건", amount: "0원" }
];

export type ContractRecord = {
  slug: string;
  id: string;
  client: string;
  title: string;
  supply: string;
  vat: string;
  total: string;
  billing: string;
  payment: string;
  due: string;
  status: string;
};

export const contracts: ContractRecord[] = [];

export function getContractBySlug(_slug: string) {
  return undefined;
}

export const contractFiles: Array<{ name: string; type: string; date: string }> = [];

export const contractDocuments = [
  {
    title: "견적서",
    description: "공급가액, 부가세, 작업 범위 기준으로 견적서를 생성합니다.",
    status: "작성 가능",
    action: "견적서 생성",
    href: "quote"
  },
  {
    title: "계약서",
    description: "거래처, 계약금액, 정산 조건, 작업 범위를 반영합니다.",
    status: "검토 필요",
    action: "계약서 작성",
    href: "contract"
  },
  {
    title: "지출결의서",
    description: "계약과 연결된 장비비, 출장비, 외주비 지출 결의를 작성합니다.",
    status: "대기",
    action: "지출결의서 작성",
    href: "expense-resolution"
  },
  {
    title: "세금계산서 발행 요청서",
    description: "공급가액과 부가세를 기준으로 발행 요청 정보를 정리합니다.",
    status: "발행 대기",
    action: "요청서 작성",
    href: "tax-invoice-request"
  }
];

export const contractLifecycleSteps = [
  { key: "client", label: "업체 선택", detail: "거래처와 담당자 확인" },
  { key: "quote", label: "견적", detail: "견적서 작성/승인" },
  { key: "contract", label: "계약", detail: "계약서 확정" },
  { key: "operation", label: "진행", detail: "작업 수행 및 기록" },
  { key: "complete", label: "완료", detail: "결과 검수" },
  { key: "invoice", label: "계산서", detail: "세금계산서 발행" },
  { key: "payment", label: "정산 완료", detail: "입금 확인" }
];

export function getContractLifecycle(contract: ContractRecord) {
  const activeIndex = contract.payment === "입금 완료" ? 6 : contract.billing === "발행 완료" ? 5 : contract.status === "완료" ? 4 : 3;

  return contractLifecycleSteps.map((step, index) => ({
    ...step,
    state: index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting"
  }));
}

export function getContractNextActions(contract: ContractRecord) {
  if (contract.payment === "입금 완료") {
    return [
      { label: "정산 완료 보고서 생성", href: `/contracts/${contract.slug}`, tone: "primary" },
      { label: "첨부 문서 최종 보관", href: `/contracts/${contract.slug}`, tone: "default" }
    ];
  }

  if (contract.billing === "발행 완료") {
    return [
      { label: "입금 확인 처리", href: `/contracts/${contract.slug}`, tone: "primary" },
      { label: "정산 회의록 연결", href: `/meetings`, tone: "default" }
    ];
  }

  if (contract.status === "완료") {
    return [
      { label: "세금계산서 발행", href: `/contracts/${contract.slug}/documents/tax-invoice-request`, tone: "primary" },
      { label: "결과 보고 첨부", href: `/contracts/${contract.slug}`, tone: "default" }
    ];
  }

  return [
    { label: "견적서 확인", href: `/contracts/${contract.slug}/documents/quote`, tone: "primary" },
    { label: "계약서 작성", href: `/contracts/${contract.slug}/documents/contract`, tone: "default" },
    { label: "지출결의서 작성", href: `/contracts/${contract.slug}/documents/expense-resolution`, tone: "default" }
  ];
}

export const documentTemplates = {
  quote: {
    title: "견적서",
    heading: "견적서 작성",
    fields: ["견적명", "작업 범위", "공급가액", "부가세", "유효기간", "특이사항"]
  },
  contract: {
    title: "계약서",
    heading: "계약서 작성",
    fields: ["계약명", "계약 목적", "작업 범위", "계약금액", "정산 조건", "계약 기간"]
  },
  "expense-resolution": {
    title: "지출결의서",
    heading: "지출결의서 작성",
    fields: ["지출 목적", "지출 항목", "공급업체", "금액", "결제수단", "증빙"]
  },
  "tax-invoice-request": {
    title: "세금계산서 발행 요청서",
    heading: "세금계산서 발행 요청서",
    fields: ["공급받는 자", "공급가액", "부가세", "작성일", "품목", "비고"]
  }
};

export const contractActivity: Array<{ date: string; title: string; type: string }> = [];
export const billingQueue: Array<{ client: string; title: string; amount: string; due: string }> = [];
export const paymentRisks: Array<{ client: string; amount: string; delay: string }> = [];
export const settlementSteps: Array<{ label: string; value: number }> = [];
