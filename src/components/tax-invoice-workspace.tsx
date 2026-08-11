"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, FilePlus2, Loader2, Plus, RefreshCw, Send, Trash2, XCircle } from "lucide-react";
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

const inputClass = "mt-2 w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";
const smallInputClass = "w-full min-w-0 rounded-md border border-line bg-paper px-2 py-2 text-sm text-ink outline-none focus:border-marine";

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
  onChange,
  showContactId = false
}: {
  party: Party;
  onChange: (key: keyof Party, value: string) => void;
  showContactId?: boolean;
}) {
  const fields: Array<{ key: keyof Party; label: string; type?: string; span?: string }> = [
    { key: "corpNum", label: "사업자등록번호" },
    { key: "corpName", label: "상호" },
    { key: "ceoName", label: "대표자명" },
    { key: "taxRegId", label: "종사업장 식별번호" },
    { key: "addr", label: "사업장 주소", span: "md:col-span-2" },
    { key: "bizClass", label: "업태" },
    { key: "bizType", label: "종목" },
    { key: "contactName", label: "담당자" },
    { key: "tel", label: "전화번호" },
    { key: "hp", label: "휴대폰" },
    { key: "email", label: "이메일", type: "email" }
  ];

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {showContactId ? (
        <label className="block md:col-span-2">
          <span className="text-xs font-medium text-steel">바로빌 회원 아이디</span>
          <input className={inputClass} value={party.contactId} onChange={(event) => onChange("contactId", event.target.value)} />
          <span className="mt-1 block text-xs text-steel">발급 공급자의 바로빌 회원 아이디입니다.</span>
        </label>
      ) : null}
      {fields.map((field) => (
        <label key={field.key} className={`block ${field.span || ""}`}>
          <span className="text-xs font-medium text-steel">{field.label}</span>
          <input
            type={field.type || "text"}
            className={inputClass}
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
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e8f5fb] text-marine"><Calculator className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-ink">일반 세금계산서 작성</h3>
              <p className="mt-1 text-sm text-steel">공급자·공급받는자·품목을 작성하고 검토 후 임시 저장 또는 발급합니다.</p>
            </div>
          </div>
          <div className="rounded-md bg-paper px-3 py-2 text-xs text-steel">현재 연동: <span className="font-bold text-ink">{provider === "barobill" ? "바로빌 테스트" : "로컬 테스트"}</span></div>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
          <section className="min-w-0 rounded-md border border-line p-4">
            <h4 className="mb-4 font-bold text-ink">공급자</h4>
            <PartyFields party={form.invoicerParty} onChange={(key, value) => updateParty("invoicerParty", key, value)} showContactId />
          </section>
          <section className="min-w-0 rounded-md border border-line p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-ink">공급받는자</h4>
              <select className="max-w-full rounded-md border border-line bg-paper px-2 py-2 text-xs text-ink outline-none focus:border-marine" value={form.clientId} onChange={(event) => selectClient(event.target.value)}>
                <option value="">거래처에서 불러오기</option>
                {clients.map((client) => <option key={client.slug} value={client.slug}>{client.name}</option>)}
              </select>
            </div>
            <PartyFields party={form.invoiceeParty} onChange={(key, value) => updateParty("invoiceeParty", key, value)} />
          </section>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block"><span className="text-sm font-medium text-steel">작성일자</span><input type="date" className={inputClass} value={form.issueDate} onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))} /></label>
          <label className="block"><span className="text-sm font-medium text-steel">과세형태</span><select className={inputClass} value={form.taxType} onChange={(event) => changeTaxType(event.target.value as TaxInvoiceForm["taxType"])}><option value="1">과세</option><option value="2">영세</option><option value="3">면세</option></select></label>
          <label className="block"><span className="text-sm font-medium text-steel">영수·청구</span><select className={inputClass} value={form.purposeType} onChange={(event) => setForm((current) => ({ ...current, purposeType: event.target.value as TaxInvoiceForm["purposeType"] }))}><option value="1">영수</option><option value="2">청구</option></select></label>
          <label className="block"><span className="text-sm font-medium text-steel">계약 연결 ID(선택)</span><input className={inputClass} value={form.contractId} onChange={(event) => setForm((current) => ({ ...current, contractId: event.target.value }))} placeholder="계약 상세에서 연결 시 자동 입력" /></label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h4 className="font-bold text-ink">품목 정보</h4><p className="mt-1 text-xs text-steel">수량×단가로 공급가액을 계산하고 과세일 때 세액 10%를 자동 계산합니다.</p></div>
          <button type="button" onClick={addItem} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-marine hover:bg-paper sm:w-auto"><Plus className="h-4 w-4" />품목 추가</button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-line">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-paper text-xs text-steel"><tr><th className="px-3 py-3">일자</th><th className="px-3 py-3">품목</th><th className="px-3 py-3">규격</th><th className="px-3 py-3">수량</th><th className="px-3 py-3">단가</th><th className="px-3 py-3 text-right">공급가액</th><th className="px-3 py-3 text-right">세액</th><th className="px-3 py-3">비고</th><th className="w-10 px-2 py-3" /></tr></thead>
            <tbody>
              {form.items.map((item, index) => <tr key={`${index}-${item.purchaseDate}`} className="border-t border-line align-top">
                <td className="px-2 py-2"><input type="date" className={smallInputClass} value={item.purchaseDate} onChange={(event) => updateItem(index, "purchaseDate", event.target.value)} /></td>
                <td className="px-2 py-2"><input className={smallInputClass} value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder="품목명" /></td>
                <td className="px-2 py-2"><input className={smallInputClass} value={item.information} onChange={(event) => updateItem(index, "information", event.target.value)} placeholder="규격" /></td>
                <td className="w-24 px-2 py-2"><input inputMode="decimal" className={smallInputClass} value={item.chargeableUnit} onChange={(event) => updateItem(index, "chargeableUnit", event.target.value.replace(/[^\d.]/g, ""))} /></td>
                <td className="w-32 px-2 py-2"><input inputMode="numeric" className={smallInputClass} value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value.replace(/\D/g, ""))} /></td>
                <td className="px-3 py-3 text-right font-medium text-ink">{formatMoney(item.amount)}원</td>
                <td className="px-3 py-3 text-right font-medium text-ink">{formatMoney(item.tax)}원</td>
                <td className="px-2 py-2"><input className={smallInputClass} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="비고" /></td>
                <td className="px-2 py-3"><button type="button" aria-label="품목 삭제" onClick={() => removeItem(index)} className="rounded-md p-2 text-steel hover:bg-paper hover:text-[#075985]"><Trash2 className="h-4 w-4" /></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-paper px-4 py-3"><p className="text-xs text-steel">공급가액</p><p className="mt-1 text-lg font-bold text-ink">{formatMoney(totals.amount)}원</p></div><div className="rounded-md bg-paper px-4 py-3"><p className="text-xs text-steel">세액</p><p className="mt-1 text-lg font-bold text-ink">{formatMoney(totals.tax)}원</p></div><div className="rounded-md bg-[#e8f5fb] px-4 py-3"><p className="text-xs text-steel">합계금액</p><p className="mt-1 text-xl font-bold text-marine">{formatMoney(totals.amount + totals.tax)}원</p></div></div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-md border border-line bg-white p-4 sm:p-6">
          <h4 className="font-bold text-ink">결제·비고 정보</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block"><span className="text-xs text-steel">현금</span><input inputMode="numeric" className={inputClass} value={form.cash} onChange={(event) => setForm((current) => ({ ...current, cash: event.target.value.replace(/\D/g, "") }))} /></label><label className="block"><span className="text-xs text-steel">수표</span><input inputMode="numeric" className={inputClass} value={form.chkBill} onChange={(event) => setForm((current) => ({ ...current, chkBill: event.target.value.replace(/\D/g, "") }))} /></label><label className="block"><span className="text-xs text-steel">어음</span><input inputMode="numeric" className={inputClass} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value.replace(/\D/g, "") }))} /></label><label className="block"><span className="text-xs text-steel">외상</span><input inputMode="numeric" className={inputClass} value={form.credit} onChange={(event) => setForm((current) => ({ ...current, credit: event.target.value.replace(/\D/g, "") }))} /></label></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="block"><span className="text-xs text-steel">비고 1</span><input className={inputClass} value={form.remark1} onChange={(event) => setForm((current) => ({ ...current, remark1: event.target.value }))} /></label><label className="block"><span className="text-xs text-steel">비고 2</span><input className={inputClass} value={form.remark2} onChange={(event) => setForm((current) => ({ ...current, remark2: event.target.value }))} /></label><label className="block"><span className="text-xs text-steel">비고 3</span><input className={inputClass} value={form.remark3} onChange={(event) => setForm((current) => ({ ...current, remark3: event.target.value }))} /></label></div>
        </div>
        <aside className="min-w-0 rounded-md border border-line bg-white p-4 sm:p-6"><h4 className="font-bold text-ink">발급 옵션</h4><div className="mt-4 space-y-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.sendSms} onChange={(event) => setForm((current) => ({ ...current, sendSms: event.target.checked }))} />공급받는자 휴대폰으로 SMS 안내</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.forceIssue} onChange={(event) => setForm((current) => ({ ...current, forceIssue: event.target.checked }))} />지연발급 경고가 있어도 발급 시도</label><label className="block"><span className="text-xs text-steel">이메일 제목(선택)</span><input className={inputClass} value={form.mailTitle} onChange={(event) => setForm((current) => ({ ...current, mailTitle: event.target.value }))} placeholder="세금계산서 발급 안내" /></label></div></aside>
      </section>

      <section className="rounded-md border border-line bg-[#08243a] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"><button type="button" onClick={() => submit("draft")} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"><FilePlus2 className="h-4 w-4" />{busyAction === "draft" ? "저장 중…" : "임시 저장"}</button><button type="button" onClick={() => submit("issue")} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#4cc4df] px-4 py-3 text-sm font-bold text-[#08243a] disabled:opacity-50"><Send className="h-4 w-4" />{busyAction === "issue" ? "발급 요청 중…" : "검토 후 발급 요청"}</button>{savedInvoice && ["DRAFT", "FAILED"].includes(savedInvoice.status) ? <button type="button" onClick={issueSavedDraft} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"><Send className="h-4 w-4" />{savedInvoice.status === "FAILED" ? "다시 발급" : "저장 문서 발급"}</button> : null}<button type="button" onClick={resetForm} disabled={!!busyAction} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10"><XCircle className="h-4 w-4" />새 작성</button></div>{message ? <p className={`mt-3 text-sm ${messageTone === "error" ? "text-[#bae6fd]" : "text-white"}`}>{message}</p> : null}</section>

      {savedInvoice ? <section className="rounded-md border border-line bg-white p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2">{savedInvoice.status === "ISSUED" ? <CheckCircle2 className="h-5 w-5 text-marine" /> : <FilePlus2 className="h-5 w-5 text-steel" />}<h4 className="font-bold text-ink">처리 결과 · {statusLabels[savedInvoice.status] || savedInvoice.status}</h4></div><p className="mt-2 text-sm text-steel">관리번호 {savedInvoice.mgtKey} · {savedInvoice.invoiceeParty.corpName} · {formatMoney(savedInvoice.totalAmount)}원</p></div>{provider === "barobill" && savedInvoice.status === "ISSUED" ? <button type="button" onClick={refreshStatus} disabled={busyAction === "status"} className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-marine disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busyAction === "status" ? "animate-spin" : ""}`} />상태 새로고침</button> : null}</div>{savedInvoice.approvalNumber ? <p className="mt-4 rounded-md bg-[#ecfeff] px-3 py-3 text-sm font-bold text-marine">국세청 승인번호: {savedInvoice.approvalNumber}</p> : null}{savedInvoice.providerMessage ? <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-steel">{savedInvoice.providerMessage}</p> : null}</section> : null}

      <section className="rounded-md border border-line bg-white p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h4 className="font-bold text-ink">최근 세금계산서</h4><p className="mt-1 text-xs text-steel">임시 저장·발급 문서를 한 곳에서 확인합니다.</p></div><span className="text-xs text-steel">{recentInvoices.length}건</span></div><div className="mt-4 overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="border-b border-line text-xs text-steel"><tr><th className="px-2 py-3">작성일자</th><th className="px-2 py-3">공급받는자</th><th className="px-2 py-3">합계</th><th className="px-2 py-3">관리번호</th><th className="px-2 py-3">상태</th></tr></thead><tbody>{recentInvoices.length ? recentInvoices.map((invoice) => <tr key={invoice.id} className="border-b border-line last:border-0"><td className="px-2 py-3">{invoice.writeDate}</td><td className="px-2 py-3 font-medium text-ink">{invoice.invoiceeParty.corpName}</td><td className="px-2 py-3">{formatMoney(invoice.totalAmount)}원</td><td className="px-2 py-3 font-mono text-xs">{invoice.mgtKey}</td><td className="px-2 py-3"><span className="rounded-full bg-paper px-2 py-1 text-xs font-medium text-steel">{statusLabels[invoice.status] || invoice.status}</span></td></tr>) : <tr><td colSpan={5} className="px-2 py-6 text-center text-sm text-steel">저장된 세금계산서가 없습니다.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
