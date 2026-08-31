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
  time: string;
  isAllDay: boolean;
  syncStatus: string;
  /**
   * 여러 날에 걸친 일정이 이 날짜 칸에서 어느 위치인지.
   * single = 하루짜리, start = 시작일, middle = 중간, end = 마지막 날
   */
  spanPosition: "single" | "start" | "middle" | "end";
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

export type CalendarMonthEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  category: string;
  syncStatus: string;
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

export function getCalendarMonthParam(date: Date) {
  const parts = getSeoulParts(date);
  return monthKey(parts.year, parts.month);
}

export function getCalendarMonthDate(value: string | undefined, fallback = new Date()) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);

  if (!match || !Number.isInteger(year) || year < 1970 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback;
  }

  // Use midday in Seoul so the selected month cannot shift across a timezone boundary.
  return new Date(Date.UTC(year, month - 1, 15, 3, 0, 0));
}

export function shiftCalendarMonth(value: string, offset: number) {
  const selectedDate = getCalendarMonthDate(value);
  const parts = getSeoulParts(selectedDate);
  return getCalendarMonthParam(new Date(Date.UTC(parts.year, parts.month - 1 + offset, 15, 3, 0, 0)));
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// 한국은 서머타임이 없어 고정 오프셋으로 안전하다.
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주어진 시각이 속한 '서울 기준 그날 자정' */
function seoulMidnight(date: Date) {
  const parts = getSeoulParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - SEOUL_OFFSET_MS);
}

/**
 * 일정이 실제로 덮는 마지막 날짜.
 *
 * 구글 캘린더의 종일 일정은 end.date 가 exclusive 다. 8/1~8/3 종일 일정을 end=8/4 로 준다.
 * 시간 일정도 정각 자정에 끝나면 그날을 차지하지 않는다.
 * 두 경우 모두 1ms 를 빼면 올바른 마지막 날이 나온다.
 */
function lastCoveredKey(event: CalendarEventRecord) {
  const startKey = dateKey(event.startTime);

  if (event.endTime.getTime() <= event.startTime.getTime()) {
    return startKey;
  }

  const endKey = dateKey(new Date(event.endTime.getTime() - 1));
  return endKey < startKey ? startKey : endKey;
}

/** 일정이 덮는 모든 날짜 키를 시작일부터 순서대로 */
function coveredKeys(event: CalendarEventRecord) {
  const startKey = dateKey(event.startTime);
  const endKey = lastCoveredKey(event);
  const keys = [startKey];

  if (endKey === startKey) {
    return keys;
  }

  let cursor = seoulMidnight(event.startTime);

  // 데이터가 잘못돼 끝이 없더라도 무한 루프가 되지 않도록 상한을 둔다.
  for (let index = 0; index < 366; index += 1) {
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
    const key = dateKey(cursor);
    keys.push(key);

    if (key >= endKey) {
      break;
    }
  }

  return keys;
}

/** 목록에 표시할 날짜. 여러 날이면 "08/01~08/03" 형태 */
function formatDateRange(event: CalendarEventRecord) {
  const startKey = dateKey(event.startTime);
  const endKey = lastCoveredKey(event);
  const start = formatShortDate(event.startTime);

  if (endKey === startKey) {
    return start;
  }

  const [, month, day] = endKey.split("-");
  return `${start}~${month}/${day}`;
}

