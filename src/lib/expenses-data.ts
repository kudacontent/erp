export const expenseStats = [
  { label: "이번 달 지출", value: "0원", count: "0건" },
  { label: "승인 대기", value: "0원", count: "0건" },
  { label: "OCR 검수", value: "0건", count: "영수증" },
  { label: "지급 예정", value: "0원", count: "0건" }
];

export type ExpenseListItem = {
  id: string;
  vendor: string;
  category: string;
  title: string;
  amount: string;
  method: string;
  spentAt: string;
  approval: string;
  receipt: string;
};

export const expenses: ExpenseListItem[] = [];
export const expenseCategories: Array<{ label: string; value: number; amount: string }> = [];
export const receiptQueue: Array<{ file: string; vendor: string; amount: string; status: string }> = [];
export const paymentMethods: Array<{ label: string; value: string }> = [];
