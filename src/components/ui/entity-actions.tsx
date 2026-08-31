"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { Field } from "@/components/ui/field";

export type EntityFieldType = "text" | "number" | "date" | "datetime" | "email" | "tel" | "textarea" | "select";

export type EntityField = {
  /** API 가 받는 필드 이름 */
  key: string;
  label: string;
  type?: EntityFieldType;
  required?: boolean;
  hint?: string;
  /** select 일 때의 선택지 */
  options?: Array<{ value: string; label: string }>;
  /** 두 칸을 차지할지 */
  wide?: boolean;
};

type EntityActionsProps = {
  /** 예: /api/contracts/abc123 — GET·PATCH·DELETE 를 모두 이 주소로 보낸다 */
  endpoint: string;
  /** 응답 객체에서 값을 꺼낼 키. 예: "contract" */
  resourceKey: string;
  /** 화면에 표시할 이름 (확인 문구에 쓰인다) */
  displayName: string;
  fields: EntityField[];
  editLabel?: string;
  /** 삭제 버튼 문구. 예: "계약 취소", "퇴사 처리" */
  deleteLabel?: string;
  /** 확인 단계에 보여줄 설명 */
  deleteDescription?: string;
  /** 삭제 후 이동할 주소. 없으면 새로고침만 한다 */
  redirectTo?: string;
  /** 수정·삭제를 막아야 할 때 사유. 값이 있으면 버튼 대신 이 문구를 보여준다 */
  lockedReason?: string;
};

/**
 * 상세 화면의 수정 · 삭제 묶음.
 *
 * 거래처에서 쓰던 방식을 계약 · 지출 · 직원에서도 그대로 쓰려고 일반화했다.
 * 필드 정의만 넘기면 편집 폼과 확인 단계를 만들어 준다.
 *
 * 삭제는 모듈마다 의미가 다르다 (계약=취소, 직원=퇴사, 지출=실제 삭제).
 * 그래서 문구를 밖에서 받는다.
 */
export function EntityActions({
  endpoint,
  resourceKey,
  displayName,
  fields,
  editLabel = "정보 수정",
  deleteLabel = "삭제",
  deleteDescription,
  redirectTo,
  lockedReason
}: EntityActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmDelete">("idle");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState<"none" | "loading" | "saving" | "deleting">("none");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "error">("info");

  function fail(text: string) {
    setTone("error");
    setMessage(text);
  }

  /** 서버가 준 값을 input 이 다룰 수 있는 문자열로 바꾼다 */
  function toInputValue(raw: unknown, type: EntityFieldType | undefined) {
    if (raw === null || raw === undefined) return "";
    const text = String(raw);
    if (type === "date") return text.slice(0, 10);
    if (type === "datetime") return text.slice(0, 16);
    return text;
  }

  async function openEditor() {
    setBusy("loading");
    setMessage("");

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        fail(data.message ?? "정보를 불러오지 못했습니다.");
        setBusy("none");
        return;
      }

      const resource = data[resourceKey] ?? {};
      const next: Record<string, string> = {};
      for (const field of fields) {
        next[field.key] = toInputValue(resource[field.key], field.type);
      }

      setValues(next);
      setErrors({});
      setMode("editing");
    } catch {
      fail("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("saving");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? {});
        fail(data.message ?? "입력값을 확인하세요.");
        setBusy("none");
        return;
      }

      setMode("idle");
      setTone("info");
      setMessage("수정 내용을 저장했습니다.");
      router.refresh();
    } catch {
      fail("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  async function remove() {
    setBusy("deleting");
    setMessage("");

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        fail(data.message ?? "처리하지 못했습니다.");
        setMode("idle");
        setBusy("none");
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch {
      fail("서버에 연결할 수 없습니다.");
      setBusy("none");
    }
  }

  if (lockedReason) {
    return (
      <p className="rounded-md border border-line bg-surface-sunk px-3 py-2 text-sm text-steel">{lockedReason}</p>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (mode === "editing" ? setMode("idle") : void openEditor())}
          disabled={busy !== "none"}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          {mode === "editing" ? "수정 취소" : editLabel}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "confirmDelete" ? "idle" : "confirmDelete")}
          disabled={busy !== "none"}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-steel disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </button>
      </div>

      <p aria-live="polite" className={`text-sm ${tone === "error" ? "font-medium text-danger-fg" : "text-steel"}`}>
        {message}
      </p>

      {mode === "confirmDelete" ? (
        <div className="w-full rounded-md border border-warning-border bg-warning-bg p-4 text-left sm:max-w-md">
          <p className="text-sm font-semibold text-ink">
            {displayName} — {deleteLabel}할까요?
          </p>
          {deleteDescription ? <p className="mt-2 text-sm text-steel">{deleteDescription}</p> : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy === "deleting"}
              className="inline-flex items-center gap-2 rounded-md bg-warning-fg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy === "deleting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-steel"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {mode === "editing" ? (
        <form onSubmit={save} noValidate className="w-full rounded-md border border-line bg-surface p-5 text-left shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-ink">{displayName} 수정</h3>
            <button
              type="button"
              onClick={() => setMode("idle")}
              aria-label="수정 닫기"
              className="rounded-md p-1 text-steel hover:bg-surface-sunk"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                hint={field.hint}
                error={errors[field.key]?.[0]}
                className={field.wide ? "md:col-span-2" : undefined}
              >
                {(props) => {
                  const common = {
                    ...props,
                    value: values[field.key] ?? "",
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
                      const next = event.target.value;
                      setValues((current) => ({ ...current, [field.key]: next }));
                      setErrors((current) => ({ ...current, [field.key]: undefined }));
                    }
                  };

                  if (field.type === "select") {
                    return (
                      <select {...common}>
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  }

                  if (field.type === "textarea") {
                    return <textarea {...common} className={`${props.className} min-h-24`} />;
                  }

                  const inputType =
                    field.type === "date" ? "date"
                    : field.type === "datetime" ? "datetime-local"
                    : field.type === "email" ? "email"
                    : field.type === "tel" ? "tel"
                    : "text";

                  return (
                    <input
                      {...common}
                      type={inputType}
                      inputMode={field.type === "number" ? "numeric" : undefined}
                    />
                  );
                }}
              </Field>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={busy === "saving"}
              className="inline-flex items-center gap-2 rounded-md bg-marine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              저장
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-steel"
            >
              취소
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
