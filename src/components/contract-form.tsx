"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileSignature, Loader2, Save } from "lucide-react";

type ClientOption = {
  name: string;
  slug: string;
};

type FormState = {
  clientName: string;
  projectTitle: string;
  dueDate: string;
  supplyAmount: string;
  vatAmount: string;
  memo: string;
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

export function ContractForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    clientName: clients[0]?.name ?? "",
    projectTitle: "",
    dueDate: "",
    supplyAmount: "",
    vatAmount: "",
    memo: ""
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const totalAmount = useMemo(() => {
    const supply = Number(form.supplyAmount || 0);
    const vat = Number(form.vatAmount || 0);

    return supply + vat;
  }, [form.supplyAmount, form.vatAmount]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: form.clientName,
        projectTitle: form.projectTitle,
        supplyAmount: form.supplyAmount,
        vatAmount: form.vatAmount,
        dueDate: form.dueDate,
        memo: form.memo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setErrors(data.errors ?? {});
      setStatus("error");
      setMessage(data.message ?? "계약 저장에 실패했습니다.");
      return;
    }

    router.push(`/contracts/${data.contract.slug}`);
    router.refresh();
  }

  const inputClass = "mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-md border border-line bg-white p-5">
        <h3 className="mb-5 font-bold text-ink">계약 정보</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-steel">거래처</span>
            <select
              className={inputClass}
              value={form.clientName}
              onChange={(event) => updateField("clientName", event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.slug} value={client.name}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.clientName ? <p className="mt-1 text-xs text-[#075985]">{errors.clientName[0]}</p> : null}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">입금 예정일</span>
            <input
              type="date"
              className={inputClass}
              value={form.dueDate}
              onChange={(event) => updateField("dueDate", event.target.value)}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-steel">계약명</span>
            <input
              className={inputClass}
              value={form.projectTitle}
              onChange={(event) => updateField("projectTitle", event.target.value)}
            />
            {errors.projectTitle ? <p className="mt-1 text-xs text-[#075985]">{errors.projectTitle[0]}</p> : null}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">공급가액</span>
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.supplyAmount}
              onChange={(event) => updateField("supplyAmount", event.target.value)}
            />
            {errors.supplyAmount ? <p className="mt-1 text-xs text-[#075985]">{errors.supplyAmount[0]}</p> : null}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">부가세</span>
            <input
              inputMode="numeric"
              className={inputClass}
              value={form.vatAmount}
              onChange={(event) => updateField("vatAmount", event.target.value)}
            />
            {errors.vatAmount ? <p className="mt-1 text-xs text-[#075985]">{errors.vatAmount[0]}</p> : null}
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-steel">메모</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine"
              value={form.memo}
              onChange={(event) => updateField("memo", event.target.value)}
            />
          </label>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">첨부 문서</h3>
          </div>
          <div className="rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-steel">
            계약서, 견적서, 발주서 첨부
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">정산 기본값</h3>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">세금계산서</p>
              <p className="mt-1 text-lg font-bold text-ink">발행 대기</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">입금 상태</p>
              <p className="mt-1 text-lg font-bold text-ink">미입금</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">합계</p>
              <p className="mt-1 text-lg font-bold text-marine">{totalAmount.toLocaleString("ko-KR")}만원</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">문서 생성</h3>
          </div>
          <div className="space-y-3">
            {["견적서", "계약서", "지출결의서"].map((item) => (
              <label key={item} className="flex items-center gap-2 rounded-md bg-paper px-3 py-3 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4 accent-[#0b5f8a]" defaultChecked={item !== "지출결의서"} />
                {item}
              </label>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
        {status === "error" ? <p className="text-sm text-[#075985]">{message}</p> : null}
      </aside>
    </form>
  );
}
