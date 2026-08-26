import { Camera, CheckCircle2, CreditCard, FilePlus2, ReceiptText } from "lucide-react";
import { FilterableExpensesTable } from "@/components/filterable-expenses-table";
import { expenseCategories, expenses, expenseStats, paymentMethods, receiptQueue } from "@/lib/expenses-data";

export default function ExpensesPage() {
  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">지출 및 매입</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <Camera className="h-4 w-4 text-marine" />
            영수증 스캔
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <FilePlus2 className="h-4 w-4" />
            지출 등록
          </button>
        </div>
      </section>

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
        <FilterableExpensesTable expenses={expenses} statusOptions={["전체", "승인 대기", "검토", "승인 완료", "지급 완료"]} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">영수증 OCR</h3>
            </div>
            <div className="space-y-3">
              {receiptQueue.map((item) => (
                <div key={item.file} className="rounded-md bg-paper px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">{item.vendor}</p>
                    <p className="shrink-0 text-sm font-bold text-marine">{item.amount}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-steel">
                    <span className="truncate">{item.file}</span>
                    <span>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">결제수단</h3>
            </div>
            <div className="space-y-3">
              {paymentMethods.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-paper px-3 py-3">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-sm font-bold text-marine">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">지출 구성</h3>
          <div className="space-y-4">
            {expenseCategories.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-steel">{item.amount}</span>
                </div>
                <div className="h-3 rounded-full bg-paper">
                  <div className="h-3 rounded-full bg-marine" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
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
              <p className="mt-1 text-xl font-bold text-ink">5건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">반려 없음</p>
              <p className="mt-1 text-xl font-bold text-ink">0건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">지급 예정</p>
              <p className="mt-1 text-xl font-bold text-marine">940만원</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
