import { Bot, CalendarPlus, CheckSquare, FileText, MessageSquareText, Users } from "lucide-react";
import { FilterableMeetingsTable } from "@/components/filterable-meetings-table";
import { meetingActions, meetings, meetingStats, meetingSummaries, meetingTimeline } from "@/lib/meetings-data";

export default function MeetingsPage() {
  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">회의 관리</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <CalendarPlus className="h-4 w-4" />
          회의 등록
        </button>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {meetingStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <FilterableMeetingsTable meetings={meetings} statusOptions={["전체", "예정", "진행 중", "후속 조치", "완료"]} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">오늘 회의</h3>
            </div>
            <div className="space-y-4">
              {meetingTimeline.map((item) => (
                <div key={`${item.time}-${item.title}`} className="flex gap-3">
                  <div className="w-12 shrink-0 text-sm font-bold text-marine">{item.time}</div>
                  <div className="min-w-0 border-l border-line pl-3">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-steel">{item.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">후속 조치</h3>
            </div>
            <div className="space-y-3">
              {meetingActions.map((item) => (
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
            <Bot className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">회의록 요약</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {meetingSummaries.map((summary) => (
              <div key={summary.label} className="rounded-md bg-paper p-4">
                <p className="text-sm font-bold text-marine">{summary.label}</p>
                <p className="mt-3 text-sm leading-6 text-ink">{summary.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">참석자 현황</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">내부 참석</p>
              <p className="mt-1 text-xl font-bold text-ink">12명</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">외부 참석</p>
              <p className="mt-1 text-xl font-bold text-ink">9명</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">회의록 첨부</p>
              <p className="mt-1 text-xl font-bold text-marine">6건</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
