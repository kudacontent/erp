"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2, Save, Upload } from "lucide-react";

type OcrResult = {
  companyName: string;
  contactName: string;
  position: string;
  department: string;
  mobile: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  clientType: string;
  confidence: number;
};

const emptyResult: OcrResult = {
  companyName: "",
  contactName: "",
  position: "",
  department: "",
  mobile: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  clientType: "협력업체",
  confidence: 0
};

export function BusinessCardOcrForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResult>(emptyResult);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  async function handleAnalyze() {
    if (!file) {
      return;
    }

    setStatus("analyzing");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ocr/business-card", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(data.message ?? "분석에 실패했습니다.");
      return;
    }

    setResult(data.result);
    setStatus("done");
  }

  function mapClientType(type: string) {
    const map: Record<string, string> = {
      선사: "SHIP_OWNER",
      발주처: "CLIENT",
      협력업체: "PARTNER",
      공급업체: "SUPPLIER",
      정비업체: "MAINTENANCE",
      잠재고객: "PROSPECT",
      기타: "OTHER"
    };

    return map[type] ?? "OTHER";
  }

  async function handleSave() {
    if (!result.companyName || !result.contactName) {
      setStatus("error");
      setMessage("회사명과 이름을 확인하세요.");
      return;
    }

    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: result.companyName,
        clientType: mapClientType(result.clientType),
        phone: result.phone,
        email: result.email,
        address: result.address,
        memo: result.website ? `웹사이트: ${result.website}` : "",
        contactName: result.contactName,
        contactPosition: result.position,
        contactPhone: result.mobile || result.phone,
        contactEmail: result.email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(data.message ?? "저장에 실패했습니다.");
      return;
    }

    setStatus("saved");
    router.push(`/clients/${data.client.id}`);
    router.refresh();
  }

  function updateField<K extends keyof OcrResult>(key: K, value: OcrResult[K]) {
    setResult((current) => ({ ...current, [key]: value }));
  }

  const inputClass = "mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/clients" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            거래처 목록
          </Link>
          <h2 className="text-3xl font-bold text-ink">명함 스캔</h2>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white"
          disabled={status !== "done" && status !== "saving"}
          onClick={handleSave}
        >
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          거래처로 저장
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">이미지</h3>
            </div>

            <label className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="명함 미리보기" className="max-h-72 rounded-md object-contain" />
              ) : (
                <>
                  <Upload className="h-9 w-9 text-marine" />
                  <p className="mt-3 text-sm font-medium text-ink">명함 이미지 선택</p>
                  <p className="mt-1 text-xs text-steel">JPG, PNG, HEIC</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <button
              type="button"
              disabled={!file || status === "analyzing"}
              onClick={handleAnalyze}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              분석
            </button>
            {status === "error" && message ? <p className="mt-3 text-sm text-[#075985]">{message}</p> : null}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-bold text-ink">검수 결과</h3>
            {result.confidence > 0 ? (
              <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-marine">
                신뢰도 {Math.round(result.confidence * 100)}%
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-steel">회사명</span>
              <input className={inputClass} value={result.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">거래처 유형</span>
              <input className={inputClass} value={result.clientType} onChange={(event) => updateField("clientType", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">이름</span>
              <input className={inputClass} value={result.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">직책</span>
              <input className={inputClass} value={result.position} onChange={(event) => updateField("position", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">부서</span>
              <input className={inputClass} value={result.department} onChange={(event) => updateField("department", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">휴대폰</span>
              <input className={inputClass} value={result.mobile} onChange={(event) => updateField("mobile", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">전화번호</span>
              <input className={inputClass} value={result.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-steel">이메일</span>
              <input className={inputClass} value={result.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-steel">주소</span>
              <input className={inputClass} value={result.address} onChange={(event) => updateField("address", event.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-steel">웹사이트</span>
              <input className={inputClass} value={result.website} onChange={(event) => updateField("website", event.target.value)} />
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}
