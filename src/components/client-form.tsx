"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Camera, Loader2, Save } from "lucide-react";
import { clientTypeOptions, type CreateClientInput } from "@/lib/client-schema";
import { Field } from "@/components/ui/field";

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

/** 담당자 칸은 좁아서 라벨을 숨기고 placeholder 로 안내한다. 위쪽 여백도 두지 않는다. */
const compactInputClass =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-marine";
const compactInputErrorClass =
  "w-full rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-danger-fg";

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

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-md border border-line bg-white p-5">
        <h3 className="mb-5 font-bold text-ink">기본 정보</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="거래처명" required error={errors.name?.[0]}>
            {(props) => (
              <input {...props} value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            )}
          </Field>

          <Field label="거래처 유형">
            {(props) => (
              <select
                {...props}
                value={form.clientType}
                onChange={(event) => updateField("clientType", event.target.value as CreateClientInput["clientType"])}
              >
                {clientTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="사업자등록번호" hint="'-' 없이 숫자만 입력해도 됩니다">
            {(props) => (
              <input
                {...props}
                inputMode="numeric"
                value={form.businessNumber}
                onChange={(event) => updateField("businessNumber", event.target.value)}
              />
            )}
          </Field>

          <Field label="대표 연락처">
            {(props) => (
              <input
                {...props}
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            )}
          </Field>

          <Field label="대표 이메일" error={errors.email?.[0]}>
            {(props) => (
              <input
                {...props}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            )}
          </Field>

          <Field label="주소">
            {(props) => (
              <input {...props} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
            )}
          </Field>

          <Field label="웹사이트">
            {(props) => (
              <input
                {...props}
                type="url"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
              />
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
            <Building2 className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">담당자</h3>
          </div>
          <div className="space-y-3">
            <Field label="담당자 이름" hideLabel required error={errors.contactName?.[0]}>
              {(props) => (
                <input
                  {...props}
                  className={props["aria-invalid"] ? compactInputErrorClass : compactInputClass}
                  placeholder="이름"
                  value={form.contactName}
                  onChange={(event) => updateField("contactName", event.target.value)}
                />
              )}
            </Field>

            <Field label="담당자 직책" hideLabel>
              {(props) => (
                <input
                  {...props}
                  className={compactInputClass}
                  placeholder="직책"
                  value={form.contactPosition}
                  onChange={(event) => updateField("contactPosition", event.target.value)}
                />
              )}
            </Field>

            <Field label="담당자 부서" hideLabel>
              {(props) => (
                <input
                  {...props}
                  className={compactInputClass}
                  placeholder="부서"
                  value={form.contactDepartment}
                  onChange={(event) => updateField("contactDepartment", event.target.value)}
                />
              )}
            </Field>

            <Field label="담당자 휴대폰" hideLabel>
              {(props) => (
                <input
                  {...props}
                  type="tel"
                  className={compactInputClass}
                  placeholder="휴대폰"
                  value={form.contactPhone}
                  onChange={(event) => updateField("contactPhone", event.target.value)}
                />
              )}
            </Field>

            <Field label="담당자 이메일" hideLabel error={errors.contactEmail?.[0]}>
              {(props) => (
                <input
                  {...props}
                  type="email"
                  className={props["aria-invalid"] ? compactInputErrorClass : compactInputClass}
                  placeholder="이메일"
                  value={form.contactEmail}
                  onChange={(event) => updateField("contactEmail", event.target.value)}
                />
              )}
            </Field>
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

        {/* aria-live 로 저장 실패를 스크린리더에도 알린다 */}
        <p aria-live="polite" className="text-sm font-medium text-danger-fg">
          {status === "error" ? "입력값을 확인하세요." : ""}
        </p>
      </aside>
    </form>
  );
}
