"use client";

import { useMemo, useState } from "react";
import { Camera, Loader2, Save, Upload } from "lucide-react";

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
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReceiptResult>(emptyResult);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

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

      setStatus("saved");
      setMessage("카드 영수증과 지출이 저장되었습니다.");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 지출 저장에 실패했습니다.");
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
                setStatus("idle");
                setMessage("");
              }}
            />
          </label>
          <button
            type="button"
            onClick={analyze}
            disabled={!file || status === "analyzing" || status === "saving"}
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
              disabled={status !== "done" || status === "saving"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-marine bg-white px-3 py-2.5 text-sm font-medium text-marine disabled:opacity-50"
            >
              {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              검수 결과를 지출로 저장
            </button>
          </div>
        </div>
      </div>

      {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-[#b42318]" : "text-marine"}`}>{message}</p> : null}
    </section>
  );
}
