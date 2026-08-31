import { Camera, CheckCircle2, CreditCard } from "lucide-react";
import { FilterableExpensesTable } from "@/components/filterable-expenses-table";
import { ReceiptOcrForm } from "@/components/receipt-ocr-form";
import { prisma } from "@/lib/prisma";
import { formatWon } from "@/lib/money";

export const dynamic = "force-dynamic";

const approvalLabels = {
  DRAFT: "검토",
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
  PAID: "지급 완료"
} as const;

function parseMerchantName(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const data = JSON.parse(value) as { merchantName?: unknown };
    return typeof data.merchantName === "string" ? data.merchantName.trim() : "";
  } catch {
    return "";
  }
}

export default async function ExpensesPage() {
  const records = await prisma.expense.findMany({
    include: { client: true },
    orderBy: { spentAt: "desc" },
    take: 200
  });
  const expenseRows = records.map((expense) => {
    const merchantName = parseMerchantName(expense.geminiAnalysis);
    const vendor = merchantName || expense.client?.name || "거래처 미지정";

    return {
      expenseId: expense.id,
      id: expense.id.slice(0, 8),
      vendor,
      category: expense.expenseCategory,
      title: merchantName || expense.expenseCategory,
      amount: formatWon(expense.totalAmount),
      method: expense.paymentMethod,
      spentAt: expense.spentAt.toLocaleDateString("ko-KR"),
      approval: approvalLabels[expense.approvalStatus],
      receipt: expense.receiptImageUrl ? "영수증 첨부" : "증빙 없음"
    };
  });

  const now = new Date();
  const thisMonth = records.filter((expense) => (
    expense.spentAt.getFullYear() === now.getFullYear() && expense.spentAt.getMonth() === now.getMonth()
  ));
  const monthTotal = thisMonth.reduce((sum, expense) => sum + Number(expense.totalAmount), 0);
  const pendingCount = records.filter((expense) => expense.approvalStatus === "REQUESTED").length;
  const rejectedCount = records.filter((expense) => expense.approvalStatus === "REJECTED").length;
  const pendingPaymentTotal = records
    .filter((expense) => expense.approvalStatus === "APPROVED")
    .reduce((sum, expense) => sum + Number(expense.totalAmount), 0);
  const receiptCount = records.filter((expense) => Boolean(expense.receiptImageUrl)).length;
  const categoryTotals = new Map<string, number>();
  const paymentTotals = new Map<string, number>();

  for (const expense of records) {
    categoryTotals.set(expense.expenseCategory, (categoryTotals.get(expense.expenseCategory) ?? 0) + Number(expense.totalAmount));
    paymentTotals.set(expense.paymentMethod, (paymentTotals.get(expense.paymentMethod) ?? 0) + 1);
  }

  const largestCategory = Math.max(...categoryTotals.values(), 0);
  const expenseCategories = [...categoryTotals.entries()].slice(0, 5).map(([label, total]) => ({
    label,
    value: largestCategory ? Math.max(5, Math.round((total / largestCategory) * 100)) : 0,
    amount: formatWon(total)
  }));
  const paymentMethods = [...paymentTotals.entries()].map(([label, count]) => ({ label, value: `${count}건` }));
  const expenseStats = [
    { label: "이번 달 지출", value: formatWon(monthTotal), count: `${thisMonth.length}건` },
    { label: "증빙 등록", value: `${receiptCount}건`, count: "영수증" },
    { label: "승인 대기", value: `${pendingCount}건`, count: "결재 필요" },
    { label: "전체 지출", value: `${records.length}건`, count: "운영 데이터" }
  ];

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">지출 및 매입</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#receipt-ocr" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <Camera className="h-4 w-4" />
            영수증으로 지출 만들기
          </a>
        </div>
      </section>

      <div id="receipt-ocr" className="mb-6">
        <ReceiptOcrForm />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {expenseStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.count}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <FilterableExpensesTable expenses={expenseRows} statusOptions={["전체", "승인 대기", "검토", "승인 완료", "지급 완료"]} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">결제수단</h3>
            </div>
            <div className="space-y-3">
              {paymentMethods.length ? paymentMethods.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-paper px-3 py-3">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-sm font-bold text-marine">{item.value}</p>
                </div>
              )) : <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">등록된 결제수단이 없습니다.</p>}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">지출 구성</h3>
          <div className="space-y-4">
            {expenseCategories.length ? expenseCategories.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-steel">{item.amount}</span>
                </div>
                <div className="h-3 rounded-full bg-paper">
                  <div className="h-3 rounded-full bg-marine" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            )) : <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">등록된 지출이 없습니다.</p>}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">승인 요약</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">승인 대기</p>
              <p className="mt-1 text-xl font-bold text-ink">{pendingCount}건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">반려</p>
              <p className="mt-1 text-xl font-bold text-ink">{rejectedCount}건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">지급 예정</p>
              <p className="mt-1 text-xl font-bold text-marine">{formatWon(pendingPaymentTotal)}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
