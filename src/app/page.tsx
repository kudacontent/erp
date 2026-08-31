import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, ClipboardCheck, ReceiptText } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardData, type ActionItemRow } from "@/lib/dashboard-service";

// 대시보드는 항상 최신 집계를 보여줘야 한다
export const dynamic = "force-dynamic";

/**
 * 할 일 묶음 하나.
 *
 * "현황판"이 아니라 "지금 손대야 할 것"을 보여주는 게 목적이라
 * 항목마다 해당 화면으로 바로 갈 수 있게 한다.
 */
function ActionSection({
  title,
  description,
  icon,
  items,
  emptyTitle,
  emptyDescription,
  moreHref,
  moreLabel
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ActionItemRow[];
  emptyTitle: string;
  emptyDescription: string;
  moreHref: string;
  moreLabel: string;
}) {
  return (
    <section className="flex flex-col rounded-md border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info-bg text-marine">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-ink">
              {title}
              {items.length > 0 ? <span className="ml-2 text-sm font-medium text-steel">{items.length}건</span> : null}
            </h3>
            <p className="mt-1 text-sm text-steel">{description}</p>
          </div>
        </div>
        <Link href={moreHref} className="shrink-0 text-sm font-medium text-marine hover:underline">
          {moreLabel}
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-sunk"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-ink">{item.title}</p>
                    <StatusBadge status={item.tone} />
                  </div>
                  <p className="mt-1 truncate text-sm text-steel">{item.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{item.amount}</span>
                  <ArrowRight className="h-4 w-4 text-steel" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Home() {
  const data = await getDashboardData();

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 border-b border-line pb-5">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">오늘 할 일</h2>
        <p className="mt-2 text-sm text-steel">
          결재·입금·발행이 밀린 건을 먼저 보여줍니다. 항목을 누르면 해당 화면으로 바로 이동합니다.
        </p>
      </section>

      {!data.hasDatabase ? (
        <div className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-sm text-ink">
          데이터베이스에 연결하지 못했습니다. 아래 숫자는 비어 있는 상태입니다.
        </div>
      ) : null}

      {/* 요약 지표 — 전부 실제 집계값 */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-md border border-line bg-surface px-5 py-4 transition-colors hover:border-marine"
          >
            <p className="text-sm text-steel">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{stat.value}</p>
            <p className="mt-1 text-xs text-steel">{stat.sub}</p>
          </Link>
        ))}
        <div className="rounded-md border border-line bg-surface px-5 py-4 sm:col-span-2 xl:col-span-4">
          <p className="text-sm text-steel">이번 달 입금 완료 금액</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-success-fg">{data.monthRevenue}</p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionSection
          title="승인 대기 지출"
          description="결재를 기다리는 지출입니다."
          icon={<ClipboardCheck className="h-5 w-5" />}
          items={data.pendingApprovals}
          emptyTitle="결재할 지출이 없습니다"
          emptyDescription="승인 대기 상태인 지출이 올라오면 여기에 표시됩니다."
          moreHref="/expenses"
          moreLabel="지출 전체"
        />

        <ActionSection
          title="입금 지연"
          description="입금 예정일이 지났는데 아직 들어오지 않은 계약입니다."
          icon={<CircleDollarSign className="h-5 w-5" />}
          items={data.overdueContracts}
          emptyTitle="지연된 입금이 없습니다"
          emptyDescription="예정일이 지난 미입금 계약이 생기면 여기에 표시됩니다."
          moreHref="/contracts"
          moreLabel="계약 전체"
        />

        <ActionSection
          title="세금계산서 발행 대기"
          description="아직 세금계산서를 발행하지 않은 계약입니다."
          icon={<ReceiptText className="h-5 w-5" />}
          items={data.pendingInvoices}
          emptyTitle="발행할 세금계산서가 없습니다"
          emptyDescription="발행 대기 상태인 계약이 생기면 여기에 표시됩니다."
          moreHref="/tax-invoices"
          moreLabel="세금계산서"
        />

        <section className="flex flex-col rounded-md border border-line bg-surface">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info-bg text-marine">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-ink">
                  오늘 일정
                  {data.todaySchedule.length > 0 ? (
                    <span className="ml-2 text-sm font-medium text-steel">{data.todaySchedule.length}건</span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm text-steel">오늘을 지나가는 일정을 모두 포함합니다.</p>
              </div>
            </div>
            <Link href="/calendar" className="shrink-0 text-sm font-medium text-marine hover:underline">
              캘린더
            </Link>
          </div>

          {data.todaySchedule.length === 0 ? (
            <EmptyState title="오늘 일정이 없습니다" description="구글 캘린더를 연동하거나 일정을 추가해보세요." />
          ) : (
            <ul className="divide-y divide-line">
              {data.todaySchedule.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-marine">{item.time}</span>
                  <p className="min-w-0 flex-1 truncate font-medium text-ink">{item.title}</p>
                  <span className="shrink-0 text-xs text-steel">{item.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
