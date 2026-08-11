"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Plus, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceForm = {
  supplier: string;
  supplierCeo: string;
  supplierNumber: string;
  supplierAddress: string;
  supplierEmail: string;
  supplierWebsite: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client: string;
  clientCeo: string;
  clientNumber: string;
  manager: string;
  phone: string;
  clientEmail: string;
  project: string;
  vessel: string;
  location: string;
  bank: string;
  account: string;
  holder: string;
  logoUrl: string;
  items: InvoiceItem[];
};

const storageKey = "kudalabs-invoice-draft-v1";
const paperInputClass = "min-w-0 rounded-sm border-0 bg-transparent p-0 text-inherit outline-none transition placeholder:text-[#9aa7b0] focus:bg-[#fff7c2] focus:ring-1 focus:ring-[#55c5df]";
const paperBlockInputClass = `${paperInputClass} w-full`;
const paperNumberInputClass = `${paperInputClass} w-full text-right tabular-nums`;

const initialInvoice: InvoiceForm = {
  supplier: "주식회사 쿠다랩스",
  supplierCeo: "박승진",
  supplierNumber: "000-86-00000",
  supplierAddress: "경상남도 창원시 / 김해시",
  supplierEmail: "contact@kudalabs.co.kr",
  supplierWebsite: "www.kudalabs.co.kr",
  invoiceNumber: "KUDA-INV-2026-001",
  issueDate: "",
  dueDate: "",
  client: "",
  clientCeo: "",
  clientNumber: "",
  manager: "",
  phone: "",
  clientEmail: "",
  project: "선박 수중 ROV Hull Survey 및 FROSIO 도장 상태 진단",
  vessel: "",
  location: "",
  bank: "",
  account: "",
  holder: "주식회사 쿠다랩스",
  logoUrl: "/kuda-labs-logo.png",
  items: [
    { id: "invoice-item-1", description: "선박 수중 ROV 정밀 검사 (Hull, Rudder, Propeller)", quantity: 1, unitPrice: 3500000 },
    { id: "invoice-item-2", description: "FROSIO 공인 검사관 도장/부식 상태 진단 및 AI 분석 리포트", quantity: 1, unitPrice: 1000000 },
    { id: "invoice-item-3", description: "현장 장비 운송 및 동원/해제비 (MOB / DEMOB)", quantity: 1, unitPrice: 500000 }
  ]
};

function cloneInitialInvoice() {
  return JSON.parse(JSON.stringify(initialInvoice)) as InvoiceForm;
}

