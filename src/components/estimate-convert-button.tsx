"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";

/**
 * 견적서를 계약으로 옮기는 버튼.
 *
 * 전환은 되돌릴 수 없으므로 (계약이 실제로 만들어진다) 한 번 더 확인한다.
 * 이미 전환된 견적서에는 계약으로 가는 링크만 보여 준다.
 */
export function EstimateConvertButton({
  estimateId,
  contractId,
  hasClient
}: {
  estimateId: string;
  contractId: string | null;
  hasClient: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  if (contractId) {
    return (
      <Link
        href={`/contracts/${contractId}`}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-bold text-marine"
      >
        <ArrowRightLeft className="h-4 w-4" />
        연결된 계약 보기
      </Link>
    );
  }

  async function convert() {
    setWorking(true);
    setError("");

    try {
      const response = await fetch(`/api/estimates/${estimateId}/convert`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "계약으로 옮기지 못했습니다.");
        setConfirming(false);
        return;
      }

      router.push(`/contracts/${data.contractId}`);
    } catch {
      setError("전환 중 문제가 발생했습니다.");
      setConfirming(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {confirming ? (
        <div className="rounded-md border border-line bg-white p-4 text-left">
          <p className="text-sm font-bold text-ink">이 견적서를 계약으로 옮길까요?</p>
          <p className="mt-1 max-w-xs text-sm text-steel">
            견적 품목과 금액이 그대로 새 계약에 복사됩니다. 전환 후에는 견적서 금액을 수정할 수 없고, 계약에서 관리합니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={convert}
              disabled={working}
              className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              계약 만들기
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={working}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!hasClient}
          title={hasClient ? undefined : "거래처를 먼저 연결하고 저장하세요."}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <ArrowRightLeft className="h-4 w-4" />
          계약으로 전환
        </button>
      )}

      {!hasClient && !confirming ? (
        <p className="max-w-xs text-right text-xs text-steel">
          거래처를 연결하고 저장하면 계약으로 옮길 수 있습니다.
        </p>
      ) : null}

      {error ? (
        <p className="max-w-xs rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
