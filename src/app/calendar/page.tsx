import { redirect } from "next/navigation";
import { CalendarEventForm, type CalendarEventFormValue } from "@/components/calendar-event-form";
import { FilterableCalendar } from "@/components/filterable-calendar";
import { GoogleCalendarPanel } from "@/components/google-calendar-panel";
import { getCurrentUser } from "@/lib/auth";
import { buildCalendarViewData, getCalendarMonthDate } from "@/lib/calendar-data";
import { getGoogleCalendarStatus } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatCalendarDate(date: Date, isAllDay: boolean) {
  const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Seoul", dateStyle: "full" };
  if (!isAllDay) {
    options.timeStyle = "short";
  }

  return new Intl.DateTimeFormat("ko-KR", options).format(date);
}

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
      orderBy: { startTime: "asc" }
    }),
    getGoogleCalendarStatus()
  ]);
  const calendar = buildCalendarViewData(events, now, viewDate);
  const selectedEventRecord = params.eventId ? events.find((event) => event.id === params.eventId) : null;
  const selectedEvent: CalendarEventFormValue | null = selectedEventRecord?.syncStatus === "LOCAL_ONLY"
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
        <CalendarEventForm initialEvent={selectedEvent} autoOpen={false} />
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
        monthValue={calendar.monthValue}
        previousMonth={calendar.previousMonth}
        nextMonth={calendar.nextMonth}
        selectedEventId={params.eventId ?? null}
      />

      {selectedEventRecord ? (
        <section id="selected-event" className="mb-6 scroll-mt-6 rounded-md border border-line bg-white p-5" aria-live="polite">
          <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold text-marine">선택한 일정 상세</p>
              <h3 className="mt-1 text-xl font-bold text-ink">{selectedEventRecord.title}</h3>
            </div>
            <span className="w-fit rounded-md bg-[#e8f5fb] px-3 py-2 text-xs font-bold text-marine">
              {selectedEventRecord.syncStatus === "GOOGLE_SYNCED" ? "Google Calendar" : "ERP 일정"}
            </span>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-steel">일시</dt>
              <dd className="mt-1 text-sm font-bold text-ink">
                {formatCalendarDate(selectedEventRecord.startTime, selectedEventRecord.isAllDay)}
                {selectedEventRecord.isAllDay ? "" : ` ~ ${formatCalendarDate(selectedEventRecord.endTime, false)}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-steel">카테고리</dt>
              <dd className="mt-1 text-sm font-bold text-ink">{selectedEventRecord.category}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-steel">상세내용</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">{selectedEventRecord.description || "등록된 상세내용이 없습니다."}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-md bg-paper px-3 py-3 text-xs text-steel">
            {selectedEventRecord.syncStatus === "GOOGLE_SYNCED" ? "Google Calendar에서 관리되는 일정입니다." : "ERP 일정은 상단의 일정 수정 버튼에서 수정하거나 삭제할 수 있습니다."}
          </p>
        </section>
      ) : null}
    </main>
  );
}
