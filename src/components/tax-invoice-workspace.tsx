"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Loader2, Plus, RefreshCw, Send, Trash2, XCircle } from "lucide-react";
import type { ClientListItem } from "@/lib/clients-data";

type Party = {
  contactId: string;
  corpNum: string;
  taxRegId: string;
  corpName: string;
  ceoName: string;
  addr: string;
  bizClass: string;
  bizType: string;
  contactName: string;
  tel: string;
  hp: string;
  email: string;
};

type TaxInvoiceItem = {
  purchaseDate: string;
  name: string;
  information: string;
  chargeableUnit: string;
  unitPrice: string;
  amount: string;
  tax: string;
  description: string;
};

type TaxInvoiceForm = {
  clientId: string;
  contractId: string;
  issueDate: string;
  purposeType: "1" | "2";
  taxType: "1" | "2" | "3";
  invoicerParty: Party;
  invoiceeParty: Party;
  cash: string;
  chkBill: string;
  note: string;
  credit: string;
  remark1: string;
  remark2: string;
  remark3: string;
  sendSms: boolean;
  forceIssue: boolean;
  mailTitle: string;
  items: TaxInvoiceItem[];
};

type InvoiceRecord = {
  id: string;
  mgtKey: string;
  status: string;
  provider: string;
  providerMessage?: string | null;
  approvalNumber?: string | null;
  invoiceKey?: string | null;
  amountTotal: string;
  taxTotal: string;
  totalAmount: string;
  writeDate: string;
  invoiceeParty: { corpName: string };
};

type Props = {
  clients: ClientListItem[];
  supplierDefaults: Party;
  initialContract?: {
    id: string;
    clientId: string;
    projectTitle: string;
    client: {
      name: string;
      businessNumber: string;
      ceoName: string;
      address: string;
      email: string;
      phone: string;
    };
  };
};

const fieldInputClass = "min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:bg-[#fffbea] focus:ring-2 focus:ring-inset focus:ring-[#f4c46a]";
const itemInputClass = "w-full min-w-0 border-0 bg-transparent px-2 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:bg-[#fffbea] focus:ring-2 focus:ring-inset focus:ring-[#f4c46a]";

const statusLabels: Record<string, string> = {
  DRAFT: "임시 저장",
  ISSUING: "발급 처리 중",
  ISSUED: "발급 접수 완료",
  FAILED: "발급 실패",
  CANCELED: "취소"
};

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function emptyParty(): Party {
  return {
    contactId: "",
    corpNum: "",
    taxRegId: "",
    corpName: "",
    ceoName: "",
    addr: "",
    bizClass: "",
    bizType: "",
    contactName: "",
    tel: "",
    hp: "",
    email: ""
  };
}

function initialForm(supplierDefaults: Party, initialContract?: Props["initialContract"]): TaxInvoiceForm {
  const invoiceeParty = initialContract
    ? {
        ...emptyParty(),
        corpNum: initialContract.client.businessNumber,
        corpName: initialContract.client.name,
        ceoName: initialContract.client.ceoName,
        addr: initialContract.client.address,
        tel: initialContract.client.phone,
        email: initialContract.client.email
      }
    : emptyParty();

  return {
    clientId: initialContract?.clientId || "",
    contractId: initialContract?.id || "",
    issueDate: today(),
    purposeType: "2",
    taxType: "1",
    invoicerParty: { ...emptyParty(), ...supplierDefaults },
    invoiceeParty,
    cash: "",
    chkBill: "",
    note: "",
    credit: "",
    remark1: "",
    remark2: "",
    remark3: "",
    sendSms: false,
    forceIssue: false,
    mailTitle: "",
    items: [
      {
        purchaseDate: today(),
        name: initialContract?.projectTitle || "",
        information: "",
        chargeableUnit: "1",
        unitPrice: "0",
        amount: "0",
        tax: "0",
        description: ""
      }
    ]
  };
}

function formatMoney(value: string | number) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString("ko-KR") : "0";
}

