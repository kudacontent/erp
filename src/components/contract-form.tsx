"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileSignature, Loader2, Save } from "lucide-react";
import { Field } from "@/components/ui/field";

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

export function ContractForm({ clients, selectedClientId }: { clients: ClientOption[]; selectedClientId?: string }) {
  const router = useRouter();
  const initialClient = clients.find((client) => client.slug === selectedClientId) ?? clients[0];
  const [form, setForm] = useState<FormState>({
    clientName: initialClient?.name ?? "",
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


  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-md border border-line bg-white p-5">
        <h3 className="mb-5 font-bold text-ink">계약 정보</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="거래처" required error={errors.clientName?.[0]}>
            {(props) => (
              <select {...props} value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)}>
                {clients.map((client) => (
                  <option key={client.slug} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="입금 예정일">
            {(props) => (
              <input {...props} type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} />
            )}
          </Field>
          <Field label="계약명" required error={errors.projectTitle?.[0]} className="md:col-span-2">
            {(props) => (
              <input {...props} value={form.projectTitle} onChange={(event) => updateField("projectTitle", event.target.value)} />
            )}
          </Field>
          <Field label="공급가액" required error={errors.supplyAmount?.[0]} hint="단위: 만원">
            {(props) => (
              <input {...props} inputMode="numeric" value={form.supplyAmount} onChange={(event) => updateField("supplyAmount", event.target.value)} />
            )}
          </Field>
          <Field label="부가세" required error={errors.vatAmount?.[0]} hint="단위: 만원">
            {(props) => (
              <input {...props} inputMode="numeric" value={form.vatAmount} onChange={(event) => updateField("vatAmount", event.target.value)} />
            )}
          </Field>
          <Field label="메모" className="md:col-span-2">
            {(props) => (
              <textarea
                {...props}
                className={`${props.className} min-h-28`}
                value={form.memo}
                onChange={(event) => updateField("memo", event.target.value)}
              />
            )}
          </Field>
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
                <input type="checkbox" className="h-4 w-4 accent-marine" defaultChecked={item !== "지출결의서"} />
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
        {/* aria-live 로 저장 실패를 스크린리더에도 알린다 */}
        <p aria-live="polite" className="text-sm font-medium text-danger-fg">
          {status === "error" ? message : ""}
        </p>
      </aside>
    </form>
  );
}
