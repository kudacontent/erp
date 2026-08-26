"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, Search, ServerCog } from "lucide-react";
import { modules } from "@/lib/dashboard-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    if (pathname === "/login") {
      return;
    }

    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#0f3f5e] bg-[#092235] px-5 py-6 lg:block">
        <Link href="/" className="block">
          <p className="text-sm font-semibold text-[#7dd3fc]">KUDALABS</p>
          <h1 className="mt-1 text-2xl font-bold text-white">사내 운영 ERP</h1>
        </Link>

        <nav className="mt-8 space-y-1">
          {modules.map((module) => {
            const active = pathname === module.href || pathname.startsWith(`${module.href}/`);

            return (
              <Link
                key={module.href}
                href={module.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-[#123b57] text-white"
                    : "text-[#b8cfdd] hover:bg-[#123b57] hover:text-white"
                ].join(" ")}
              >
                <module.icon className={["h-4 w-4", active ? "text-[#7dd3fc]" : ""].join(" ")} />
                {module.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-steel lg:hidden"
                aria-label="메뉴"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-sm font-bold uppercase tracking-wide text-marine">OPERATION</p>
            </div>

            <div className="hidden min-w-72 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel md:flex">
              <Search className="h-4 w-4" />
              거래처, 계약, 회의 검색
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="hidden items-center gap-3 rounded-md border border-line bg-paper px-3 py-2 text-sm sm:flex">
                  <div className="text-right">
                    <p className="font-bold text-ink">{user.name}</p>
                    <p className="text-xs text-steel">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-steel transition hover:text-marine"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <span className="hidden items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel sm:flex">
                <ServerCog className="h-4 w-4 text-marine" />
                시스템 정상
              </span>
              <Link
                href="/notifications"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-steel"
                aria-label="알림"
              >
                <Bell className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