export function buildCalendarViewData(events: CalendarEventRecord[], now = new Date(), viewDate = now) {
  const nowParts = getSeoulParts(now);
  const viewParts = getSeoulParts(viewDate);
  const viewMonthKey = monthKey(viewParts.year, viewParts.month);
  const todayKey = dateKey(now);
  const firstDay = new Date(Date.UTC(viewParts.year, viewParts.month - 1, 1));
  const firstDayOffset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(viewParts.year, viewParts.month, 0)).getUTCDate();
  const monthFirstKey = `${viewMonthKey}-01`;
  const monthLastKey = `${viewMonthKey}-${String(daysInMonth).padStart(2, "0")}`;

  // 이 달과 기간이 겹치는 일정을 모두 포함한다.
  // 시작일만 보면 지난달에 시작해 이번 달까지 이어지는 일정이 통째로 빠진다.
  const monthEvents = events.filter((event) => {
    const startKey = dateKey(event.startTime);
    const endKey = lastCoveredKey(event);

    return startKey <= monthLastKey && endKey >= monthFirstKey;
  });

  const eventsByDate = new Map<string, CalendarEventSummary[]>();

  // 여러 날에 걸친 일정은 덮는 날짜 칸마다 넣는다.
  for (const event of monthEvents) {
    const keys = coveredKeys(event);
    const lastKey = keys[keys.length - 1];

    keys.forEach((key, index) => {
      if (key < monthFirstKey || key > monthLastKey) {
        return;
      }

      const isStart = index === 0;
      const isEnd = key === lastKey;
      const summaries = eventsByDate.get(key) ?? [];

      summaries.push({
        id: event.id,
        title: event.title,
        category: event.category,
        // 시작일에만 시간을 보여주고, 이어지는 날은 "계속" 으로 표시한다
        time: isStart ? formatTime(event.startTime, event.isAllDay) : "계속",
        isAllDay: event.isAllDay,
        syncStatus: event.syncStatus,
        spanPosition: keys.length === 1 ? "single" : isStart ? "start" : isEnd ? "end" : "middle"
      });

      eventsByDate.set(key, summaries);
    });
  }

  // 종일·여러 날 일정을 위로, 그다음 시간순으로 정렬한다
  for (const summaries of eventsByDate.values()) {
    summaries.sort((left, right) => {
      const leftSpan = left.spanPosition === "single" ? 1 : 0;
      const rightSpan = right.spanPosition === "single" ? 1 : 0;

      if (leftSpan !== rightSpan) {
        return leftSpan - rightSpan;
      }

      return left.time.localeCompare(right.time);
    });
  }
  const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const calendarDays: CalendarDay[] = [];

  for (let index = 0; index < cellCount; index += 1) {
    const dayNumber = index - firstDayOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      calendarDays.push({ key: `blank-${index}`, day: "", muted: true, events: [] });
      continue;
    }

    const key = `${viewMonthKey}-${String(dayNumber).padStart(2, "0")}`;
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

  // 오늘 시작하는 일정뿐 아니라 오늘을 지나가는 일정도 포함한다
  const todayEvents: CalendarTodayEvent[] = events
    .filter((event) => dateKey(event.startTime) <= todayKey && lastCoveredKey(event) >= todayKey)
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
    .map((event) => ({
      id: event.id,
      time: dateKey(event.startTime) === todayKey ? formatTime(event.startTime, event.isAllDay) : "계속",
      title: event.title,
      category: event.category,
      link: event.syncStatus === "GOOGLE_SYNCED" ? "Google Calendar" : "ERP",
      syncStatus: event.syncStatus
    }));

  const monthEventList: CalendarMonthEvent[] = monthEvents.map((event) => ({
    id: event.id,
    date: formatDateRange(event),
    time: formatTime(event.startTime, event.isAllDay),
    title: event.title,
    category: event.category,
    syncStatus: event.syncStatus
  }));

  const countFor = (category: string) => categoryCounts.get(category) ?? 0;
  const calendarStats: CalendarStat[] = [
    { label: `${viewParts.month}월 일정`, value: `${monthEvents.length}건` },
    { label: "회의 일정", value: `${countFor("회의")}건` },
    { label: "정산 일정", value: `${countFor("정산")}건` },
    { label: "인사/내부", value: `${countFor("내부")}건` }
  ];

  return {
    calendarStats,
    calendarDays,
    todayEvents,
    calendarCategories,
    monthEvents: monthEventList,
    monthLabel: `${viewParts.year}년 ${viewParts.month}월`,
    monthValue: viewMonthKey,
    previousMonth: shiftCalendarMonth(viewMonthKey, -1),
    nextMonth: shiftCalendarMonth(viewMonthKey, 1)
  };
}
