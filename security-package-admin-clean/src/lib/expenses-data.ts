export const expenseStats = [
  { label: "이번 달 지출", value: "3,400만원", count: "28건" },
  { label: "승인 대기", value: "610만원", count: "5건" },
  { label: "OCR 검수", value: "7건", count: "영수증" },
  { label: "지급 예정", value: "940만원", count: "4건" }
];

export const expenses = [
  {
    id: "EXP-2026-0527",
    vendor: "블루텍 장비",
    category: "장비/정비",
    title: "ROV 추진기 부품 교체",
    amount: "420만원",
    method: "계좌이체",
    spentAt: "2026-05-27",
    approval: "승인 대기",
    receipt: "첨부"
  },
  {
    id: "EXP-2026-0526",
    vendor: "부산항 출장",
    category: "여비교통",
    title: "현장 이동 및 숙박",
    amount: "86만원",
    method: "법인카드",
    spentAt: "2026-05-26",
    approval: "검토",
    receipt: "OCR 검수"
  },
  {
    id: "EXP-2026-0525",
    vendor: "해양안전교육원",
    category: "교육비",
    title: "수중작업 안전 교육",
    amount: "120만원",
    method: "계좌이체",
    spentAt: "2026-05-25",
    approval: "승인 완료",
    receipt: "첨부"
  },
  {
    id: "EXP-2026-0524",
    vendor: "사무실 임대",
    category: "임대료",
    title: "5월 사무실 임대료",
    amount: "240만원",
    method: "계좌이체",
    spentAt: "2026-05-24",
    approval: "지급 완료",
    receipt: "첨부"
  }
];

export const expenseCategories = [
  { label: "장비/정비", value: 34, amount: "1,160만원" },
  { label: "인건비", value: 28, amount: "950만원" },
  { label: "여비교통", value: 18, amount: "610만원" },
  { label: "운영비", value: 20, amount: "680만원" }
];

export const receiptQueue = [
  { file: "receipt-0527-01.jpg", vendor: "블루텍 장비", amount: "420만원", status: "검수 필요" },
  { file: "receipt-0526-02.jpg", vendor: "부산역", amount: "18만원", status: "카테고리 확인" },
  { file: "receipt-0526-03.jpg", vendor: "호텔마린", amount: "42만원", status: "저장 가능" }
];

export const paymentMethods = [
  { label: "계좌이체", value: "1,820만원" },
  { label: "법인카드", value: "1,240만원" },
  { label: "현금영수증", value: "340만원" }
];
