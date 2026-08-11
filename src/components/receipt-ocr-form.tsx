"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, Loader2, Save, Send, Upload } from "lucide-react";

type ReceiptResult = {
  merchantName: string;
  businessNumber: string;
  spentAt: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: string;
  cardLast4: string;
  approvalNumber: string;
  rawText: string;
  confidence: number;
  receiptImageUrl: string;
  receiptFileName: string;
  receiptMimeType: string;
};

type ApprovalStatus = "DRAFT" | "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";

const approvalLabels: Record<ApprovalStatus, string> = {
  DRAFT: "검토 완료",
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
  PAID: "지급 완료"
};

const emptyResult: ReceiptResult = {
  merchantName: "",
  businessNumber: "",
  spentAt: "",
  amount: 0,
  vatAmount: 0,
  totalAmount: 0,
  paymentMethod: "법인카드",
  cardLast4: "",
  approvalNumber: "",
  rawText: "",
  confidence: 0,
  receiptImageUrl: "",
  receiptFileName: "",
  receiptMimeType: ""
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function ReceiptOcrForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptResult>(emptyResult);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "saving" | "saved" | "updating" | "error">("idle");
  const [expenseId, setExpenseId] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("DRAFT");
  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  function updateResult<K extends keyof ReceiptResult>(key: K, value: ReceiptResult[K]) {
    setResult((current) => ({ ...current, [key]: value }));
  }

  async function analyze() {
    if (!file) {
      setStatus("error");
      setMessage("카드 영수증 이미지를 먼저 선택하세요.");
      return;
    }

    setStatus("analyzing");
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ocr/receipt", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "영수증 분석에 실패했습니다.");
        return;
      }

      setResult(data.result);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 영수증 분석에 실패했습니다.");
    }
  }

  async function saveExpense() {
    if (!result.merchantName || !result.spentAt || !result.totalAmount) {
      setStatus("error");
      setMessage("상호명, 지출일, 합계 금액을 확인하세요.");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseCategory: "법인카드 식음료/운영비",
          amount: result.amount,
          vatAmount: result.vatAmount,
          totalAmount: result.totalAmount,
          paymentMethod: result.paymentMethod,
          spentAt: result.spentAt,
          receiptImageUrl: result.receiptImageUrl,
          receiptFileName: result.receiptFileName,
          receiptMimeType: result.receiptMimeType,
          geminiAnalysis: JSON.stringify({
            merchantName: result.merchantName,
            businessNumber: result.businessNumber,
            cardLast4: result.cardLast4,
            approvalNumber: result.approvalNumber,
            rawText: result.rawText,
            confidence: result.confidence
          })
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "지출 저장에 실패했습니다.");
        return;
      }

      setExpenseId(data.expense.id);
      setApprovalStatus((data.expense.approvalStatus as ApprovalStatus) || "DRAFT");
      setStatus("saved");
      setMessage("검수 결과가 지출로 저장되었습니다. 승인 요청을 진행하세요.");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 지출 저장에 실패했습니다.");
    }
  }

  async function updateApproval(action: "request" | "approve" | "reject" | "pay") {
    if (!expenseId) {
      return;
    }

    setStatus("updating");
    setMessage("");

    try {
      const response = await fetch(`/api/expenses/${expenseId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "지출 처리에 실패했습니다.");
        return;
      }

      setApprovalStatus(data.expense.approvalStatus as ApprovalStatus);
      setStatus("saved");
      setMessage(data.message ?? "지출 처리 단계가 변경되었습니다.");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 지출 처리에 실패했습니다.");
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">카드 영수증 스캔</h3>
          </div>
          <p className="mt-1 text-sm text-steel">휴대폰 카메라로 촬영하면 OCR 결과를 검수한 뒤 지출로 저장합니다.</p>
        </div>
        {result.confidence > 0 ? (
          <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-marine">
            OCR 신뢰도 {Math.round(result.confidence * 100)}%
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div>
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper px-4 py-5 text-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="카드 영수증 미리보기" className="max-h-44 rounded-md object-contain" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-marine" />
                <p className="mt-2 text-sm font-medium text-ink">영수증 사진 선택 또는 촬영</p>
                <p className="mt-1 text-xs text-steel">JPG, PNG · 최대 10MB</p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(emptyResult);
                setExpenseId("");
                setApprovalStatus("DRAFT");
                setStatus("idle");
                setMessage("");
              }}
            />
          </label>
          <button
            type="button"
            onClick={analyze}
            disabled={!file || status === "analyzing" || status === "saving" || status === "updating"}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {status === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            영수증 분석
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-steel">가맹점</span>
            <input className={inputClass} value={result.merchantName} onChange={(event) => updateResult("merchantName", event.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">지출일</span>
            <input type="date" className={inputClass} value={result.spentAt} onChange={(event) => updateResult("spentAt", event.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">공급가액</span>
            <input type="number" min="0" className={inputClass} value={result.amount || ""} onChange={(event) => updateResult("amount", Number(event.target.value) || 0)} />
            <span className="mt-1 block text-[11px] text-steel">{formatMoney(result.amount)}원</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">부가세</span>
            <input type="number" min="0" className={inputClass} value={result.vatAmount || ""} onChange={(event) => updateResult("vatAmount", Number(event.target.value) || 0)} />
            <span className="mt-1 block text-[11px] text-steel">{formatMoney(result.vatAmount)}원</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">합계 금액</span>
            <input type="number" min="0" className={inputClass} value={result.totalAmount || ""} onChange={(event) => updateResult("totalAmount", Number(event.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">결제수단</span>
            <select className={inputClass} value={result.paymentMethod} onChange={(event) => updateResult("paymentMethod", event.target.value)}>
              <option>법인카드</option>
              <option>개인카드</option>
              <option>현금</option>
              <option>계좌이체</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">카드 끝 4자리</span>
            <input className={inputClass} value={result.cardLast4} maxLength={4} onChange={(event) => updateResult("cardLast4", event.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-steel">승인번호</span>
            <input className={inputClass} value={result.approvalNumber} onChange={(event) => updateResult("approvalNumber", event.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={saveExpense}
              disabled={status !== "done"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-marine bg-white px-3 py-2.5 text-sm font-medium text-marine disabled:opacity-50"
            >
              {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              검수 결과를 지출로 저장
            </button>
          </div>
        </div>
      </div>

      {expenseId ? (
        <div className="mt-5 rounded-md border border-[#b6ddea] bg-[#f3fbfe] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-marine" />
              <div>
                <p className="font-bold text-ink">지출 워크플로우</p>
                <p className="mt-1 text-sm text-steel">현재 단계: {approvalLabels[approvalStatus]}</p>
              </div>
            </div>
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-marine">영수증 검수 완료</span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {approvalStatus === "DRAFT" || approvalStatus === "REJECTED" ? (
              <button
                type="button"
                onClick={() => updateApproval("request")}
                disabled={status === "updating"}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                승인 요청
              </button>
            ) : null}
            {approvalStatus === "REQUESTED" ? (
              <>
                <button
                  type="button"
                  onClick={() => updateApproval("approve")}
                  disabled={status === "updating"}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  승인 처리
                </button>
                <button
                  type="button"
                  onClick={() => updateApproval("reject")}
                  disabled={status === "updating"}
                  className="rounded-md border border-line bg-white px-3 py-2.5 text-sm font-medium text-steel disabled:opacity-60"
                >
                  반려
                </button>
              </>
            ) : null}
            {approvalStatus === "APPROVED" ? (
              <button
                type="button"
                onClick={() => updateApproval("pay")}
                disabled={status === "updating"}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                지급 완료 처리
              </button>
            ) : null}
            <Link href="/expenses" className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-2.5 text-sm font-medium text-steel">
              지출 목록 보기
            </Link>
          </div>
        </div>
      ) : null}

      {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-[#b42318]" : "text-marine"}`}>{message}</p> : null}
    </section>
  );
}
