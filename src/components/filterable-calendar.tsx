"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type CalendarDay = {
  key: string;
  day: string;
  muted: boolean;
  today?: boolean;
  events: Array<{ id: string; title: string; category: string; isAllDay: boolean; syncStatus: string }>;
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

export function FilterableCalendar({
  calendarDays,
  todayEvents,
  calendarCategories
}: {
  calendarDays: CalendarDay[];
  todayEvents: TodayEvent[];
  calendarCategories: CalendarCategory[];
}) {
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

  const visibleEventCount = filteredDays.reduce((sum, day) => sum + day.events.length, 0);
  const categories = [{ label: "전체", count: calendarDays.reduce((sum, day) => sum + day.events.length, 0), color: "bg-marine" }, ...calendarCategories];

  return (
    <section className="mb-6 grid w-full min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-md border border-line bg-white p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">일정 현황</h3>
            <p className="mt-1 text-sm font-medium text-steel">표시 일정 {visibleEventCount}건</p>
          </div>
          <label className="flex w-full min-w-0 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel sm:min-w-72">
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
                {day.events.slice(0, 3).map((event) => (
                  <div key={event.id} className="truncate rounded-sm bg-paper px-2 py-1 text-xs text-steel">
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      <aside className="w-full min-w-0 max-w-full space-y-4 overflow-hidden">
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
              <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">조건에 맞는 오늘 일정이 없습니다.</p>
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
