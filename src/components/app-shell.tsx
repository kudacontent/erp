"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, Search, ServerCog, Settings, X } from "lucide-react";
import { modules } from "@/lib/dashboard-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  const navigationModules =
    user?.role === "CEO" || user?.role === "ADMIN"
      ? [
          ...modules,
          {
            title: "관리자",
            href: "/admin",
            icon: Settings,
            metric: "계정·권한",
            description: "직원 계정과 역할, 접근 상태를 관리합니다."
          }
        ]
      : modules;
  const primaryNavigation = navigationModules.filter((module) => ["/clients", "/contracts", "/expenses", "/meetings"].includes(module.href));
  const supportNavigation = navigationModules.filter((module) => !primaryNavigation.some((primary) => primary.href === module.href));
  const navigationGroups = [
    { label: "핵심 업무", items: primaryNavigation },
    { label: "지원 메뉴", items: supportNavigation }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-[#092235]/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside id="mobile-navigation" className="relative z-10 flex h-full w-[min(88vw,20rem)] flex-col bg-[#092235] px-5 py-6 shadow-2xl print:hidden">
            <div className="flex items-start justify-between gap-3">
              <Link href="/" className="block" onClick={() => setMobileMenuOpen(false)}>
                <p className="text-sm font-semibold text-[#7dd3fc]">KUDALABS</p>
                <h1 className="mt-1 text-2xl font-bold text-white">사내 운영 ERP</h1>
              </Link>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#2c5870] text-[#b8cfdd]"
                aria-label="메뉴 닫기"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {user ? (
              <div className="mt-6 rounded-md border border-[#2c5870] bg-[#123b57] px-3 py-3">
                <p className="truncate text-sm font-bold text-white">{user.name}</p>
                <p className="mt-1 truncate text-xs text-[#b8cfdd]">{user.email}</p>
                <p className="mt-2 text-xs font-medium text-[#7dd3fc]">{user.role}</p>
              </div>
            ) : null}
            <nav className="mt-6 min-h-0 space-y-5 overflow-y-auto pb-6" aria-label="주 메뉴">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7fa8bb]">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((module) => {
                      const modulePath = module.href.split("#")[0];
                      const active = pathname === modulePath || pathname.startsWith(`${modulePath}/`);

                      return (
                        <Link
                          key={module.href}
                          href={module.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={[
                            "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition",
                            active ? "bg-[#123b57] text-white" : "text-[#b8cfdd] hover:bg-[#123b57] hover:text-white"
                          ].join(" ")}
                        >
                          <module.icon className={["h-4 w-4", active ? "text-[#7dd3fc]" : ""].join(" ")} />
                          {module.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#0f3f5e] bg-[#092235] px-5 py-6 lg:block print:hidden">
        <Link href="/" className="block">
          <p className="text-sm font-semibold text-[#7dd3fc]">KUDALABS</p>
          <h1 className="mt-1 text-2xl font-bold text-white">사내 운영 ERP</h1>
        </Link>

        <nav className="mt-8 space-y-6" aria-label="주 메뉴">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7fa8bb]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((module) => {
                  const modulePath = module.href.split("#")[0];
                  const active = pathname === modulePath || pathname.startsWith(`${modulePath}/`);

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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="app-shell-content min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-8 sm:py-4 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
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
