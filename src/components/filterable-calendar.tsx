"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type CalendarDay = {
  key: string;
  day: string;
  muted: boolean;
  today?: boolean;
  events: Array<{ id: string; title: string; category: string; time: string; isAllDay: boolean; syncStatus: string }>;
};

type TodayEvent = {
  id: string;
  time: string;
  title: string;
  category: string;
  link: string;
  syncStatus: string;
};

type CalendarCategory = {
  label: string;
  count: number;
  color: string;
};

type CalendarMonthEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  category: string;
  syncStatus: string;
};

export function FilterableCalendar({
  calendarDays,
  todayEvents,
  calendarCategories,
  monthEvents,
  monthLabel,
  monthValue,
  previousMonth,
  nextMonth,
  selectedEventId
}: {
  calendarDays: CalendarDay[];
  todayEvents: TodayEvent[];
  calendarCategories: CalendarCategory[];
  monthEvents: CalendarMonthEvent[];
  monthLabel: string;
  monthValue: string;
  previousMonth: string;
  nextMonth: string;
  selectedEventId: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredDays = useMemo(() => {
    return calendarDays.map((day) => ({
      ...day,
      events: day.events.filter((event) => {
        const matchesCategory = selectedCategory === "전체" || event.category === selectedCategory;
        const matchesQuery = !normalizedQuery || `${event.title} ${event.category}`.toLowerCase().includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      })
    }));
  }, [calendarDays, normalizedQuery, selectedCategory]);

  const filteredTodayEvents = useMemo(() => {
    return todayEvents.filter((event) => {
      const matchesCategory = selectedCategory === "전체" || event.category === selectedCategory;
      const matchesQuery = !normalizedQuery || `${event.title} ${event.category} ${event.link}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [normalizedQuery, selectedCategory, todayEvents]);

  const filteredMonthEvents = useMemo(() => {
    return monthEvents.filter((event) => {
      const matchesCategory = selectedCategory === "전체" || event.category === selectedCategory;
      const matchesQuery = !normalizedQuery || `${event.title} ${event.category} ${event.date} ${event.time}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [monthEvents, normalizedQuery, selectedCategory]);

  const visibleEventCount = filteredDays.reduce((sum, day) => sum + day.events.length, 0);
  const categories = [{ label: "전체", count: calendarDays.reduce((sum, day) => sum + day.events.length, 0), color: "bg-marine" }, ...calendarCategories];

  return (
    <section className="mb-6 grid w-full min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-md border border-line bg-white p-5">
        <div className="mb-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink">일정 현황</h3>
              <p className="mt-1 text-sm font-medium text-steel">{monthLabel} · 표시 일정 {visibleEventCount}건</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <input
                type="month"
                aria-label="년도와 월 선택"
                value={monthValue}
                onChange={(event) => {
                  if (event.target.value) router.push(`/calendar?month=${event.target.value}`);
                }}
                className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-bold text-ink outline-none focus:border-marine"
              />
              <div className="flex items-center gap-1 rounded-md border border-line bg-paper p-1">
              <Link
                href={`/calendar?month=${previousMonth}`}
                aria-label="이전 달"
                className="rounded-md p-2 text-steel transition hover:bg-white hover:text-marine"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link href="/calendar" className="rounded-md px-3 py-2 text-xs font-bold text-marine transition hover:bg-white">
                오늘
              </Link>
              <Link
                href={`/calendar?month=${nextMonth}`}
                aria-label="다음 달"
                className="rounded-md p-2 text-steel transition hover:bg-white hover:text-marine"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
              </div>
            </div>
          </div>
          <label className="flex w-full min-w-0 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel">
            <Search className="h-4 w-4" />
            <input
              aria-label="일정 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="일정, 거래처, 계약 검색"
              className="w-full bg-transparent text-ink outline-none placeholder:text-steel"
            />
          </label>
        </div>

        <div className="max-w-full overflow-x-auto rounded-md border border-line">
          <div className="grid min-w-[560px] grid-cols-7 overflow-hidden text-sm">
          {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
            <div key={day} className="border-b border-line bg-paper px-3 py-2 text-center font-medium text-steel">
              {day}
            </div>
          ))}
          {filteredDays.map((day) => (
            <div
              key={day.key}
              className={[
                "min-h-28 border-b border-r border-line bg-white p-3",
                day.today ? "bg-[#e8f5fb]" : "",
                day.muted ? "text-steel" : ""
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={day.today ? "font-bold text-marine" : "font-medium text-ink"}>{day.day}</span>
                {day.today ? <span className="rounded-md bg-white px-2 py-1 text-xs text-marine">오늘</span> : null}
              </div>
              <div className="space-y-1">
                {day.events.slice(0, 3).map((event) => {
                  const eventContent = (
                    <span className={["flex min-w-0 flex-col rounded-sm px-2 py-1 text-xs text-steel", event.id === selectedEventId ? "bg-[#d8f0fa] ring-1 ring-marine" : "bg-paper"].join(" ")}>
                      <span className="text-[10px] font-bold text-marine">{event.time}</span>
                      <span className="truncate">{event.title}</span>
                    </span>
                  );

                  return (
                    <Link key={event.id} href={`/calendar?month=${day.key.slice(0, 7)}&eventId=${encodeURIComponent(event.id)}#selected-event`} className="block hover:opacity-75">
                      {eventContent}
                    </Link>
                  );
                })}
                {day.events.length > 3 ? <p className="px-2 text-xs font-bold text-marine">+{day.events.length - 3}건 더보기</p> : null}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      <aside className="w-full min-w-0 max-w-full space-y-4 overflow-hidden">
        <section className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink">{monthLabel} 전체 일정</h3>
            <span className="shrink-0 rounded-md bg-[#e8f5fb] px-2 py-1 text-xs font-bold text-marine">{filteredMonthEvents.length}건</span>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {filteredMonthEvents.length ? (
              filteredMonthEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/calendar?month=${monthValue}&eventId=${encodeURIComponent(event.id)}#selected-event`}
                  className={["block rounded-md px-3 py-3 hover:opacity-75", event.id === selectedEventId ? "bg-[#d8f0fa] ring-1 ring-marine" : "bg-paper"].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-marine">{event.date} · {event.time}</span>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs text-steel">{event.category}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-ink">{event.title}</p>
                  <p className="mt-1 text-xs text-steel">{event.syncStatus === "GOOGLE_SYNCED" ? "Google Calendar" : "ERP"}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-md bg-paper">
                <EmptyState
                  title={monthEvents.length ? "조건에 맞는 일정이 없습니다" : "이번 달 일정이 없습니다"}
                  description={monthEvents.length ? "카테고리나 검색어를 바꿔보세요." : "구글 캘린더를 연동하거나 일정을 추가하면 여기에 표시됩니다."}
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">오늘 일정</h3>
          <div className="space-y-4">
            {filteredTodayEvents.length ? (
              filteredTodayEvents.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-12 shrink-0 text-sm font-bold text-marine">{event.time}</div>
                  <div className="min-w-0 border-l border-line pl-3">
                    <p className="truncate text-sm font-medium text-ink">{event.title}</p>
                    <p className="mt-1 text-xs text-steel">{event.category} · {event.link}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-paper">
                <EmptyState
                  title={todayEvents.length ? "조건에 맞는 오늘 일정이 없습니다" : "오늘 일정이 없습니다"}
                  description={todayEvents.length ? "카테고리나 검색어를 바꿔보세요." : undefined}
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">카테고리</h3>
          <div className="space-y-3">
            {categories.map((category) => (
              <button
                key={category.label}
                type="button"
                onClick={() => setSelectedCategory(category.label)}
                className={[
                  "grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-md px-3 py-3 text-left",
                  selectedCategory === category.label ? "bg-[#e8f5fb] ring-1 ring-marine" : "bg-paper"
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span className={`h-3 w-3 shrink-0 rounded-sm ${category.color}`} />
                  <p className="min-w-0 truncate text-sm font-medium text-ink">{category.label}</p>
                </div>
                <p className="shrink-0 whitespace-nowrap text-sm font-bold text-marine">{category.count}건</p>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
