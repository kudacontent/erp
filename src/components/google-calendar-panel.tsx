"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Link2, Loader2, RefreshCw, Unplug } from "lucide-react";

type GoogleCalendarStatus = {
  configured: boolean;
  targetEmail: string;
  connected: boolean;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  eventCount: number;
};

const oauthErrorMessages: Record<string, string> = {
  google_consent_denied: "Google Calendar 접근 동의를 취소했습니다.",
  google_state_invalid: "Google 인증 상태가 만료되었습니다. 다시 연결하세요.",
  google_account_mismatch: "지정한 Google 계정과 다른 계정으로 로그인했습니다.",
  google_permission_denied: "CEO 또는 관리자 계정으로 Google Calendar를 연결해야 합니다.",
  google_oauth_not_configured: "NAS에 Google OAuth Client ID와 Secret을 먼저 설정하세요.",
  google_refresh_token_missing: "refresh token을 받지 못했습니다. 다시 연결하세요.",
  google_connection_failed: "Google Calendar 연결에 실패했습니다. 설정과 redirect URI를 확인하세요."
};

function formatSyncedAt(value: string | null) {
  if (!value) return "아직 동기화하지 않음";
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function GoogleCalendarPanel({
  initialStatus,
  canManage,
  oauthResult,
  oauthCode
}: {
  initialStatus: GoogleCalendarStatus;
  canManage: boolean;
  oauthResult?: string;
  oauthCode?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    oauthResult === "connected"
      ? "Google Calendar를 연결하고 일정을 동기화했습니다."
      : oauthResult === "error"
        ? oauthErrorMessages[oauthCode ?? ""] ?? "Google Calendar 연결에 실패했습니다."
        : ""
  );

  async function syncCalendar() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/calendar/google/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Google Calendar 동기화에 실패했습니다.");
      setMessage(data.message);
      setStatus((current) => ({ ...current, connected: true, lastSyncedAt: data.lastSyncedAt, lastError: null, eventCount: data.syncedCount }));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Calendar 동기화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectCalendar() {
    if (!window.confirm("Google Calendar 연결을 해제할까요? ERP에 가져온 Google 일정도 삭제됩니다.")) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/calendar/google/connection", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Google Calendar 연결 해제에 실패했습니다.");
      setStatus((current) => ({ ...current, connected: false, accountEmail: null, lastSyncedAt: null, lastError: null, eventCount: 0 }));
      setMessage(data.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Calendar 연결 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f5fb] text-marine">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-ink">Google Calendar 연동</h3>
            <p className="mt-1 text-sm text-steel">
              {status.connected ? `${status.accountEmail} 계정 연결됨 · ${status.eventCount}건 동기화` : `${status.targetEmail} 계정의 primary 캘린더를 ERP로 가져옵니다.`}
            </p>
            <p className="mt-1 text-xs text-steel">최근 동기화: {formatSyncedAt(status.lastSyncedAt)}</p>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {!status.connected ? (
              <a
                href={status.configured ? "/api/calendar/google/connect" : undefined}
                aria-disabled={!status.configured}
                className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" /> Google 계정 연결
              </a>
            ) : (
              <>
                <button type="button" onClick={() => void syncCalendar()} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 동기화
                </button>
                <button type="button" onClick={() => void disconnectCalendar()} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-steel hover:text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">
                  <Unplug className="h-4 w-4" /> 연결 해제
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {!status.configured ? <p className="mt-4 rounded-md bg-[#fff8e7] px-3 py-3 text-sm text-[#92400e]">NAS `.env`에 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정해야 연결 버튼이 활성화됩니다.</p> : null}
      {status.lastError ? <p className="mt-4 rounded-md bg-[#fff4ed] px-3 py-3 text-sm text-[#9a3412]">최근 오류: {status.lastError}</p> : null}
      {message ? <p className="mt-4 rounded-md bg-[#e8f5fb] px-3 py-3 text-sm text-marine">{message}</p> : null}
    </section>
  );
}
