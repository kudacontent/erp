"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, List, Loader2, Plus, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { EstimateForEdit } from "@/lib/estimates-service";

type EstimateRow = {
  id: string;
  item: string;
  spec: string;
  quantity: number;
  unitPrice: number;
};

type EstimateSection = {
  id: string;
  title: string;
  rows: EstimateRow[];
};

type EstimateForm = {
  date: string;
  clientId: string;
  status: EstimateStatus;
  recipient: string;
  reference: string;
  title: string;
  supplierNumber: string;
  supplierName: string;
  supplierRepresentative: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  validity: string;
  otherContent: string;
  stampUrl: string;
  sections: EstimateSection[];
};

type EstimateStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

const STATUS_OPTIONS: Array<{ value: EstimateStatus; label: string }> = [
  { value: "DRAFT", label: "작성 중" },
  { value: "SENT", label: "발송" },
  { value: "ACCEPTED", label: "수주 확정" },
  { value: "REJECTED", label: "실주" },
  { value: "EXPIRED", label: "기한 만료" }
];

/** 저장 전 새 견적서만 브라우저에 임시 보관한다. 저장하고 나면 DB 가 원본이다 */
const storageKey = "kudalabs-estimate-draft-v1";
const paperInputClass = "min-w-0 rounded-sm border-0 bg-transparent p-0 text-inherit outline-none transition placeholder:text-gray-400 focus:bg-edit-bg focus:ring-1 focus:ring-edit-ring";
const paperBlockInputClass = `${paperInputClass} w-full`;
const paperNumberInputClass = `${paperInputClass} w-full text-right tabular-nums`;

const initialEstimate: EstimateForm = {
  date: "",
  clientId: "",
  status: "DRAFT",
  recipient: "",
  reference: "",
  title: "견적 프로젝트",
  supplierNumber: "000-86-00000",
  supplierName: "주식회사 쿠다랩스",
  supplierRepresentative: "박승진",
  supplierAddress: "경상남도 창원시 / 김해시",
  supplierPhone: "010-0000-0000",
  supplierEmail: "contact@kudalabs.co.kr",
  validity: "발행일로부터 1개월",
  otherContent: "",
  stampUrl: "",
  sections: [
    {
      id: "section-1",
      title: "용역 범위",
      rows: [{ id: "row-1", item: "견적 항목을 입력하세요", spec: "-", quantity: 1, unitPrice: 0 }]
    }
  ]
};

function cloneInitialEstimate() {
  return JSON.parse(JSON.stringify(initialEstimate)) as EstimateForm;
}

function formatMoney(value: number) {
  return value.toLocaleString("ko-KR");
}

