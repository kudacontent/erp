import { Bot, ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarDays,
  dashboardSchedule,
  dashboardTaskRows,
  erpFlowGroups,
  heroStats,
  operationOverview
} from "@/lib/dashboard-data";

function statusClass(status: string) {
  if (status === "진행") {
    return "bg-[#e8f5fb] text-marine";
  }

  if (status === "확인") {
    return "bg-[#ecfeff] text-[#075985]";
  }

  return "bg-paper text-steel";
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#eef6fb]">
      <section className="relative bg-[linear-gradient(135deg,#1d76e8_0%,#22a5e9_58%,#7fd5f7_100%)] px-5 pb-10 pt-7 sm:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-white/80">KUDALABS ERP</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-white">전체 현황</h2>
          </div>
          <div className="rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/20">
            2026년 6월 9일 · 운영 기준
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {heroStats.map((stat) => (
            <div key={stat.label} className="min-h-32 rounded-md bg-white p-5 shadow-[0_16px_40px_rgba(9,34,53,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-steel">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-ink">{stat.value}</p>
                  <p className="mt-2 text-sm font-bold text-marine">{stat.sub}</p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#eef9fd] text-marine">
                  <stat.icon className="h-7 w-7" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-stretch gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">업무 현황</h3>
              <p className="text-sm font-medium text-steel">메뉴별 처리 상태</p>
            </div>
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {operationOverview.map((item) => (
                <div key={item.title} className="h-full rounded-md border border-line bg-[#f8fbfd] p-4">
                  <p className="mb-4 font-bold text-ink">{item.title}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-bold text-ink">{item.primary}</p>
                      <p className="mt-1 text-xs text-steel">{item.primaryLabel}</p>
                    </div>
                    <div className="border-l border-line pl-3">
                      <p className="text-2xl font-bold text-marine">{item.secondary}</p>
                      <p className="mt-1 text-xs text-steel">{item.secondaryLabel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">업무 연결</h3>
              <p className="text-sm font-medium text-steel">거래 시작부터 정산 마감까지</p>
            </div>
            <div className="grid auto-rows-fr gap-4 lg:grid-cols-4">
              {erpFlowGroups.map((group, index) => (
                <div key={group.title} className="relative h-full rounded-md border border-line bg-[#f8fbfd] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-bold text-ink">{group.title}</p>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-marine">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-steel">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">업무 처리 현황</h3>
              <div className="flex gap-4 text-sm font-medium text-steel">
                <span>전체 84</span>
                <span>진행 20</span>
                <span>대기 64</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-line">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-paper text-steel">
                  <tr>
                    <th className="px-4 py-3 font-medium">구분</th>
                    <th className="px-4 py-3 font-medium">업무</th>
                    <th className="px-4 py-3 font-medium">담당</th>
                    <th className="px-4 py-3 font-medium">기한</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {dashboardTaskRows.map((row) => (
                    <tr key={`${row.group}-${row.task}`} className="hover:bg-paper">
                      <td className="px-4 py-4 font-bold text-marine">{row.group}</td>
                      <td className="px-4 py-4 font-medium text-ink">{row.task}</td>
                      <td className="px-4 py-4 text-steel">{row.owner}</td>
                      <td className="px-4 py-4 text-steel">{row.due}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">2026 06월</h3>
              <div className="flex gap-2 text-steel">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-steel">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day} className="py-2">{day}</span>
              ))}
              {calendarDays.map((day) => (
                <span
                  key={day.day}
                  className={[
                    "rounded-md py-2 text-sm",
                    day.active ? "bg-marine font-bold text-white" : day.muted ? "text-line" : "text-ink"
                  ].join(" ")}
                >
                  {day.day}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">오늘 일정</h3>
              <p className="text-sm font-bold text-marine">4건</p>
            </div>
            <div className="space-y-3">
              {dashboardSchedule.map((item) => (
                <div key={`${item.time}-${item.title}`} className="rounded-md border border-line bg-paper px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-ink">{item.title}</p>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${item.tone}`}>{item.place}</span>
                  </div>
                  <p className="mt-2 text-xs text-steel">시간 {item.time}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-1 flex-col rounded-md border border-line bg-white p-5 shadow-[0_14px_35px_rgba(9,34,53,0.08)]">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-marine" />
              <h3 className="text-lg font-bold text-ink">운영 요약</h3>
            </div>
            <div className="space-y-3 text-sm">
              <p className="rounded-md bg-paper px-3 py-3 text-steel">계약/매출은 계산서 발행과 입금 확인 항목이 남아 있습니다.</p>
              <p className="rounded-md bg-paper px-3 py-3 text-steel">거래처와 지출 메뉴에서 OCR 검수 항목이 대기 중입니다.</p>
              <p className="rounded-md bg-paper px-3 py-3 text-steel">오늘 회의록과 일정 확인을 먼저 처리하면 됩니다.</p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
