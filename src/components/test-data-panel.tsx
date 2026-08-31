"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

type Scope = "contracts" | "estimates" | "expenses" | "taxInvoices";

const SCOPES: Array<{ key: Scope; label: string; note: string }> = [
  { key: "contracts", label: "계약", note: "계약 품목도 함께 삭제됩니다" },
  { key: "estimates", label: "견적서", note: "견적 품목도 함께 삭제됩니다" },
  { key: "expenses", label: "지출", note: "승인·지급 상태와 무관하게 삭제됩니다" },
  { key: "taxInvoices", label: "세금계산서", note: "바로빌 테스트 발행분 정리용" }
];

type Counts = Record<Scope, number>;

/**
 * 개발 단계 테스트 데이터 정리.
 *
 * ALLOW_HARD_DELETE 가 꺼져 있으면 서버가 403 을 주고, 이 카드는 아예 그려지지 않는다.
 * 되돌릴 수 없는 작업이라 영역을 고르게 하고, 건수를 보여 준 뒤 한 번 더 확인한다.
 */
export function TestDataPanel() {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Set<Scope>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    fetch("/api/admin/test-data")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!alive) return;
        setAvailable(ok && data.ok);
        if (ok && data.ok) setCounts(data.counts);
      })
      .catch(() => alive && setAvailable(false));

    return () => {
      alive = false;
    };
  }, []);

  // 기능이 꺼져 있거나 권한이 없으면 화면에 아무것도 내지 않는다
  if (available !== true) {
    return null;
  }

  function toggle(scope: Scope) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
    setConfirming(false);
    setMessage("");
  }

  async function run() {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: [...selected] })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "삭제하지 못했습니다.");
        return;
      }

      const summary = Object.entries(data.deleted as Record<string, number>)
        .map(([key, value]) => `${SCOPES.find((s) => s.key === key)?.label ?? key} ${value}건`)
        .join(", ");

      setMessage(summary ? `${summary}을 삭제했습니다.` : "삭제할 데이터가 없었습니다.");
      setSelected(new Set());
      setConfirming(false);

      const refreshed = await fetch("/api/admin/test-data").then((r) => r.json());
      if (refreshed.ok) setCounts(refreshed.counts);
      router.refresh();
    } catch {
      setError("삭제 중 문제가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  }

  const totalSelected = [...selected].reduce((sum, scope) => sum + (counts?.[scope] ?? 0), 0);

  return (
    <section className="mt-6 rounded-md border border-warning-border bg-warning-bg p-5">
      <div className="mb-4 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-fg" />
        <div>
          <h3 className="font-bold text-ink">테스트 데이터 정리 (개발 모드)</h3>
          <p className="mt-1 text-sm text-warning-fg">
            되돌릴 수 없습니다. 운영 전환 시 <code className="font-mono">ALLOW_HARD_DELETE</code> 를 빼면 이 카드는 사라집니다.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SCOPES.map((scope) => (
          <label
            key={scope.key}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white px-3 py-3"
          >
            <input
              type="checkbox"
              checked={selected.has(scope.key)}
              onChange={() => toggle(scope.key)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b5f8a]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {scope.label}
                <span className="ml-2 font-normal text-steel">{counts?.[scope.key] ?? 0}건</span>
              </span>
              <span className="mt-0.5 block text-xs text-steel">{scope.note}</span>
            </span>
          </label>
        ))}
      </div>

      {message ? <p className="mt-4 text-sm font-medium text-success-fg">{message}</p> : null}
      {error ? (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <p className="w-full text-sm font-bold text-ink">
              선택한 {selected.size}개 영역, 총 {totalSelected}건을 삭제합니다. 되돌릴 수 없습니다.
            </p>
            <button
              type="button"
              onClick={run}
              disabled={working}
              className="inline-flex items-center gap-2 rounded-md bg-danger-fg px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              삭제합니다
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={working}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-steel"
            >
              취소
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 rounded-md border border-danger-border bg-white px-3 py-2 text-sm font-bold text-danger-fg disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            선택한 데이터 삭제
          </button>
        )}
      </div>
    </section>
  );
}