function createId() {
  return `invoice-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatMoney(value: number) {
  return `₩ ${Math.round(value).toLocaleString("ko-KR")}`;
}

function toNumber(value: string | number) {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function InvoiceLogo({ src, className, width, height }: { src: string; className?: string; width: number; height: number }) {
  if (src.startsWith("data:")) {
    return <img src={src} alt="KUDA LABS" className={className} />;
  }

  return <Image src={src} alt="KUDA LABS" width={width} height={height} className={className} unoptimized />;
}

export function InvoiceWorkspace() {
  const [form, setForm] = useState<InvoiceForm>(cloneInitialInvoice);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<InvoiceForm>;
        setForm({
          ...cloneInitialInvoice(),
          ...saved,
          items: Array.isArray(saved.items) && saved.items.length ? saved.items : cloneInitialInvoice().items
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setReady(true);
  }, []);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0);
    const vat = Math.floor(subtotal * 0.1);
    return { subtotal, vat, total: subtotal + vat };
  }, [form.items]);

  function updateField<K extends Exclude<keyof InvoiceForm, "items">>(field: K, value: InvoiceForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function updateItem(itemId: string, field: keyof Omit<InvoiceItem, "id">, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => item.id !== itemId ? item : {
        ...item,
        [field]: field === "description" ? value : toNumber(value)
      })
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { id: createId(), description: "새 작업 항목", quantity: 1, unitPrice: 0 }]
    }));
  }

  function removeItem(itemId: string) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== itemId)
    }));
  }

  function saveDraft() {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
    setMessage("인보이스 초안을 이 브라우저에 저장했습니다.");
  }

  function resetDraft() {
    if (!window.confirm("새 인보이스를 작성할까요? 저장하지 않은 내용은 사라집니다.")) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    setForm(cloneInitialInvoice());
    setMessage("새 인보이스 양식을 열었습니다.");
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateField("logoUrl", typeof reader.result === "string" ? reader.result : "/kuda-labs-logo.png");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="invoice-workspace document-workspace">
      <div className="document-toolbar mb-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-[#0b1f33] p-3 text-white">
        <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-md bg-[#20384d] px-3 py-2 text-sm font-bold text-white">
          <Save className="h-4 w-4" />
          임시 저장
        </button>
        <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-md bg-[#20384d] px-3 py-2 text-sm font-bold text-white">
          <RotateCcw className="h-4 w-4" />
          새로 작성
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#20384d] px-3 py-2 text-sm font-bold text-white">
          <Upload className="h-4 w-4" />
          로고 교체
          <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
        </label>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#55c5df] px-3 py-2 text-sm font-bold text-[#062237]">
          <Printer className="h-4 w-4" />
          PDF / 인쇄
        </button>
        <p className="w-full text-xs text-[#a7e9f5] sm:ml-auto sm:w-auto">노란색으로 강조된 문서 안의 항목을 직접 입력하세요.</p>
        {message ? <p className="w-full text-xs font-medium text-[#a7e9f5] sm:w-auto">{message}</p> : null}
      </div>

      <section className="document-preview-pane min-w-0 overflow-x-auto rounded-md border border-line bg-[#eef2f4] p-2 sm:p-5">
        <article className="invoice-paper mx-auto min-h-[1080px] w-full max-w-[820px] border-t-8 border-[#0b1f33] bg-white px-5 py-8 text-[#172331] shadow-[0_18px_50px_rgba(32,51,67,0.13)] sm:px-12 sm:py-10">
          <div className="flex items-start justify-between gap-4 border-b border-[#dce4e9] pb-6 sm:gap-8">
            <InvoiceLogo src={form.logoUrl} width={1622} height={309} className="h-10 w-28 object-contain sm:h-12 sm:w-36" />
            <div className="text-right"><h3 className="text-2xl font-light tracking-[0.13em] text-[#0b1f33] sm:text-3xl">INVOICE</h3><p className="mt-1 text-xs text-[#71808c]">대금 청구서</p></div>
          </div>

          <div className="my-6 grid grid-cols-[1.5fr_1fr_1fr] gap-2 bg-[#f4f7f9] p-4 text-[10px]">
            <label><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">INVOICE NO.</span><input aria-label="인보이스 번호" className={`${paperBlockInputClass} mt-1 font-bold`} value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} /></label>
            <label><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">ISSUE DATE</span><input type="date" aria-label="발행 일자" className={`${paperBlockInputClass} mt-1 font-bold`} value={form.issueDate} onChange={(event) => updateField("issueDate", event.target.value)} /></label>
            <label><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">DUE DATE</span><input type="date" aria-label="지급 기한" className={`${paperBlockInputClass} mt-1 font-bold`} value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} /></label>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-9">
            <div><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">FROM · 공급자</span><input aria-label="공급자 상호" className="my-2 w-full rounded-sm border-0 bg-transparent p-0 text-sm font-bold text-inherit outline-none transition focus:bg-[#fff7c2] focus:ring-1 focus:ring-[#55c5df]" value={form.supplier} onChange={(event) => updateField("supplier", event.target.value)} /><p className="text-[9px] leading-[1.8] text-[#62717c]">대표자 <input aria-label="공급자 대표자" className={paperInputClass} value={form.supplierCeo} onChange={(event) => updateField("supplierCeo", event.target.value)} /> · <input aria-label="공급자 사업자번호" className={paperInputClass} value={form.supplierNumber} onChange={(event) => updateField("supplierNumber", event.target.value)} /><br /><input aria-label="공급자 주소" className={`${paperBlockInputClass} text-[#62717c]`} value={form.supplierAddress} onChange={(event) => updateField("supplierAddress", event.target.value)} /><br /><input type="email" aria-label="공급자 이메일" className={`${paperBlockInputClass} text-[#62717c]`} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></p></div>
            <div className="border-t border-[#dce4e9] pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">BILL TO · 공급받는 자</span><input aria-label="공급받는 자 상호" className="my-2 w-full rounded-sm border-0 bg-transparent p-0 text-sm font-bold text-inherit outline-none transition placeholder:text-[#9aa7b0] focus:bg-[#fff7c2] focus:ring-1 focus:ring-[#55c5df]" placeholder="고객사 / 선사명" value={form.client} onChange={(event) => updateField("client", event.target.value)} /><p className="text-[9px] leading-[1.8] text-[#62717c]"><input aria-label="공급받는 자 대표자" className={paperInputClass} placeholder="대표자명" value={form.clientCeo} onChange={(event) => updateField("clientCeo", event.target.value)} /> · <input aria-label="공급받는 자 사업자번호" className={paperInputClass} placeholder="사업자번호" value={form.clientNumber} onChange={(event) => updateField("clientNumber", event.target.value)} /><br /><input aria-label="공급받는 자 담당자" className={paperInputClass} placeholder="담당자" value={form.manager} onChange={(event) => updateField("manager", event.target.value)} /> · <input aria-label="공급받는 자 연락처" className={paperInputClass} placeholder="연락처" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /><br /><input type="email" aria-label="공급받는 자 이메일" className={`${paperBlockInputClass} text-[#62717c]`} placeholder="이메일" value={form.clientEmail} onChange={(event) => updateField("clientEmail", event.target.value)} /></p></div>
          </div>

          <div className="my-6 flex flex-wrap items-center gap-2 border-y border-[#dce4e9] py-3 text-[9px]"><span className="mr-1 text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">PROJECT</span><input aria-label="프로젝트명" className={`${paperInputClass} min-w-[10rem] flex-1 font-bold`} value={form.project} onChange={(event) => updateField("project", event.target.value)} /><span className="text-[#71808c]">/</span><input aria-label="대상 선박명" className={`${paperInputClass} min-w-[7rem] flex-1 font-bold`} placeholder="M/V 선박명" value={form.vessel} onChange={(event) => updateField("vessel", event.target.value)} /><span className="text-[#71808c]">/</span><input aria-label="작업 장소" className={`${paperInputClass} min-w-[7rem] flex-1 font-bold`} placeholder="작업 장소" value={form.location} onChange={(event) => updateField("location", event.target.value)} /></div>

          <table className="w-full border-collapse text-[8px]"><thead><tr className="bg-[#0b1f33] text-white"><th className="p-2 text-right">NO.</th><th className="p-2 text-left">DESCRIPTION</th><th className="p-2 text-right">QTY</th><th className="p-2 text-right">UNIT PRICE</th><th className="p-2 text-right">AMOUNT</th></tr></thead><tbody>{form.items.map((item, index) => <tr key={item.id} className="border-b border-[#dce4e9]"><td className="p-3 text-right align-top">{String(index + 1).padStart(2, "0")}</td><td className="break-words p-3 text-left align-top"><div className="flex items-start gap-1"><input aria-label={`청구 항목 ${index + 1}`} className={`${paperBlockInputClass} flex-1`} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} /><button type="button" onClick={() => removeItem(item.id)} className="print:hidden rounded p-0.5 text-[#9aa7b0] hover:text-[#b42318]" aria-label={`청구 항목 ${index + 1} 삭제`}><Trash2 className="h-3 w-3" /></button></div></td><td className="p-3 text-right align-top"><input type="number" min="0" aria-label={`청구 항목 ${index + 1} 수량`} className={paperNumberInputClass} value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} /><span className="text-[#71808c]">식</span></td><td className="p-3 text-right align-top"><input inputMode="numeric" aria-label={`청구 항목 ${index + 1} 단가`} className={paperNumberInputClass} value={item.unitPrice || ""} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} /></td><td className="p-3 text-right align-top">{formatMoney(item.quantity * item.unitPrice)}</td></tr>)}</tbody></table>
          <button type="button" onClick={addItem} className="mt-3 inline-flex items-center gap-1 rounded bg-[#eaf5f8] px-3 py-2 text-xs font-bold text-marine print:hidden"><Plus className="h-3.5 w-3.5" />항목 추가</button>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-11"><div><span className="block text-[8px] font-extrabold tracking-[0.1em] text-[#778592]">PAYMENT DETAILS</span><p className="mt-3 text-[8px]">은행: <input aria-label="입금 은행" className={paperInputClass} placeholder="은행명" value={form.bank} onChange={(event) => updateField("bank", event.target.value)} /></p><p className="mt-2 text-[8px]">계좌: <input aria-label="입금 계좌번호" className={paperInputClass} placeholder="계좌번호" value={form.account} onChange={(event) => updateField("account", event.target.value)} /></p><p className="mt-2 text-[8px]">예금주: <input aria-label="예금주" className={paperInputClass} value={form.holder} onChange={(event) => updateField("holder", event.target.value)} /></p></div><div className="text-[9px]"><div className="flex justify-between border-b border-[#dce4e9] p-2"><span>공급가액</span><b>{formatMoney(totals.subtotal)}</b></div><div className="flex justify-between border-b border-[#dce4e9] p-2"><span>부가세 (10%)</span><b>{formatMoney(totals.vat)}</b></div><div className="flex justify-between bg-[#0f6894] p-3 text-[13px] text-white"><span>TOTAL</span><b>{formatMoney(totals.total)}</b></div></div></div>

          <footer className="mt-11 flex items-end justify-between border-t border-[#dce4e9] pt-4 text-[8px]"><p><input aria-label="공급자 웹사이트" className={paperInputClass} value={form.supplierWebsite} onChange={(event) => updateField("supplierWebsite", event.target.value)} /> · <input type="email" aria-label="하단 공급자 이메일" className={paperInputClass} value={form.supplierEmail} onChange={(event) => updateField("supplierEmail", event.target.value)} /></p><div className="flex items-start gap-3"><span className="mt-1"><input aria-label="하단 공급자 상호" className={paperInputClass} value={form.supplier} onChange={(event) => updateField("supplier", event.target.value)} /> 대표이사</span><div><input aria-label="하단 대표자" className={`${paperInputClass} w-16 text-sm font-bold`} value={form.supplierCeo} onChange={(event) => updateField("supplierCeo", event.target.value)} /><br /><small>직인 생략</small></div></div></footer>
        </article>
      </section>

      {!ready ? <span className="sr-only">인보이스 초안 불러오는 중</span> : null}
    </div>
  );
}
