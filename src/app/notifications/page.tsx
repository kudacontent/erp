import { Bell, CheckCircle2, Search } from "lucide-react";
import { notificationFilters, notifications, notificationStats } from "@/lib/notifications-data";

function statusClass(status: string) {
  return status === "미확인" ? "bg-[#e5eef5] text-[#075985]" : "bg-paper text-steel";
}

export default function NotificationsPage() {
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-72 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel">
            <Search className="h-4 w-4" />
            알림 제목, 업무 영역 검색
          </div>
          <div className="flex flex-wrap gap-2">
            {notificationFilters.map((item) => (
              <button
                key={item}
                className={[
                  "rounded-md border px-3 py-2 text-sm font-medium",
                  item === "전체" ? "border-marine bg-marine text-white" : "border-line bg-white text-steel"
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={`${notification.time}-${notification.title}`} className="rounded-md border border-line bg-paper p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-marine">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{notification.title}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(notification.status)}`}>
                        {notification.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-steel">{notification.body}</p>
                    <p className="mt-2 text-xs text-steel">{notification.type} · {notification.target}</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-medium text-marine">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
