"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Camera, Loader2, Save } from "lucide-react";
import { clientTypeOptions, type CreateClientInput } from "@/lib/client-schema";

type FieldErrors = Partial<Record<keyof CreateClientInput, string[]>>;

const initialForm: CreateClientInput = {
  name: "",
  clientType: "SHIP_OWNER",
  businessNumber: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  memo: "",
  contactName: "",
  contactPosition: "",
  contactDepartment: "",
  contactPhone: "",
  contactEmail: ""
};

export function ClientForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateClientInput>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function updateField<K extends keyof CreateClientInput>(key: K, value: CreateClientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const result = await response.json();

    if (!response.ok) {
      setErrors(result.errors ?? {});
      setStatus("error");
      return;
    }

    setStatus("saved");
    router.push(`/clients/${result.client.id}`);
    router.refresh();
  }

  const inputClass = "mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-md border border-line bg-white p-5">
        <h3 className="mb-5 font-bold text-ink">기본 정보</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-steel">거래처명</span>
            <input className={inputClass} value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            {errors.name ? <p className="mt-1 text-xs text-[#075985]">{errors.name[0]}</p> : null}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">거래처 유형</span>
            <select
              className={inputClass}
              value={form.clientType}
              onChange={(event) => updateField("clientType", event.target.value as CreateClientInput["clientType"])}
            >
              {clientTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">사업자등록번호</span>
            <input
              className={inputClass}
              value={form.businessNumber}
              onChange={(event) => updateField("businessNumber", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">대표 연락처</span>
            <input className={inputClass} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">대표 이메일</span>
            <input className={inputClass} value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            {errors.email ? <p className="mt-1 text-xs text-[#075985]">{errors.email[0]}</p> : null}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">주소</span>
            <input className={inputClass} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-steel">웹사이트</span>
            <input className={inputClass} value={form.website} onChange={(event) => updateField("website", event.target.value)} />
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
            <Building2 className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">담당자</h3>
          </div>
          <div className="space-y-3">
            <input
              placeholder="이름"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"
              value={form.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
            />
            {errors.contactName ? <p className="text-xs text-[#075985]">{errors.contactName[0]}</p> : null}
            <input
              placeholder="직책"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"
              value={form.contactPosition}
              onChange={(event) => updateField("contactPosition", event.target.value)}
            />
            <input
              placeholder="부서"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"
              value={form.contactDepartment}
              onChange={(event) => updateField("contactDepartment", event.target.value)}
            />
            <input
              placeholder="휴대폰"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"
              value={form.contactPhone}
              onChange={(event) => updateField("contactPhone", event.target.value)}
            />
            <input
              placeholder="이메일"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
            />
            {errors.contactEmail ? <p className="text-xs text-[#075985]">{errors.contactEmail[0]}</p> : null}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">명함 이미지</h3>
          </div>
          <div className="rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-steel">
            이미지 업로드
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
        {status === "error" ? <p className="text-sm text-[#075985]">입력값을 확인하세요.</p> : null}
      </aside>
    </form>
  );
}
