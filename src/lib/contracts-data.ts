
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

export const contractFiles: Array<{ name: string; type: string; date: string }> = [];

/**
 * 계약 상세에서 이어서 할 수 있는 일.
 *
 * 이전에는 계약서·지출결의서·세금계산서 요청서가 각각 별도 화면으로 있었는데
 * 입력칸에 value/onChange 도 저장 버튼도 없는 껍데기였다. 타이핑해도 사라졌다.
 * 실제로 동작하는 화면으로만 연결한다.
 */
/**
 * 계약에서 이어서 열 수 있는 화면들.
 *
 * slug 를 받는 이유: 세금계산서 화면은 ?contractId= 로 넘어가면
 * 거래처와 계약 품목을 미리 채워 준다. 계약에서 출발했다는 사실을 잃지 않게 한다.
 */
export function getContractDocuments(slug: string) {
  return contractDocuments.map((document) =>
    document.title === "세금계산서"
      ? { ...document, href: `/tax-invoices?contractId=${slug}` }
      : document
  );
}

export const contractDocuments = [
  {
    title: "견적서",
    description: "품목과 금액을 넣어 견적서를 작성하고 PDF로 출력합니다.",
    action: "견적서 열기",
    href: "/documents/estimate"
  },
  {
    title: "인보이스",
    description: "청구 항목과 지급 정보를 담은 인보이스를 작성합니다.",
    action: "인보이스 열기",
    href: "/documents/invoice"
  },
  {
    title: "세금계산서",
    description: "공급가액과 부가세를 검수한 뒤 바로빌로 발행을 요청합니다.",
    action: "세금계산서 발행",
    href: "/tax-invoices"
  },
  {
    title: "지출 등록",
    description: "이 계약과 관련된 장비비·출장비·외주비를 지출로 등록합니다.",
    action: "지출 화면으로",
    href: "/expenses"
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
      { label: "계약 이력 확인", href: `/contracts/${contract.slug}`, tone: "primary" },
      { label: "관련 지출 정리", href: "/expenses", tone: "default" }
    ];
  }

  if (contract.billing === "발행 완료") {
    return [
      { label: "발행 내역 확인", href: "/tax-invoices", tone: "primary" },
      { label: "정산 회의록 연결", href: "/meetings", tone: "default" }
    ];
  }

  // 세금계산서 화면은 contractId 를 받으면 거래처와 계약 품목을 미리 채운다.
  // 계약에서 넘어갈 때는 항상 이 주소로 보낸다 — 손으로 다시 입력하지 않게.
  return [
    { label: "세금계산서 발행", href: `/tax-invoices?contractId=${contract.slug}`, tone: "primary" },
    { label: "견적서 목록", href: "/documents/estimate", tone: "default" },
    { label: "관련 지출 등록", href: "/expenses", tone: "default" }
  ];
}

export const contractActivity: Array<{ date: string; title: string; type: string }> = [];
