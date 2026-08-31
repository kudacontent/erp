"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckCircle2, CircleDollarSign, Loader2, Send, XCircle } from "lucide-react";

type ApprovalStatus = "DRAFT" | "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";

const statusLabels: Record<ApprovalStatus, string> = {
  DRAFT: "검토 필요",
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
  PAID: "지급 완료"
};

const approverRoles = new Set(["CEO", "ADMIN", "ACCOUNTING"]);

export function ExpenseApprovalPanel({
  expenseId,
  initialStatus,
  role
}: {
  expenseId: string;
  initialStatus: ApprovalStatus;
  role: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ApprovalStatus>(initialStatus);
  const [busyAction, setBusyAction] = useState<"request" | "approve" | "reject" | "pay" | "">("");
  const [message, setMessage] = useState("");
  const isApprover = approverRoles.has(role);

  async function updateApproval(action: "request" | "approve" | "reject" | "pay") {
    if (action === "reject" && !window.confirm("이 지출을 반려할까요?")) {
      return;
    }

    if (action === "pay" && !window.confirm("지급 완료로 처리할까요?")) {
      return;
    }

    setBusyAction(action);
    setMessage("");

    try {
      const response = await fetch(`/api/expenses/${expenseId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "지출 처리에 실패했습니다.");
        return;
      }

      setStatus(data.expense.approvalStatus as ApprovalStatus);
      setMessage(data.message ?? "지출 처리 단계가 변경되었습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 지출 처리에 실패했습니다.");
    } finally {
      setBusyAction("");
    }
  }

  const canRequest = status === "DRAFT" || status === "REJECTED";
  const canReview = status === "REQUESTED" && isApprover;
  const canPay = status === "APPROVED" && isApprover;

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">승인·지급 처리</h3>
          <p className="mt-1 text-sm text-steel">지출 증빙을 확인한 뒤 단계별로 처리합니다.</p>
        </div>
        <StatusBadge status={statusLabels[status]} className="shrink-0" />
      </div>

      <div className="mt-5 space-y-2">
        {canRequest ? (
          <button
            type="button"
            onClick={() => updateApproval("request")}
            disabled={Boolean(busyAction)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busyAction === "request" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            승인 요청
          </button>
        ) : null}

        {canReview ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateApproval("approve")}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busyAction === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              승인 완료
            </button>
            <button
              type="button"
              onClick={() => updateApproval("reject")}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-sm font-medium text-steel disabled:opacity-60"
            >
              {busyAction === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              반려
            </button>
          </div>
        ) : null}

        {canPay ? (
          <button
            type="button"
            onClick={() => updateApproval("pay")}
            disabled={Boolean(busyAction)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0f6894] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busyAction === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
            지급 완료 처리
          </button>
        ) : null}

        {status === "PAID" ? (
          <div className="flex items-center gap-2 rounded-md bg-[#e8f5fb] px-3 py-3 text-sm font-medium text-marine">
            <CheckCircle2 className="h-4 w-4" />
            지급 완료된 지출입니다.
          </div>
        ) : null}

        {!isApprover && (status === "REQUESTED" || status === "APPROVED") ? (
          <p className="rounded-md bg-paper px-3 py-3 text-xs leading-5 text-steel">
            승인 완료와 지급 처리는 CEO·관리자·회계 권한에서 진행할 수 있습니다.
          </p>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-marine">{message}</p> : null}
    </section>
  );
}