function calculateItem(item: TaxInvoiceItem, taxType: TaxInvoiceForm["taxType"]) {
  const quantity = Number(item.chargeableUnit || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const amount = Number.isFinite(quantity * unitPrice) ? Math.round(quantity * unitPrice) : 0;
  const tax = taxType === "1" ? Math.floor(amount / 10) : 0;

  return { ...item, amount: String(amount), tax: String(tax) };
}

function PartyFields({
  party,
  onChange
}: {
  party: Party;
  onChange: (key: keyof Party, value: string) => void;
}) {
  const fields: Array<{ key: keyof Party; label: string; type?: string; span?: string; required?: boolean }> = [
    { key: "corpNum", label: "사업자등록번호", required: true },
    { key: "taxRegId", label: "종사업장번호" },
    { key: "corpName", label: "상호", required: true },
    { key: "ceoName", label: "성명", required: true },
    { key: "addr", label: "사업장 주소", span: "sm:col-span-2", required: true },
    { key: "bizClass", label: "업태" },
    { key: "bizType", label: "종목" },
    { key: "email", label: "전자메일", type: "email", span: "sm:col-span-2" }
  ];

  return (
    <div className="grid min-w-0 grid-cols-1 overflow-hidden rounded-md border-l border-t border-line-strong bg-white sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className={`flex min-w-0 min-h-[45px] border-b border-r border-line-strong ${field.span || ""}`}>
          <span className="flex w-[7.25rem] shrink-0 items-center bg-surface-sunk px-2 text-xs font-semibold text-steel sm:w-[7.5rem]">
            {field.label}
            {field.required ? <em className="ml-0.5 not-italic text-[#c2410c]">*</em> : null}
          </span>
          <input
            aria-label={field.label}
            type={field.type || "text"}
            className={fieldInputClass}
            value={party[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

export function TaxInvoiceWorkspace({ clients, supplierDefaults, initialContract }: Props) {
  const [form, setForm] = useState<TaxInvoiceForm>(() => initialForm(supplierDefaults, initialContract));
  const [busyAction, setBusyAction] = useState<"draft" | "issue" | "status" | "">("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"normal" | "error">("normal");
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRecord[]>([]);
  const [provider, setProvider] = useState("mock");

  const totals = useMemo(() => {
    return form.items.reduce(
      (result, item) => ({ amount: result.amount + Number(item.amount || 0), tax: result.tax + Number(item.tax || 0) }),
      { amount: 0, tax: 0 }
    );
  }, [form.items]);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      const response = await fetch("/api/tax-invoices", { cache: "no-store" });
      if (!response.ok || !active) return;
      const data = await response.json();
      setProvider(data.provider || "mock");
      setRecentInvoices(data.invoices || []);
    }

    void loadInvoices();
    return () => {
      active = false;
    };
  }, []);

  function updateParty(side: "invoicerParty" | "invoiceeParty", key: keyof Party, value: string) {
    setForm((current) => ({ ...current, [side]: { ...current[side], [key]: value } }));
  }

  function selectClient(clientId: string) {
    const client = clients.find((item) => item.slug === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      invoiceeParty: client
        ? {
            ...current.invoiceeParty,
            corpNum: client.businessNumber || "",
            corpName: client.name,
            addr: client.address || "",
            email: client.email === "-" ? "" : client.email,
            tel: client.phone === "-" ? "" : client.phone
          }
        : emptyParty()
    }));
  }

  function updateItem(index: number, key: keyof TaxInvoiceItem, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [key]: value };
        return key === "chargeableUnit" || key === "unitPrice" ? calculateItem(updated, current.taxType) : updated;
      })
    }));
  }

  function changeTaxType(value: TaxInvoiceForm["taxType"]) {
    setForm((current) => ({ ...current, taxType: value, items: current.items.map((item) => calculateItem(item, value)) }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { purchaseDate: current.issueDate, name: "", information: "", chargeableUnit: "1", unitPrice: "0", amount: "0", tax: "0", description: "" }
      ]
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function submit(action: "draft" | "issue") {
    setBusyAction(action);
    setMessage("");
    setMessageTone("normal");

    try {
      const response = await fetch("/api/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          action,
          amountTotal: String(totals.amount),
          taxTotal: String(totals.tax),
          totalAmount: String(totals.amount + totals.tax)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "세금계산서 처리에 실패했습니다.");
        setMessageTone("error");
        return;
      }

      setSavedInvoice(data.invoice);
      setRecentInvoices((current) => [data.invoice, ...current.filter((invoice) => invoice.id !== data.invoice.id)].slice(0, 100));
      setMessage(data.message || (action === "draft" ? "임시 저장했습니다." : "발급 요청을 접수했습니다."));
    } catch {
      setMessage("네트워크 오류로 세금계산서를 처리하지 못했습니다.");
      setMessageTone("error");
    } finally {
      setBusyAction("");
    }
  }

  async function issueSavedDraft() {
    if (!savedInvoice) return;
    setBusyAction("issue");
    setMessage("");

    try {
      const response = await fetch(`/api/tax-invoices/${savedInvoice.id}/issue`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "세금계산서 발급에 실패했습니다.");
        setMessageTone("error");
        return;
      }
      setSavedInvoice(data.invoice);
      setRecentInvoices((current) => [data.invoice, ...current.filter((invoice) => invoice.id !== data.invoice.id)].slice(0, 100));
      setMessage(data.message || "발급 요청을 접수했습니다.");
      setMessageTone("normal");
    } catch {
      setMessage("네트워크 오류로 세금계산서를 발급하지 못했습니다.");
      setMessageTone("error");
    } finally {
      setBusyAction("");
    }
  }

  async function refreshStatus() {
    if (!savedInvoice || provider !== "barobill") return;
    setBusyAction("status");
    try {
      const response = await fetch(`/api/tax-invoices/${savedInvoice.id}/status`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "바로빌 상태 조회에 실패했습니다.");
        setMessageTone("error");
        return;
      }
      setSavedInvoice(data.invoice);
      setRecentInvoices((current) => current.map((invoice) => (invoice.id === data.invoice.id ? data.invoice : invoice)));
      setMessage("바로빌 발급 상태를 새로 확인했습니다.");
      setMessageTone("normal");
    } catch {
      setMessage("네트워크 오류로 발급 상태를 확인하지 못했습니다.");
      setMessageTone("error");
    } finally {
      setBusyAction("");
    }
  }

  function resetForm() {
    setForm(initialForm(supplierDefaults, initialContract));
    setSavedInvoice(null);
    setMessage("");
    setMessageTone("normal");
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-[#c4d3dc] bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-marine px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-xl font-bold">전자세금계산서 건별 발급</h3>
            <p className="mt-1 text-xs text-[#d6edf4]">공급자·공급받는자·품목을 입력한 뒤 발급합니다.</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs text-[#e2f5fa]">
            <span className="h-2 w-2 rounded-full bg-[#73e1a3]" />
            {provider === "barobill" ? "바로빌 테스트" : "로컬 테스트"}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border-2 border-[#6a8798] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#6a8798] bg-surface-sunk px-4 py-3 sm:px-6"><h3 className="text-lg font-bold text-ink">세금계산서</h3><span className="text-xs text-steel">* 필수</span></div>

        <div className="min-w-0 p-3 sm:p-5">
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <section className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="font-bold text-ink">공급자</h4>
              </div>
              <PartyFields party={form.invoicerParty} onChange={(key, value) => updateParty("invoicerParty", key, value)} />
            </section>
            <section className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-ink">공급받는자</h4>
                <select aria-label="거래처에서 불러오기" className="max-w-full rounded-md border border-line-strong bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-marine" value={form.clientId} onChange={(event) => selectClient(event.target.value)}>
                  <option value="">거래처에서 불러오기</option>
                  {clients.map((client) => <option key={client.slug} value={client.slug}>{client.name}</option>)}
                </select>
              </div>
              <PartyFields party={form.invoiceeParty} onChange={(key, value) => updateParty("invoiceeParty", key, value)} />
            </section>
          </div>

          <div className="mt-5 overflow-hidden rounded-md border-l border-t border-line-strong bg-white">
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-3">
              <label className="flex min-h-[48px] min-w-0 border-b border-r border-line-strong">
                <span className="flex w-[6.5rem] shrink-0 items-center bg-surface-sunk px-2 text-xs font-semibold text-steel">작성일자<em className="ml-0.5 not-italic text-[#c2410c]">*</em></span>
                <input type="date" aria-label="작성일자" className={fieldInputClass} value={form.issueDate} onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))} />
              </label>
              <label className="flex min-h-[48px] min-w-0 border-b border-r border-line-strong">
                <span className="flex w-[6.5rem] shrink-0 items-center bg-surface-sunk px-2 text-xs font-semibold text-steel">과세 구분</span>
                <select aria-label="과세 구분" className={fieldInputClass} value={form.taxType} onChange={(event) => changeTaxType(event.target.value as TaxInvoiceForm["taxType"])}><option value="1">과세</option><option value="2">영세율</option><option value="3">면세</option></select>
              </label>
              <div className="flex min-h-[48px] min-w-0 border-b border-r border-line-strong">
                <span className="flex w-[6.5rem] shrink-0 items-center bg-surface-sunk px-2 text-xs font-semibold text-steel">결제 구분</span>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 p-1.5">
                  <button type="button" onClick={() => setForm((current) => ({ ...current, purposeType: "1" }))} className={`rounded px-2 py-1.5 text-xs font-semibold transition ${form.purposeType === "1" ? "bg-marine text-white" : "text-steel hover:bg-surface-sunk"}`}>영수</button>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, purposeType: "2" }))} className={`rounded px-2 py-1.5 text-xs font-semibold transition ${form.purposeType === "2" ? "bg-marine text-white" : "text-steel hover:bg-surface-sunk"}`}>청구</button>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-6 min-w-0">
            <div className="flex flex-col gap-3 border-b border-line-strong pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-bold text-ink">공급 내역</h4>
                <p className="mt-1 text-xs text-steel">수량 × 단가로 공급가액을 계산하고 과세 거래의 세액을 자동 계산합니다.</p>
              </div>
              <button type="button" onClick={addItem} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#9dbdcc] bg-white px-3 py-2 text-sm font-semibold text-marine transition hover:bg-[#eef7fa] sm:w-auto"><Plus className="h-4 w-4" />품목 추가</button>
            </div>

            <div className="mt-3 min-w-0 overflow-x-auto overscroll-x-contain rounded-md border border-line-strong">
              <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
                <colgroup><col className="w-[7rem]" /><col /><col className="w-[6.5rem]" /><col className="w-[4.5rem]" /><col className="w-[7rem]" /><col className="w-[8rem]" /><col className="w-[7rem]" /><col className="w-10" /></colgroup>
                <thead className="bg-[#eaf0f4] text-xs font-semibold text-steel"><tr><th className="border-b border-r border-line-strong px-2 py-3 text-left whitespace-nowrap">월/일</th><th className="border-b border-r border-line-strong px-2 py-3 text-left whitespace-nowrap">품목</th><th className="border-b border-r border-line-strong px-2 py-3 text-left whitespace-nowrap">규격</th><th className="border-b border-r border-line-strong px-2 py-3 text-right whitespace-nowrap">수량</th><th className="border-b border-r border-line-strong px-2 py-3 text-right whitespace-nowrap">단가</th><th className="border-b border-r border-line-strong px-2 py-3 text-right whitespace-nowrap">공급가액</th><th className="border-b border-r border-line-strong px-2 py-3 text-right whitespace-nowrap">세액</th><th className="border-b border-line-strong px-1 py-3" aria-label="품목 삭제" /></tr></thead>
                <tbody>
                  {form.items.map((item, index) => <tr key={`${index}-${item.purchaseDate}-${item.name}`} className="align-top even:bg-surface-subtle">
                    <td className="border-b border-r border-line-strong p-0"><input type="date" aria-label={`${index + 1}번 품목 일자`} className={itemInputClass} value={item.purchaseDate} onChange={(event) => updateItem(index, "purchaseDate", event.target.value)} /></td>
                    <td className="border-b border-r border-line-strong p-0"><input aria-label={`${index + 1}번 품목`} className={itemInputClass} value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder="품목명" /></td>
                    <td className="border-b border-r border-line-strong p-0"><input aria-label={`${index + 1}번 규격`} className={itemInputClass} value={item.information} onChange={(event) => updateItem(index, "information", event.target.value)} placeholder="규격" /></td>
                    <td className="border-b border-r border-line-strong p-0"><input inputMode="decimal" aria-label={`${index + 1}번 수량`} className={`${itemInputClass} text-right`} value={item.chargeableUnit} onChange={(event) => updateItem(index, "chargeableUnit", event.target.value.replace(/[^\d.]/g, ""))} /></td>
                    <td className="border-b border-r border-line-strong p-0"><input inputMode="numeric" aria-label={`${index + 1}번 단가`} className={`${itemInputClass} text-right`} value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value.replace(/\D/g, ""))} /></td>
                    <td className="border-b border-r border-line-strong px-2 py-2.5 text-right font-medium text-ink">{formatMoney(item.amount)}원</td>
                    <td className="border-b border-r border-line-strong px-2 py-2.5 text-right font-medium text-ink">{formatMoney(item.tax)}원</td>
                    <td className="border-b border-line-strong px-1 py-2 text-center"><button type="button" aria-label={`${index + 1}번 품목 삭제`} onClick={() => removeItem(index)} className="rounded p-1.5 text-steel transition hover:bg-[#fff1f0] hover:text-danger-fg"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>)}
                </tbody>
                <tfoot><tr className="bg-surface-subtle font-bold text-ink"><th colSpan={5} className="border-r border-line-strong px-2 py-3 text-right">합계</th><td className="border-r border-line-strong px-2 py-3 text-right">{formatMoney(totals.amount)}원</td><td className="border-r border-line-strong px-2 py-3 text-right">{formatMoney(totals.tax)}원</td><td className="px-1 py-3" /></tr></tfoot>
              </table>
            </div>
          </section>

          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 overflow-hidden rounded-md border border-line-strong">
              <div className="border-b border-line-strong bg-surface-sunk px-3 py-2.5"><h4 className="font-bold text-ink">결제 정보</h4></div>
              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2">
                <label className="flex min-h-[46px] min-w-0 border-b border-r border-line-strong"><span className="flex w-20 shrink-0 items-center bg-surface-subtle px-2 text-xs text-steel">현금</span><input inputMode="numeric" aria-label="현금" className={`${fieldInputClass} text-right`} value={form.cash} onChange={(event) => setForm((current) => ({ ...current, cash: event.target.value.replace(/\D/g, "") }))} /></label>
                <label className="flex min-h-[46px] min-w-0 border-b border-line-strong sm:border-r"><span className="flex w-20 shrink-0 items-center bg-surface-subtle px-2 text-xs text-steel">수표</span><input inputMode="numeric" aria-label="수표" className={`${fieldInputClass} text-right`} value={form.chkBill} onChange={(event) => setForm((current) => ({ ...current, chkBill: event.target.value.replace(/\D/g, "") }))} /></label>
                <label className="flex min-h-[46px] min-w-0 border-b border-r border-line-strong"><span className="flex w-20 shrink-0 items-center bg-surface-subtle px-2 text-xs text-steel">어음</span><input inputMode="numeric" aria-label="어음" className={`${fieldInputClass} text-right`} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value.replace(/\D/g, "") }))} /></label>
                <label className="flex min-h-[46px] min-w-0 border-b border-line-strong"><span className="flex w-20 shrink-0 items-center bg-surface-subtle px-2 text-xs text-steel">외상</span><input inputMode="numeric" aria-label="외상" className={`${fieldInputClass} text-right`} value={form.credit} onChange={(event) => setForm((current) => ({ ...current, credit: event.target.value.replace(/\D/g, "") }))} /></label>
              </div>
            </section>
            <section className="min-w-0 overflow-hidden rounded-md border border-[#7e9aaa]">
              <div className="border-b border-[#7e9aaa] bg-[#dcecf2] px-3 py-2.5"><h4 className="font-bold text-ink">금액 확인</h4></div>
              <div className="divide-y divide-[#d2dde3] text-sm"><div className="flex items-center justify-between gap-3 px-3 py-2.5"><span className="text-steel">공급가액</span><strong className="text-ink">{formatMoney(totals.amount)}원</strong></div><div className="flex items-center justify-between gap-3 px-3 py-2.5"><span className="text-steel">세액</span><strong className="text-ink">{formatMoney(totals.tax)}원</strong></div><div className="flex items-center justify-between gap-3 bg-[#f2f8fa] px-3 py-3"><span className="font-bold text-ink">합계금액</span><strong className="text-lg text-marine">{formatMoney(totals.amount + totals.tax)}원</strong></div></div>
              <div className="flex flex-wrap items-center gap-2 border-t border-[#7e9aaa] bg-[#fffaf0] px-3 py-3 text-xs font-semibold text-steel"><span>이 금액을</span><button type="button" onClick={() => setForm((current) => ({ ...current, purposeType: "1" }))} className={`rounded border px-2.5 py-1.5 ${form.purposeType === "1" ? "border-marine bg-marine text-white" : "border-[#b8c8d2] bg-white"}`}>영수</button><button type="button" onClick={() => setForm((current) => ({ ...current, purposeType: "2" }))} className={`rounded border px-2.5 py-1.5 ${form.purposeType === "2" ? "border-marine bg-marine text-white" : "border-[#b8c8d2] bg-white"}`}>청구</button><span>함</span></div>
            </section>
          </div>

        </div>
      </section>

      <section className="rounded-lg border border-ink bg-ink p-4 shadow-sm sm:p-5">
        {provider === "barobill" && !form.invoicerParty.contactId ? <label className="mb-3 flex min-w-0 flex-col gap-1 rounded-md border border-[#e4b96c] bg-[#fff8e7] px-3 py-2 text-xs text-[#694d18] sm:flex-row sm:items-center sm:gap-3"><span className="shrink-0 font-semibold">바로빌 회원 ID</span><input aria-label="바로빌 회원 아이디" className="min-w-0 flex-1 border-b border-[#c6a05b] bg-transparent px-1 py-1 text-sm text-ink outline-none focus:border-marine" value={form.invoicerParty.contactId} onChange={(event) => updateParty("invoicerParty", "contactId", event.target.value)} placeholder="발급 공급자의 바로빌 회원 아이디" /><span className="shrink-0 text-[11px]">발급 연동에 필요합니다.</span></label> : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-white"><p className="text-sm font-bold">입력 내용을 확인하셨습니까?</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => submit("draft")} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50">{busyAction === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}{busyAction === "draft" ? "저장 중…" : "임시 저장"}</button>
            <button type="button" onClick={() => submit("issue")} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#4cc4df] px-4 py-3 text-sm font-bold text-ink transition hover:bg-[#72d8e9] disabled:opacity-50">{busyAction === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busyAction === "issue" ? "발급 요청 중…" : "발급하기"}</button>
            {savedInvoice && ["DRAFT", "FAILED"].includes(savedInvoice.status) ? <button type="button" onClick={issueSavedDraft} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#8bb4c5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"><Send className="h-4 w-4" />{savedInvoice.status === "FAILED" ? "다시 발급" : "저장 문서 발급"}</button> : null}
            <button type="button" onClick={resetForm} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-[#c4dbe5] transition hover:bg-white/10 disabled:opacity-50"><XCircle className="h-4 w-4" />새 작성</button>
          </div>
        </div>
        {message ? <p className={`mt-3 rounded-md px-3 py-2 text-sm ${messageTone === "error" ? "bg-[#602b2b] text-[#ffe1e1]" : "bg-white/10 text-white"}`}>{message}</p> : null}
      </section>

      {savedInvoice ? <section className="rounded-lg border border-line-strong bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2">{savedInvoice.status === "ISSUED" ? <CheckCircle2 className="h-5 w-5 text-marine" /> : <FilePlus2 className="h-5 w-5 text-steel" />}<h4 className="font-bold text-ink">처리 결과 · {statusLabels[savedInvoice.status] || savedInvoice.status}</h4></div><p className="mt-2 text-sm text-steel">관리번호 {savedInvoice.mgtKey} · {savedInvoice.invoiceeParty.corpName} · {formatMoney(savedInvoice.totalAmount)}원</p></div>{provider === "barobill" && savedInvoice.status === "ISSUED" ? <button type="button" onClick={refreshStatus} disabled={busyAction === "status"} className="inline-flex items-center justify-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-marine disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busyAction === "status" ? "animate-spin" : ""}`} />상태 새로고침</button> : null}</div>{savedInvoice.approvalNumber ? <p className="mt-4 rounded-md border border-[#9edbe2] bg-[#ecfeff] px-3 py-3 text-sm font-bold text-marine">국세청 승인번호: {savedInvoice.approvalNumber}</p> : null}{savedInvoice.providerMessage ? <p className="mt-3 rounded-md bg-surface-subtle px-3 py-3 text-sm text-steel">{savedInvoice.providerMessage}</p> : null}</section> : null}

      <section className="overflow-hidden rounded-lg border border-line-strong bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-line-strong bg-surface-sunk px-4 py-3 sm:px-5"><div><h4 className="font-bold text-ink">최근 세금계산서</h4><p className="mt-1 text-xs text-steel">임시 저장·발급 문서를 한 곳에서 확인합니다.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-steel">{recentInvoices.length}건</span></div><div className="min-w-0 overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-surface-subtle text-xs text-steel"><tr><th className="px-4 py-3">작성일자</th><th className="px-4 py-3">공급받는자</th><th className="px-4 py-3 text-right">합계</th><th className="px-4 py-3">관리번호</th><th className="px-4 py-3">상태</th></tr></thead><tbody>{recentInvoices.length ? recentInvoices.map((invoice) => <tr key={invoice.id} className="border-t border-[#e1e8ed]"><td className="px-4 py-3">{invoice.writeDate}</td><td className="px-4 py-3 font-medium text-ink">{invoice.invoiceeParty.corpName}</td><td className="px-4 py-3 text-right">{formatMoney(invoice.totalAmount)}원</td><td className="px-4 py-3 font-mono text-xs">{invoice.mgtKey}</td><td className="px-4 py-3"><span className="rounded-full bg-surface-sunk px-2 py-1 text-xs font-medium text-steel">{statusLabels[invoice.status] || invoice.status}</span></td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-steel">저장된 세금계산서가 없습니다.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
