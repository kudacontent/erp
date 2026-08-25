const SEOUL_TIME_ZONE = "Asia/Seoul";

export type CalendarEventRecord = {
  id: string;
  title: string;
  category: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  description: string | null;
  syncStatus: string;
};

export type CalendarEventSummary = {
  id: string;
  title: string;
  category: string;
  isAllDay: boolean;
  syncStatus: string;
};

export type CalendarDay = {
  key: string;
  day: string;
  muted: boolean;
  today?: boolean;
  events: CalendarEventSummary[];
};

export type CalendarTodayEvent = {
  id: string;
  time: string;
  title: string;
  category: string;
  link: string;
  syncStatus: string;
};

export type CalendarCategory = {
  label: string;
  count: number;
  color: string;
};

export type CalendarUpcomingEvent = {
  id: string;
  date: string;
  title: string;
  type: string;
  syncStatus: string;
};

export type CalendarSyncedEvent = {
  id: string;
  date: string;
  title: string;
  type: string;
};

export type CalendarStat = {
  label: string;
  value: string;
};

function getSeoulParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: values.hour,
    minute: values.minute
  };
}

function dateKey(date: Date) {
  const parts = getSeoulParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatTime(date: Date, isAllDay: boolean) {
  if (isAllDay) {
    return "종일";
  }

  const parts = getSeoulParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function formatShortDate(date: Date) {
  const parts = getSeoulParts(date);
  return `${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}`;
}

export function buildCalendarViewData(events: CalendarEventRecord[], now = new Date()) {
  const nowParts = getSeoulParts(now);
  const currentMonthKey = monthKey(nowParts.year, nowParts.month);
  const todayKey = dateKey(now);
  const monthEvents = events.filter((event) => dateKey(event.startTime).startsWith(currentMonthKey));
  const eventsByDate = new Map<string, CalendarEventSummary[]>();

  for (const event of monthEvents) {
    const key = dateKey(event.startTime);
    const summaries = eventsByDate.get(key) ?? [];
    summaries.push({ id: event.id, title: event.title, category: event.category, isAllDay: event.isAllDay, syncStatus: event.syncStatus });
    eventsByDate.set(key, summaries);
  }

  const firstDay = new Date(Date.UTC(nowParts.year, nowParts.month - 1, 1));
  const firstDayOffset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(nowParts.year, nowParts.month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const calendarDays: CalendarDay[] = [];

  for (let index = 0; index < cellCount; index += 1) {
    const dayNumber = index - firstDayOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      calendarDays.push({ key: `blank-${index}`, day: "", muted: true, events: [] });
      continue;
    }

    const key = `${currentMonthKey}-${String(dayNumber).padStart(2, "0")}`;
    calendarDays.push({
      key,
      day: String(dayNumber),
      muted: false,
      today: key === todayKey,
      events: eventsByDate.get(key) ?? []
    });
  }

  const categoryColors = ["bg-marine", "bg-[#36a7c8]", "bg-[#7c83fd]", "bg-[#f59e0b]", "bg-[#64748b]"];
  const categoryCounts = new Map<string, number>();
  for (const event of monthEvents) {
    categoryCounts.set(event.category, (categoryCounts.get(event.category) ?? 0) + 1);
  }

  const calendarCategories = [...categoryCounts.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([label, count], index) => ({ label, count, color: categoryColors[index % categoryColors.length] }));

  const todayEvents: CalendarTodayEvent[] = events
    .filter((event) => dateKey(event.startTime) === todayKey)
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
    .map((event) => ({
      id: event.id,
      time: formatTime(event.startTime, event.isAllDay),
      title: event.title,
      category: event.category,
      link: event.syncStatus === "GOOGLE_SYNCED" ? "Google Calendar" : "ERP",
      syncStatus: event.syncStatus
    }));

  const upcomingEvents: CalendarUpcomingEvent[] = events
    .filter((event) => dateKey(event.startTime) >= todayKey)
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
    .slice(0, 12)
    .map((event) => ({ id: event.id, date: formatShortDate(event.startTime), title: event.title, type: event.category, syncStatus: event.syncStatus }));

  const syncedEvents: CalendarSyncedEvent[] = events
    .filter((event) => event.syncStatus === "GOOGLE_SYNCED")
    .sort((left, right) => right.startTime.getTime() - left.startTime.getTime())
    .slice(0, 12)
    .map((event) => ({ id: event.id, date: formatShortDate(event.startTime), title: event.title, type: event.category }));

  const countFor = (category: string) => categoryCounts.get(category) ?? 0;
  const calendarStats: CalendarStat[] = [
    { label: "이번 달 일정", value: `${monthEvents.length}건` },
    { label: "회의 일정", value: `${countFor("회의")}건` },
    { label: "정산 일정", value: `${countFor("정산")}건` },
    { label: "인사/내부", value: `${countFor("내부")}건` }
  ];

  return { calendarStats, calendarDays, todayEvents, calendarCategories, upcomingEvents, syncedEvents };
}
