import { AlertTriangle, FileCheck2, FilePlus2, FileSignature, ReceiptText } from "lucide-react";
import Link from "next/link";
import { FilterableContractsTable } from "@/components/filterable-contracts-table";
import { billingQueue, contractStats, paymentRisks, settlementSteps } from "@/lib/contracts-data";
import { getContractsForList } from "@/lib/contracts-service";

export default async function ContractsPage() {
  const contracts = await getContractsForList();

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">계약 및 매출</h2>
        </div>
        <Link href="/contracts/new" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <FilePlus2 className="h-4 w-4" />
          계약 등록
        </Link>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {contractStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.amount}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <FilterableContractsTable contracts={contracts} statusOptions={["전체", "발행 대기", "입금 대기", "지연", "완료"]} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">발행 대기</h3>
            </div>
            <div className="space-y-3">
              {billingQueue.map((item) => (
                <div key={`${item.client}-${item.title}`} className="rounded-md bg-paper px-3 py-3">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-steel">
                    <span>{item.client}</span>
                    <span className="font-bold text-marine">{item.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">입금 확인</h3>
            </div>
            <div className="space-y-3">
              {paymentRisks.map((item) => (
                <div key={item.client} className="rounded-md bg-paper px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">{item.client}</p>
                    <p className="shrink-0 text-sm font-bold text-marine">{item.delay}</p>
                  </div>
                  <p className="mt-1 text-sm text-steel">{item.amount}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">정산 흐름</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {settlementSteps.map((step) => (
              <div key={step.label} className="rounded-md bg-paper p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{step.label}</p>
                  <p className="text-sm font-bold text-marine">{step.value}%</p>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-marine" style={{ width: `${step.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">이번 달 요약</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">공급가액</p>
              <p className="mt-1 text-xl font-bold text-ink">5,555만원</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">부가세</p>
              <p className="mt-1 text-xl font-bold text-ink">555만원</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">합계</p>
              <p className="mt-1 text-xl font-bold text-marine">6,110만원</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">문서 처리</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">견적서 작성</p>
              <p className="mt-1 text-xl font-bold text-ink">3건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">계약서 검토</p>
              <p className="mt-1 text-xl font-bold text-ink">2건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">지출결의서</p>
              <p className="mt-1 text-xl font-bold text-marine">4건</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
