"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";
import { notificationFilters, notifications, notificationStats } from "@/lib/notifications-data";
import { StatusBadge } from "@/components/ui/status-badge";

// 이 화면은 등록 즉시 목록에 반영되어야 한다.
// 이 선언이 없으면 Next.js 가 빌드 시점 DB 스냅샷으로 페이지를 구워 정적 파일로 서빙하고,
// 이후 새로 등록한 데이터가 재빌드 전까지 화면에 나타나지 않는다.
export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("전체");
  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesFilter = selectedFilter === "전체"
        || (selectedFilter === "미확인" ? notification.status === "미확인" : notification.type === selectedFilter);
      const searchable = [notification.title, notification.body, notification.type, notification.target, notification.time]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, selectedFilter]);

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">알림 센터</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <CheckCircle2 className="h-4 w-4" />
          모두 확인
        </button>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {notificationStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-white p-5">
        <ResponsiveFilterBar
          searchLabel="알림 검색"
          searchPlaceholder="알림 제목, 업무 영역 검색"
          searchValue={query}
          onSearchChange={setQuery}
          options={notificationFilters}
          selectedOption={selectedFilter}
          onOptionChange={setSelectedFilter}
        />

        <div className="space-y-3">
          {filteredNotifications.length ? filteredNotifications.map((notification) => (
            <div key={`${notification.time}-${notification.title}`} className="rounded-md border border-line bg-paper p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-marine">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{notification.title}</p>
                      <StatusBadge status={notification.status} />
                    </div>
                    <p className="mt-2 text-sm text-steel">{notification.body}</p>
                    <p className="mt-2 text-xs text-steel">{notification.type} · {notification.target}</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-medium text-marine">{notification.time}</p>
              </div>
            </div>
          )) : <p className="rounded-md bg-paper px-4 py-10 text-center text-sm font-medium text-steel">
            {notifications.length ? "조건에 맞는 알림이 없습니다." : "새 알림이 없습니다."}
          </p>}
        </div>
      </section>
    </main>
  );
}
