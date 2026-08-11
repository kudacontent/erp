"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, Plus, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";

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

const storageKey = "kudalabs-estimate-draft-v1";
const paperInputClass = "min-w-0 rounded-sm border-0 bg-transparent p-0 text-inherit outline-none transition placeholder:text-gray-400 focus:bg-[#fff7c2] focus:ring-1 focus:ring-[#55c5df]";
const paperBlockInputClass = `${paperInputClass} w-full`;
const paperNumberInputClass = `${paperInputClass} w-full text-right tabular-nums`;

const initialEstimate: EstimateForm = {
  date: "",
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

export function EstimateWorkspace() {
  const [form, setForm] = useState<EstimateForm>(cloneInitialEstimate);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
  }, []);

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

  function saveDraft() {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
    setMessage("견적서 초안을 이 브라우저에 저장했습니다.");
  }

  function resetDraft() {
    if (!window.confirm("새 견적서를 작성할까요? 저장하지 않은 내용은 사라집니다.")) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    setForm(cloneInitialEstimate());
    setMessage("새 견적서 양식을 열었습니다.");
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
        <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <Save className="h-4 w-4" />
          내용 저장
        </button>
        <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
          <RotateCcw className="h-4 w-4" />
          새로 작성
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
          <Upload className="h-4 w-4 text-marine" />
          도장 등록
          <input type="file" accept="image/*" className="sr-only" onChange={handleStampUpload} />
        </label>
        <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
          <Plus className="h-4 w-4 text-marine" />
          부문 추가
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#b42318] px-3 py-2 text-sm font-medium text-white">
          <Printer className="h-4 w-4" />
          PDF / 인쇄
        </button>
        <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-md bg-[#2563eb] px-3 py-2 text-sm font-medium text-white">
          <Download className="h-4 w-4" />
          Excel 다운로드
        </button>
        <p className="w-full text-xs text-steel sm:ml-auto sm:w-auto">노란색으로 강조된 문서 안의 항목을 직접 입력하세요.</p>
        {message ? <p className="w-full text-xs font-medium text-marine sm:w-auto">{message}</p> : null}
      </div>

      <section className="document-preview-pane min-w-0 overflow-x-auto rounded-md border border-line bg-[#f3f4f6] p-2 sm:p-4">
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
                  <tr><td className="w-16 border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">사업자번호</td><td className="border border-[#333] p-1"><input aria-label="공급자 사업자번호" className={paperBlockInputClass} value={form.supplierNumber} onChange={(event) => updateField("supplierNumber", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">상호</td><td className="border border-[#333] p-1"><input aria-label="공급자 상호" className={paperBlockInputClass} value={form.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">대표</td><td className="border border-[#333] p-1"><input aria-label="공급자 대표" className={paperBlockInputClass} value={form.supplierRepresentative} onChange={(event) => updateField("supplierRepresentative", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">소재지</td><td className="border border-[#333] p-1"><input aria-label="공급자 소재지" className={paperBlockInputClass} value={form.supplierAddress} onChange={(event) => updateField("supplierAddress", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">연락처</td><td className="border border-[#333] p-1"><input aria-label="공급자 연락처" className={paperBlockInputClass} value={form.supplierPhone} onChange={(event) => updateField("supplierPhone", event.target.value)} /></td></tr>
                  <tr><td className="border border-[#333] bg-[#f8f9fa] p-1 text-center font-bold">e-mail</td><td className="border border-[#333] p-1"><input type="email" aria-label="공급자 이메일" className={`${paperBlockInputClass} text-blue-600`} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></td></tr>
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
                  <tr className="bg-[#f1f5f9]"><td colSpan={6} className="border border-[#333] px-3 py-1"><div className="flex items-center gap-2"><span className="shrink-0 font-bold">{sectionIndex + 1}.</span><input aria-label={`${sectionIndex + 1}번 부문`} className={`${paperInputClass} w-full font-bold`} value={section.title} onChange={(event) => updateSection(section.id, event.target.value)} /><button type="button" onClick={() => removeSection(section.id)} className="print:hidden rounded p-1 text-gray-500 hover:bg-white hover:text-[#b42318]" aria-label={`${section.title} 부문 삭제`}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>
                  {section.rows.map((row) => {
                    const supply = row.quantity * row.unitPrice;
                    return <tr key={row.id}><td className="break-words border border-[#333] p-2"><input aria-label="견적 품명" className={paperBlockInputClass} value={row.item} onChange={(event) => updateRow(section.id, row.id, "item", event.target.value)} /></td><td className="break-words border border-[#333] p-2 text-center"><input aria-label="견적 규격" className={`${paperBlockInputClass} text-center`} value={row.spec} onChange={(event) => updateRow(section.id, row.id, "spec", event.target.value)} /></td><td className="border border-[#333] p-2 text-center"><input type="number" min="0" aria-label="견적 수량" className={`${paperBlockInputClass} text-center`} value={row.quantity} onChange={(event) => updateRow(section.id, row.id, "quantity", event.target.value)} /></td><td className="border border-[#333] p-2 text-right"><input inputMode="numeric" aria-label="견적 단가" className={paperNumberInputClass} value={row.unitPrice || ""} onChange={(event) => updateRow(section.id, row.id, "unitPrice", event.target.value)} /></td><td className="border border-[#333] p-2 text-right font-bold">{formatMoney(supply)}</td><td className="border border-[#333] p-2 text-right text-gray-500">{formatMoney(Math.floor(supply * 0.1))}<button type="button" onClick={() => removeRow(section.id, row.id)} className="print:hidden float-right ml-1 rounded p-0.5 text-gray-400 hover:text-[#b42318]" aria-label="견적 행 삭제"><Trash2 className="h-3 w-3" /></button></td></tr>;
                  })}
                  <tr className="print:hidden"><td colSpan={6} className="border border-[#333] p-1 text-right"><button type="button" onClick={() => addRow(section.id)} className="inline-flex items-center gap-1 rounded bg-[#eaf5f8] px-2 py-1 text-[10px] font-bold text-marine"><Plus className="h-3 w-3" />행 추가</button></td></tr>
                </Fragment>
              ))}
            </tbody>
            <tfoot><tr className="bg-gray-50 font-bold"><td colSpan={4} className="border border-[#333] p-2 text-center">합 계 (Total)</td><td className="border border-[#333] p-2 text-right">{formatMoney(totals.supply)}</td><td className="border border-[#333] p-2 text-right text-gray-500">{formatMoney(totals.tax)}</td></tr></tfoot>
          </table>

          <div className="mt-7">
            <h4 className="mb-1 border-b border-gray-800 pb-1 text-sm font-bold">기타 사항</h4>
            <table className="w-full border-collapse border border-[#333] text-[10px]"><tbody><tr><td className="w-16 border border-[#333] bg-[#f8f9fa] p-2 text-center font-bold">유효기간</td><td className="border border-[#333] p-2"><input aria-label="견적서 유효기간" className={paperBlockInputClass} value={form.validity} onChange={(event) => updateField("validity", event.target.value)} /></td></tr><tr><td className="border border-[#333] bg-[#f8f9fa] p-2 text-center font-bold">기타 내용</td><td className="border border-[#333] p-2"><textarea aria-label="견적서 기타 내용" className={`${paperBlockInputClass} min-h-16 resize-y whitespace-pre-wrap`} value={form.otherContent} onChange={(event) => updateField("otherContent", event.target.value)} placeholder="추가 전달사항을 입력하세요." /></td></tr></tbody></table>
          </div>
          <p className="mt-4 text-right text-[9px] text-gray-500"><input aria-label="공급자 상호 하단 표시" className={`${paperInputClass} w-auto text-right`} value={form.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} /> · <input type="email" aria-label="공급자 이메일 하단 표시" className={`${paperInputClass} w-auto text-right`} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></p>
        </article>
      </section>

      {!ready ? <span className="sr-only">견적서 초안 불러오는 중</span> : null}
    </div>
  );
}
