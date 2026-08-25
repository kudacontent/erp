import { Link2 } from "lucide-react";
import { redirect } from "next/navigation";
import { CalendarEventForm, type CalendarEventFormValue } from "@/components/calendar-event-form";
import { FilterableCalendar } from "@/components/filterable-calendar";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getCurrentUser } from "@/lib/auth";
import { buildCalendarViewData, getCalendarMonthDate } from "@/lib/calendar-data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ google?: string; code?: string; eventId?: string; month?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/calendar");
  }

  const params = await searchParams;
  const now = new Date();
  const viewDate = getCalendarMonthDate(params.month, now);
  const [events, googleStatus] = await Promise.all([
    prisma.calendarEvent.findMany({
      include: { meeting: { select: { id: true } }, client: { select: { id: true } }, contract: { select: { id: true } } },
      orderBy: { startTime: "asc" }
    }),
    getGoogleCalendarStatus()
  ]);
  const calendar = buildCalendarViewData(events, now, viewDate);
  const selectedEventRecord = params.eventId ? events.find((event) => event.id === params.eventId) : null;
  const selectedEvent: CalendarEventFormValue | null = selectedEventRecord
    ? {
        id: selectedEventRecord.id,
        title: selectedEventRecord.title,
        category: selectedEventRecord.category,
        startTime: selectedEventRecord.startTime.toISOString(),
        endTime: selectedEventRecord.endTime.toISOString(),
        isAllDay: selectedEventRecord.isAllDay,
        description: selectedEventRecord.description,
        syncStatus: selectedEventRecord.syncStatus
      }
    : null;

  return (
    <main className="min-w-0 max-w-full px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">캘린더</h2>
        </div>
        <CalendarEventForm initialEvent={selectedEvent} />
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

      <FilterableCalendar
        calendarDays={calendar.calendarDays}
        todayEvents={calendar.todayEvents}
        calendarCategories={calendar.calendarCategories}
        monthEvents={calendar.monthEvents}
        monthLabel={calendar.monthLabel}
        previousMonth={calendar.previousMonth}
        nextMonth={calendar.nextMonth}
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">예정 일정</h3>
          <div className="space-y-3">
            {calendar.upcomingEvents.length ? calendar.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <span className="w-14 shrink-0 text-sm font-bold text-marine">{event.date}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{event.title}</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-steel">{event.type}</span>
                {event.syncStatus === "LOCAL_ONLY" ? <a href={`/calendar?month=${encodeURIComponent(event.month)}&eventId=${encodeURIComponent(event.id)}`} className="shrink-0 text-xs font-bold text-marine hover:underline">수정</a> : <span className="shrink-0 text-xs font-medium text-steel">Google</span>}
              </div>
            )) : <p className="rounded-md bg-paper px-3 py-8 text-center text-sm font-medium text-steel">오늘 이후 등록된 일정이 없습니다. Google 동기화 또는 일정 등록을 이용하세요.</p>}
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
              <p className="mt-1 text-xl font-bold text-ink">{events.filter((event) => event.meeting).length}건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">계약 연결</p>
              <p className="mt-1 text-xl font-bold text-ink">{events.filter((event) => event.contract).length}건</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">거래처 연결</p>
              <p className="mt-1 text-xl font-bold text-marine">{events.filter((event) => event.client).length}건</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-ink">최근 Google 동기화 일정</h3><p className="mt-1 text-sm text-steel">현재 달이 아니어도 최근 동기화된 일정을 확인할 수 있습니다.</p></div><span className="rounded-md bg-[#e8f5fb] px-2 py-1 text-xs font-bold text-marine">{calendar.syncedEvents.length}건 표시</span></div>
        {calendar.syncedEvents.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{calendar.syncedEvents.map((event) => <div key={event.id} className="rounded-md bg-paper px-3 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-marine">{event.date}</span><span className="rounded-md bg-white px-2 py-1 text-xs text-steel">{event.type}</span></div><p className="mt-2 truncate text-sm font-medium text-ink">{event.title}</p></div>)}</div> : <p className="rounded-md bg-paper px-3 py-6 text-center text-sm text-steel">Google 동기화 일정이 없습니다. 연결 상태에서 동기화를 실행하세요.</p>}
      </section>
    </main>
  );
}
