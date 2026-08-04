"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type TaxInvoiceIssuePayload = {
  contractId: string;
  clientName: string;
  itemName: string;
  supplyAmount: string;
  vatAmount: string;
  totalAmount: string;
  dueDate: string;
};

type TaxInvoiceIssueResult = {
  provider: string;
  status: string;
  approvalNumber: string;
  requestId: string;
  issuedAt: string;
};

export function TaxInvoiceIssuePanel({ payload }: { payload: TaxInvoiceIssuePayload }) {
  const [status, setStatus] = useState<"idle" | "issuing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TaxInvoiceIssueResult | null>(null);

  async function handleIssue() {
    setStatus("issuing");
    setMessage("");
    setResult(null);

    const response = await fetch("/api/tax-invoices/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(data.message ?? "세금계산서 발행 요청에 실패했습니다.");
      return;
    }

    setResult(data.result);
    setStatus("done");
  }

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <h3 className="mb-4 font-bold text-ink">발행 테스트</h3>
      <button
        type="button"
        onClick={handleIssue}
        disabled={status === "issuing"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "issuing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        테스트 발행 요청
      </button>

      {status === "error" && message ? <p className="mt-3 text-sm font-medium text-[#075985]">{message}</p> : null}

      {result ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-[#ecfeff] px-3 py-3 text-sm font-bold text-marine">
            <CheckCircle2 className="h-4 w-4" />
            {result.status}
          </div>
          <div className="rounded-md bg-paper px-3 py-3">
            <p className="text-sm text-steel">승인번호</p>
            <p className="mt-1 break-all text-sm font-bold text-ink">{result.approvalNumber}</p>
          </div>
          <div className="rounded-md bg-paper px-3 py-3">
            <p className="text-sm text-steel">요청 ID</p>
            <p className="mt-1 break-all text-sm font-bold text-ink">{result.requestId}</p>
          </div>
          <div className="rounded-md bg-paper px-3 py-3">
            <p className="text-sm text-steel">연동 모드</p>
            <p className="mt-1 text-sm font-bold text-ink">{result.provider}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