function toNumber(value: string | number) {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

/**
 * DB 에 저장된 견적서를 화면 형태(부문 → 행)로 되돌린다.
 *
 * DB 에는 품목이 한 줄씩 평평하게 들어 있고 부문은 각 품목의 section 문자열이다.
 * 표를 그릴 때는 다시 부문별로 묶어야 하므로 여기서 순서를 지키며 그룹핑한다.
 */
function fromSaved(estimate: EstimateForEdit): EstimateForm {
  const base = cloneInitialEstimate();
  const sections: EstimateSection[] = [];

  estimate.items.forEach((item) => {
    const title = item.section || "견적 내역";
    let section = sections.find((candidate) => candidate.title === title);

    if (!section) {
      section = { id: createId("section"), title, rows: [] };
      sections.push(section);
    }

    section.rows.push({
      id: item.id,
      item: item.name,
      spec: item.spec || "-",
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  });

  return {
    ...base,
    date: estimate.issuedAt,
    clientId: estimate.clientId ?? "",
    status: (estimate.status === "CONVERTED" ? "ACCEPTED" : estimate.status) as EstimateStatus,
    recipient: estimate.recipient || estimate.clientName || "",
    reference: estimate.reference,
    title: estimate.title,
    supplierNumber: estimate.supplierNumber || base.supplierNumber,
    supplierName: estimate.supplierName || base.supplierName,
    supplierRepresentative: estimate.supplierRepresentative || base.supplierRepresentative,
    supplierAddress: estimate.supplierAddress || base.supplierAddress,
    supplierPhone: estimate.supplierPhone || base.supplierPhone,
    supplierEmail: estimate.supplierEmail || base.supplierEmail,
    validity: estimate.validityNote || base.validity,
    otherContent: estimate.otherContent,
    sections: sections.length ? sections : base.sections
  };
}

type EstimateWorkspaceProps = {
  /** 기존 견적서를 여는 경우. 없으면 새 견적서 */
  estimate?: EstimateForEdit | null;
  /** 거래처 연결 선택지 */
  clients?: Array<{ id: string; name: string }>;
  /** 저장 권한이 없으면 보기·인쇄만 가능하다 */
  canEdit?: boolean;
};

export function EstimateWorkspace({ estimate = null, clients = [], canEdit = true }: EstimateWorkspaceProps) {
  const router = useRouter();
  const [form, setForm] = useState<EstimateForm>(() => (estimate ? fromSaved(estimate) : cloneInitialEstimate()));
  const [savedId, setSavedId] = useState<string | null>(estimate?.id ?? null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const converted = Boolean(estimate?.contractId);
  const editable = canEdit && !converted;

  useEffect(() => {
    // 저장된 견적서를 열었으면 DB 값이 원본이다. 브라우저 임시본은 건드리지 않는다
    if (estimate) {
      setReady(true);
      return;
    }

    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<EstimateForm>;
        setForm({
          ...cloneInitialEstimate(),
          ...saved,
          sections: Array.isArray(saved.sections) && saved.sections.length ? saved.sections : cloneInitialEstimate().sections
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setReady(true);
  }, [estimate]);

  const totals = useMemo(() => {
    const supply = form.sections.reduce(
      (sectionTotal, section) => sectionTotal + section.rows.reduce((rowTotal, row) => rowTotal + Math.max(0, row.quantity) * Math.max(0, row.unitPrice), 0),
      0
    );
    const tax = Math.floor(supply * 0.1);

    return { supply, tax, total: supply + tax };
  }, [form.sections]);

  function updateField<K extends Exclude<keyof EstimateForm, "sections">>(field: K, value: EstimateForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function updateSection(sectionId: string, value: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, title: value } : section)
    }));
  }

  function updateRow(sectionId: string, rowId: string, field: keyof Omit<EstimateRow, "id">, value: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        rows: section.rows.map((row) => row.id !== rowId ? row : {
          ...row,
          [field]: field === "item" || field === "spec" ? value : Math.max(0, toNumber(value))
        })
      })
    }));
  }

  function addSection() {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, { id: createId("section"), title: "새 부문 제목", rows: [{ id: createId("row"), item: "", spec: "-", quantity: 1, unitPrice: 0 }] }]
    }));
  }

  function removeSection(sectionId: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.length === 1 ? current.sections : current.sections.filter((section) => section.id !== sectionId)
    }));
  }

  function addRow(sectionId: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        rows: [...section.rows, { id: createId("row"), item: "", spec: "-", quantity: 1, unitPrice: 0 }]
      })
    }));
  }

  function removeRow(sectionId: string, rowId: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id !== sectionId ? section : {
        ...section,
        rows: section.rows.length === 1 ? section.rows : section.rows.filter((row) => row.id !== rowId)
      })
    }));
  }

  /** 화면의 부문·행을 서버가 받는 평평한 품목 배열로 바꾼다 */
  function toItems() {
    return form.sections.flatMap((section) =>
      section.rows
        .filter((row) => row.item.trim().length > 0)
        .map((row) => ({
          section: section.title.trim() || null,
          name: row.item.trim(),
          spec: row.spec.trim() || null,
          unit: null,
          quantity: Math.max(0, row.quantity),
          unitPrice: Math.max(0, row.unitPrice),
          taxType: "TAXABLE" as const,
          memo: null
        }))
    );
  }

  /**
   * 서버에 저장한다.
   *
   * 새 견적서면 POST 로 만들고 견적번호를 받아 그 주소로 이동한다.
   * 이미 저장된 견적서면 PUT 으로 표 전체를 덮어쓴다.
   */
  async function save() {
    const items = toItems();

    if (!form.title.trim()) {
      setError("견적서 제목을 입력하세요.");
      return;
    }

    if (items.length === 0) {
      setError("품명이 입력된 항목이 최소 하나는 있어야 합니다.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      title: form.title.trim(),
      clientId: form.clientId || null,
      recipient: form.recipient.trim() || null,
      reference: form.reference.trim() || null,
      status: form.status,
      issuedAt: form.date || null,
      validityNote: form.validity.trim() || null,
      otherContent: form.otherContent.trim() || null,
      supplierNumber: form.supplierNumber.trim() || null,
      supplierName: form.supplierName.trim() || null,
      supplierRepresentative: form.supplierRepresentative.trim() || null,
      supplierAddress: form.supplierAddress.trim() || null,
      supplierPhone: form.supplierPhone.trim() || null,
      supplierEmail: form.supplierEmail.trim() || null,
      items
    };

    try {
      const response = await fetch(savedId ? `/api/estimates/${savedId}` : "/api/estimates", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const firstFieldError = data.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;
        setError(data.message ?? firstFieldError ?? "저장하지 못했습니다.");
        return;
      }

      if (!savedId) {
        // 새로 만든 견적은 브라우저 임시본을 비우고 저장된 주소로 옮긴다
        window.localStorage.removeItem(storageKey);
        setSavedId(data.estimate.id);
        router.replace(`/documents/estimate/${data.estimate.id}`);
        return;
      }

      setMessage(`${data.estimate.estimateNo} 견적서를 저장했습니다.`);
      router.refresh();
    } catch {
      setError("저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  /** 저장 전 새 견적서를 브라우저에 임시 보관한다 (탭을 닫아도 남도록) */
  function keepDraft() {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
    setMessage("이 브라우저에 임시 보관했습니다. 다른 사람이 보려면 '저장'을 누르세요.");
  }

  function resetDraft() {
    if (!window.confirm("새 견적서를 작성할까요? 저장하지 않은 내용은 사라집니다.")) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    setForm(cloneInitialEstimate());
    setSavedId(null);
    setMessage("새 견적서 양식을 열었습니다.");
    router.push("/documents/estimate/new");
  }

  function handleStampUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateField("stampUrl", typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function downloadCsv() {
    const rows: Array<Array<string | number>> = [["부문", "품명", "규격", "수량", "단가", "공급가액", "세액(10%)"]];

    form.sections.forEach((section) => {
      section.rows.forEach((row) => {
        const supply = row.quantity * row.unitPrice;
        rows.push([section.title, row.item, row.spec, row.quantity, row.unitPrice, supply, Math.floor(supply * 0.1)]);
      });
    });

    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kudalabs-estimate.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="estimate-workspace document-workspace">
      <div className="document-toolbar mb-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-3">
        <Link href="/documents/estimate" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
          <List className="h-4 w-4 text-marine" />
          견적서 목록
        </Link>
        {editable ? (
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savedId ? "저장" : "저장하고 등록"}
          </button>
        ) : null}
        {editable && !savedId ? (
          <button type="button" onClick={keepDraft} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <Save className="h-4 w-4 text-steel" />
            임시 보관
          </button>
        ) : null}
        {editable ? (
          <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <RotateCcw className="h-4 w-4" />
            새로 작성
          </button>
        ) : null}
        {editable ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <Upload className="h-4 w-4 text-marine" />
            도장 등록
            <input type="file" accept="image/*" className="sr-only" onChange={handleStampUpload} />
          </label>
        ) : null}
        {editable ? (
          <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <Plus className="h-4 w-4 text-marine" />
            부문 추가
          </button>
        ) : null}
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-danger-fg px-3 py-2 text-sm font-medium text-white">
          <Printer className="h-4 w-4" />
          PDF / 인쇄
        </button>
        <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white">
          <Download className="h-4 w-4" />
          Excel 다운로드
        </button>
        {editable ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <label className="inline-flex items-center gap-2 text-sm text-steel">
              거래처
              <select
                value={form.clientId}
                onChange={(event) => updateField("clientId", event.target.value)}
                className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
              >
                <option value="">연결 안 함</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-steel">
              상태
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as EstimateStatus)}
                className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <p className="w-full text-xs text-steel">
          {converted
            ? "계약으로 전환된 견적서입니다. 금액을 바꾸려면 연결된 계약에서 수정하세요."
            : "노란색으로 강조된 문서 안의 항목을 직접 입력하세요."}
        </p>
        {estimate ? <p className="w-full text-xs font-medium text-steel">견적번호 {estimate.estimateNo}</p> : null}
        {message ? <p className="w-full text-xs font-medium text-marine">{message}</p> : null}
        {error ? <p className="w-full rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs font-medium text-danger-fg">{error}</p> : null}
      </div>

      <section className="document-preview-pane min-w-0 overflow-x-auto rounded-md border border-line bg-surface-subtle p-2 sm:p-4">
        <article className="estimate-paper mx-auto w-full max-w-[794px] bg-white p-5 text-[#333] shadow-[0_0_15px_rgba(0,0,0,0.1)] sm:p-10">
          <div className="mb-5 flex flex-col items-stretch justify-between gap-4 border-b border-[#333] pb-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="min-w-0 flex-1">
              <h3 className="text-4xl font-black leading-none text-[#2c3e50]">견 적 서</h3>
              <p className="mt-2 text-[10px] uppercase tracking-[0.38em] text-gray-300">Estimate</p>
              <div className="mt-4 space-y-1 text-[11px]">
                <label className="flex items-center border-b border-gray-100 pb-1"><span className="w-14 shrink-0 font-bold text-gray-500">DATE</span><input type="date" aria-label="작성일" className={paperInputClass} value={form.date} onChange={(event) => updateField("date", event.target.value)} /></label>
                <label className="flex min-w-0 items-center border-b border-gray-100 pb-1"><span className="w-14 shrink-0 font-bold text-gray-500">수신</span><input aria-label="수신" className={`${paperInputClass} w-full`} placeholder="고객사명" value={form.recipient} onChange={(event) => updateField("recipient", event.target.value)} /></label>
                <label className="flex min-w-0 items-center border-b border-gray-100 pb-1"><span className="w-14 shrink-0 font-bold text-gray-500">참조</span><input aria-label="참조" className={`${paperInputClass} w-full`} placeholder="담당자 성함" value={form.reference} onChange={(event) => updateField("reference", event.target.value)} /></label>
              </div>
            </div>
            <div className="relative w-full sm:w-[270px] sm:shrink-0">
              <table className="w-full border-collapse border border-[#333] text-[10px]">
                <tbody>
                  <tr><th colSpan={2} className="border border-[#333] bg-[#f2f2f2] py-1 text-center tracking-[0.5em]">공 급 자</th></tr>
                  <tr><td className="w-16 border border-[#333] bg-surface-subtle p-1 text-center font-bold">사업자번호</td><td className="border border-[#333] p-1"><input aria-label="공급자 사업자번호" className={paperBlockInputClass} value={form.supplierNumber} onChange={(event) => updateField("supplierNumber", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-surface-subtle p-1 text-center font-bold">상호</td><td className="border border-[#333] p-1"><input aria-label="공급자 상호" className={paperBlockInputClass} value={form.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-surface-subtle p-1 text-center font-bold">대표</td><td className="border border-[#333] p-1"><input aria-label="공급자 대표" className={paperBlockInputClass} value={form.supplierRepresentative} onChange={(event) => updateField("supplierRepresentative", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-surface-subtle p-1 text-center font-bold">소재지</td><td className="border border-[#333] p-1"><input aria-label="공급자 소재지" className={paperBlockInputClass} value={form.supplierAddress} onChange={(event) => updateField("supplierAddress", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-surface-subtle p-1 text-center font-bold">연락처</td><td className="border border-[#333] p-1"><input aria-label="공급자 연락처" className={paperBlockInputClass} value={form.supplierPhone} onChange={(event) => updateField("supplierPhone", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-surface-subtle p-1 text-center font-bold">e-mail</td><td className="border border-[#333] p-1"><input type="email" aria-label="공급자 이메일" className={`${paperBlockInputClass} text-blue-600`} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></td></tr>
                </tbody>
              </table>
              {form.stampUrl ? <img src={form.stampUrl} alt="등록된 도장" className="absolute right-3 top-10 h-12 w-12 object-contain mix-blend-multiply" /> : null}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border border-gray-200 bg-gray-50 p-3">
            <span className="pl-1 text-[13px] font-bold text-gray-600">총 견적 금액 (VAT 포함)</span>
            <span className="text-2xl font-black text-[#2c3e50]">₩{formatMoney(totals.total)}</span>
          </div>

          <label className="mb-4 flex min-w-0 items-center gap-2 border-b border-gray-800 pb-1">
            <span className="shrink-0 text-lg font-bold">제목:</span>
            <input aria-label="견적서 제목" className={`${paperInputClass} w-full text-lg font-bold`} value={form.title} onChange={(event) => updateField("title", event.target.value)} />
          </label>

          <table className="w-full table-fixed border-collapse border border-[#333] text-[10px]">
            <colgroup><col style={{ width: "30%" }} /><col style={{ width: "14%" }} /><col style={{ width: "9%" }} /><col style={{ width: "17%" }} /><col style={{ width: "17%" }} /><col style={{ width: "13%" }} /></colgroup>
            <thead><tr className="bg-[#f2f2f2]"><th className="border border-[#333] p-2">품명</th><th className="border border-[#333] p-2">규격</th><th className="border border-[#333] p-2">수량</th><th className="border border-[#333] p-2">단가</th><th className="border border-[#333] p-2">공급가액</th><th className="border border-[#333] p-2">세액(10%)</th></tr></thead>
            <tbody>
              {form.sections.map((section, sectionIndex) => (
                <Fragment key={section.id}>
                  <tr className="bg-surface-subtle"><td colSpan={6} className="border border-[#333] px-3 py-1"><div className="flex items-center gap-2"><span className="shrink-0 font-bold">{sectionIndex + 1}.</span><input aria-label={`${sectionIndex + 1}번 부문`} className={`${paperInputClass} w-full font-bold`} value={section.title} onChange={(event) => updateSection(section.id, event.target.value)} /><button type="button" onClick={() => removeSection(section.id)} className="print:hidden rounded p-1 text-gray-500 hover:bg-white hover:text-danger-fg" aria-label={`${section.title} 부문 삭제`}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>
                  {section.rows.map((row) => {
                    const supply = row.quantity * row.unitPrice;
                    return <tr key={row.id}><td className="break-words border border-[#333] p-2"><input aria-label="견적 품명" className={paperBlockInputClass} value={row.item} onChange={(event) => updateRow(section.id, row.id, "item", event.target.value)} /></td><td className="break-words border border-[#333] p-2 text-center"><input aria-label="견적 규격" className={`${paperBlockInputClass} text-center`} value={row.spec} onChange={(event) => updateRow(section.id, row.id, "spec", event.target.value)} /></td><td className="border border-[#333] p-2 text-center"><input type="number" min="0" aria-label="견적 수량" className={`${paperBlockInputClass} text-center`} value={row.quantity} onChange={(event) => updateRow(section.id, row.id, "quantity", event.target.value)} /></td><td className="border border-[#333] p-2 text-right"><input inputMode="numeric" aria-label="견적 단가" className={paperNumberInputClass} value={row.unitPrice || ""} onChange={(event) => updateRow(section.id, row.id, "unitPrice", event.target.value)} /></td><td className="border border-[#333] p-2 text-right font-bold">{formatMoney(supply)}</td><td className="border border-[#333] p-2 text-right text-gray-500">{formatMoney(Math.floor(supply * 0.1))}<button type="button" onClick={() => removeRow(section.id, row.id)} className="print:hidden float-right ml-1 rounded p-0.5 text-gray-400 hover:text-danger-fg" aria-label="견적 행 삭제"><Trash2 className="h-3 w-3" /></button></td></tr>;
                  })}
                  <tr className="print:hidden"><td colSpan={6} className="border border-[#333] p-1 text-right"><button type="button" onClick={() => addRow(section.id)} className="inline-flex items-center gap-1 rounded bg-[#eaf5f8] px-2 py-1 text-[10px] font-bold text-marine"><Plus className="h-3 w-3" />행 추가</button></td></tr>
                </Fragment>
              ))}
            </tbody>
            <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={4} className="border border-[#333] p-2 text-center">합 계 (Total)</td><td className="border border-[#333] p-2 text-right">{formatMoney(totals.supply)}</td><td className="border border-[#333] p-2 text-right text-gray-500">{formatMoney(totals.tax)}</td></tr></tfoot>
          </table>

          <div className="mt-7">
            <h4 className="mb-1 border-b border-gray-800 pb-1 text-sm font-bold">기타 사항</h4>
            <table className="w-full border-collapse border border-[#333] text-[10px]"><tbody><tr><td className="w-16 border border-[#333] bg-surface-subtle p-2 text-center font-bold">유효기간</td><td className="border border-[#333] p-2"><input aria-label="견적서 유효기간" className={paperBlockInputClass} value={form.validity} onChange={(event) => updateField("validity", event.target.value)} /></td></tr><tr><td className="border border-[#333] bg-surface-subtle p-2 text-center font-bold">기타 내용</td><td className="border border-[#333] p-2"><textarea aria-label="견적서 기타 내용" className={`${paperBlockInputClass} min-h-16 resize-y whitespace-pre-wrap`} value={form.otherContent} onChange={(event) => updateField("otherContent", event.target.value)} placeholder="추가 전달사항을 입력하세요." /></td></tr></tbody></table>
          </div>
          <p className="mt-4 text-right text-[9px] text-gray-500"><input aria-label="공급자 상호 하단 표시" className={`${paperInputClass} w-auto text-right`} value={form.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} /> · <input type="email" aria-label="공급자 이메일 하단 표시" className={`${paperInputClass} w-auto text-right`} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></p>
        </article>
      </section>

      {!ready ? <span className="sr-only">견적서 초안 불러오는 중</span> : null}
    </div>
  );
}
