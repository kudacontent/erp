import { CalendarPlus, Link2 } from "lucide-react";
import { redirect } from "next/navigation";
import { FilterableCalendar } from "@/components/filterable-calendar";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getCurrentUser } from "@/lib/auth";
import { buildCalendarViewData } from "@/lib/calendar-data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ google?: string; code?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/calendar");
  }

  const [events, googleStatus] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        startTime: { lt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        endTime: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { startTime: "asc" }
    }),
    getGoogleCalendarStatus()
  ]);
  const calendar = buildCalendarViewData(events);
  const params = await searchParams;

  return (
    <main className="min-w-0 max-w-full px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">캘린더</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <CalendarPlus className="h-4 w-4" />
          일정 등록
        </button>
      </section>

      <GoogleCalendarPanel
        initialStatus={googleStatus}
        canManage={user.role === "CEO" || user.role === "ADMIN"}
        oauthResult={params.google}
        oauthCode={params.code}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {calendar.calendarStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <FilterableCalendar calendarDays={calendar.calendarDays} todayEvents={calendar.todayEvents} calendarCategories={calendar.calendarCategories} />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">예정 일정</h3>
          <div className="space-y-3">
            {calendar.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <span className="w-14 shrink-0 text-sm font-bold text-marine">{event.date}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{event.title}</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-steel">{event.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">연결 현황</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">회의 연결</p>
              <p className="mt-1 text-xl font-bold text-ink">0건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">계약 연결</p>
              <p className="mt-1 text-xl font-bold text-ink">0건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">거래처 연결</p>
              <p className="mt-1 text-xl font-bold text-marine">0건</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
