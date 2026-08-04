import { Bot, CheckCircle2, FileText, History, RefreshCw, ShieldAlert } from "lucide-react";
import {
  briefingSections,
  recommendedActions,
  reportHistory,
  reportStats,
  riskItems,
  sourceItems
} from "@/lib/daily-report-data";

function riskClass(level: string) {
  if (level === "높음") {
    return "bg-[#e5eef5] text-[#075985]";
  }

  return "bg-paper text-steel";
}

export default function DailyReportsPage() {
  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">일일경영보고</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <RefreshCw className="h-4 w-4" />
          보고서 생성
        </button>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {reportStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Bot className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">오늘의 브리핑</h3>
          </div>
          <div className="space-y-4">
            {briefingSections.length ? briefingSections.map((section) => (
              <div key={section.title} className="rounded-md bg-paper p-4">
                <p className="font-bold text-ink">{section.title}</p>
                <p className="mt-3 text-sm leading-6 text-steel">{section.body}</p>
              </div>
            )) : <p className="rounded-md bg-paper px-4 py-10 text-center text-sm font-medium text-steel">생성된 보고서가 없습니다.</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">리스크</h3>
            </div>
            <div className="space-y-3">
              {riskItems.map((item) => (
                <div key={item.title} className="rounded-md bg-paper px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${riskClass(item.level)}`}>{item.level}</span>
                  </div>
                  <p className="mt-2 text-xs text-steel">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">권장 조치</h3>
            </div>
            <div className="space-y-3">
              {recommendedActions.map((item) => (
                <div key={item.title} className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-steel">
                    <span>{item.owner}</span>
                    <span>{item.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">근거 데이터</h3>
          </div>
          <div className="space-y-3">
            {sourceItems.map((item) => (
              <div key={`${item.type}-${item.title}`} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-marine">{item.type}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.title}</p>
                <span className="text-sm font-bold text-steel">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">보고 이력</h3>
          </div>
          <div className="space-y-3">
            {reportHistory.map((item) => (
              <div key={item.date} className="rounded-md bg-paper px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink">{item.date}</p>
                  <p className="text-xs text-marine">{item.status}</p>
                </div>
                <p className="mt-2 text-xs text-steel">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
