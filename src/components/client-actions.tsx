"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Pencil, Save, X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { clientTypeOptions, type CreateClientInput } from "@/lib/client-schema";

type EditableClient = {
  name: string;
  clientType: CreateClientInput["clientType"];
  businessNumber: string;
  ceoName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  memo: string;
};

const EMPTY: EditableClient = {
  name: "",
  clientType: "OTHER",
  businessNumber: "",
  ceoName: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  memo: ""
};

type FieldErrors = Partial<Record<keyof EditableClient, string[]>>;

/**
 * 거래처 상세 화면의 수정 · 보관 버튼.
 *
 * 삭제는 "보관"이다. 거래처를 실제로 지우면 계약·세금계산서 이력이 끊기므로
 * 서버가 status 를 ARCHIVED 로 바꾸고 목록에서만 감춘다.
 */
export function ClientActions({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmArchive">("idle");
  const [form, setForm] = useState<EditableClient>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"none" | "loading" | "saving" | "archiving">("none");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");

  function fail(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  async function openEditor() {
    setBusy("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/clients/${clientId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        fail(data.message ?? "거래처 정보를 불러오지 못했습니다.");
        setBusy("none");
        return;
      }

      const c = data.client;
      setForm({
        name: c.name ?? "",
        clientType: c.clientType ?? "OTHER",
        businessNumber: c.businessNumber ?? "",
        ceoName: c.ceoName ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        website: c.website ?? "",
        memo: c.memo ?? ""
      });
      setErrors({});
      setMode("editing");
    } catch {
      fail("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  function update<K extends keyof EditableClient>(key: K, value: EditableClient[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? {});
        fail(data.message ?? "입력값을 확인하세요.");
        setBusy("none");
        return;
      }

      setMode("idle");
      setMessageTone("info");
      setMessage("수정 내용을 저장했습니다.");
      router.refresh();
    } catch {
      fail("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  async function archive() {
    setBusy("archiving");
    setMessage("");

    try {
      const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        fail(data.message ?? "보관 처리에 실패했습니다.");
        setBusy("none");
        return;
      }

      router.push("/clients");
      router.refresh();
    } catch {
      fail("서버에 연결할 수 없습니다.");
      setBusy("none");
    }
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
          {mode === "editing" ? "수정 취소" : "정보 수정"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "confirmArchive" ? "idle" : "confirmArchive")}
          disabled={busy !== "none"}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-steel disabled:opacity-60"
        >
          <Archive className="h-4 w-4" />
          보관
        </button>
      </div>

      <p aria-live="polite" className={`text-sm ${messageTone === "error" ? "font-medium text-danger-fg" : "text-steel"}`}>
        {message}
      </p>

      {mode === "confirmArchive" ? (
        <div className="w-full rounded-md border border-warning-border bg-warning-bg p-4 text-left sm:max-w-md">
          <p className="text-sm font-semibold text-ink">{clientName} 거래처를 보관할까요?</p>
          <p className="mt-2 text-sm text-steel">
            목록에서 사라지지만 <strong className="font-semibold text-ink">계약·세금계산서·회의 기록은 그대로 남습니다.</strong>{" "}
            나중에 다시 활성 상태로 되돌릴 수 있습니다.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void archive()}
              disabled={busy === "archiving"}
              className="inline-flex items-center gap-2 rounded-md bg-warning-fg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy === "archiving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              보관하기
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
        <form
          onSubmit={save}
          noValidate
          className="w-full rounded-md border border-line bg-surface p-5 text-left shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-ink">거래처 정보 수정</h3>
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
            <Field label="거래처명" required error={errors.name?.[0]}>
              {(props) => <input {...props} value={form.name} onChange={(e) => update("name", e.target.value)} />}
            </Field>

            <Field label="거래처 유형">
              {(props) => (
                <select
                  {...props}
                  value={form.clientType}
                  onChange={(e) => update("clientType", e.target.value as EditableClient["clientType"])}
                >
                  {clientTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="사업자등록번호" error={errors.businessNumber?.[0]}>
              {(props) => (
                <input {...props} inputMode="numeric" value={form.businessNumber} onChange={(e) => update("businessNumber", e.target.value)} />
              )}
            </Field>

            <Field label="대표자명">
              {(props) => <input {...props} value={form.ceoName} onChange={(e) => update("ceoName", e.target.value)} />}
            </Field>

            <Field label="대표 연락처">
              {(props) => <input {...props} type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />}
            </Field>

            <Field label="대표 이메일" error={errors.email?.[0]}>
              {(props) => <input {...props} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />}
            </Field>

            <Field label="주소" className="md:col-span-2">
              {(props) => <input {...props} value={form.address} onChange={(e) => update("address", e.target.value)} />}
            </Field>

            <Field label="웹사이트" className="md:col-span-2">
              {(props) => <input {...props} type="url" value={form.website} onChange={(e) => update("website", e.target.value)} />}
            </Field>

            <Field label="메모" className="md:col-span-2">
              {(props) => (
                <textarea {...props} className={`${props.className} min-h-24`} value={form.memo} onChange={(e) => update("memo", e.target.value)} />
              )}
            </Field>
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
