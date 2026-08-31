"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, UserMinus, X } from "lucide-react";
import { Field } from "@/components/ui/field";

type EmployeeForm = {
  name: string;
  role: string;
  department: string;
  joinedAt: string;
  phone: string;
  email: string;
};

const EMPTY: EmployeeForm = { name: "", role: "", department: "", joinedAt: "", phone: "", email: "" };

/**
 * 인사 목록의 행마다 붙는 수정 · 퇴사 처리 버튼.
 *
 * 인사는 상세 화면이 따로 없어서 목록에서 바로 처리한다.
 * 퇴사 처리는 실제 삭제가 아니라 status 를 ARCHIVED 로 바꾸는 것이다 —
 * 지출 결재자·회의 참석자 기록이 직원을 참조하기 때문이다.
 */
export function EmployeeRowActions({
  employeeId,
  employeeName,
  archived
}: {
  employeeId: string;
  employeeName: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmArchive">("idle");
  const [form, setForm] = useState<EmployeeForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeForm, string[]>>>({});
  const [busy, setBusy] = useState<"none" | "loading" | "saving" | "archiving">("none");
  const [message, setMessage] = useState("");

  const endpoint = `/api/hr/employees/${employeeId}`;

  async function openEditor() {
    setBusy("loading");
    setMessage("");

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "직원 정보를 불러오지 못했습니다.");
        setBusy("none");
        return;
      }

      const e = data.employee;
      setForm({
        name: e.name ?? "",
        role: e.role ?? "",
        department: e.department ?? "",
        joinedAt: (e.joinedAt ?? "").slice(0, 10),
        phone: e.phone ?? "",
        email: e.email ?? ""
      });
      setErrors({});
      setMode("editing");
    } catch {
      setMessage("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  function update<K extends keyof EmployeeForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("saving");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          joinedAt: form.joinedAt ? new Date(`${form.joinedAt}T00:00:00`).toISOString() : undefined
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "입력값을 확인하세요.");
        setBusy("none");
        return;
      }

      setMode("idle");
      router.refresh();
    } catch {
      setMessage("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  async function archive() {
    setBusy("archiving");
    setMessage("");

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "퇴사 처리에 실패했습니다.");
        setBusy("none");
        return;
      }

      setMode("idle");
      router.refresh();
    } catch {
      setMessage("서버에 연결할 수 없습니다.");
    } finally {
      setBusy("none");
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void openEditor()}
          disabled={busy !== "none"}
          aria-label={`${employeeName} 정보 수정`}
          title="정보 수정"
          className="rounded-md p-1.5 text-steel transition-colors hover:bg-surface-sunk hover:text-marine disabled:opacity-50"
        >
          {busy === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
        </button>

        {archived ? null : (
          <button
            type="button"
            onClick={() => setMode("confirmArchive")}
            disabled={busy !== "none"}
            aria-label={`${employeeName} 퇴사 처리`}
            title="퇴사 처리"
            className="rounded-md p-1.5 text-steel transition-colors hover:bg-surface-sunk hover:text-danger-fg disabled:opacity-50"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        )}
      </div>

      {message ? <p className="mt-1 text-xs font-medium text-danger-fg">{message}</p> : null}

      {mode === "confirmArchive" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="퇴사 처리 확인">
          <div className="w-full max-w-md rounded-md bg-surface p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-ink">{employeeName} 님을 퇴사 처리할까요?</h3>
            <p className="mt-2 text-sm text-steel">
              목록에서 사라지고 퇴사일이 오늘로 기록됩니다.{" "}
              <strong className="font-semibold text-ink">지출 결재·회의 참석 기록은 그대로 남습니다.</strong>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void archive()}
                disabled={busy === "archiving"}
                className="inline-flex items-center gap-2 rounded-md bg-warning-fg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy === "archiving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                퇴사 처리
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "editing" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="직원 정보 수정">
          <form onSubmit={save} noValidate className="w-full max-w-xl rounded-md bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">직원 정보 수정</h3>
              <button type="button" onClick={() => setMode("idle")} aria-label="닫기" className="rounded-md p-2 text-steel hover:bg-surface-sunk">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="이름" required error={errors.name?.[0]}>
                {(props) => <input {...props} value={form.name} onChange={(e) => update("name", e.target.value)} />}
              </Field>
              <Field label="직무" required error={errors.role?.[0]}>
                {(props) => <input {...props} value={form.role} onChange={(e) => update("role", e.target.value)} />}
              </Field>
              <Field label="부서">
                {(props) => <input {...props} value={form.department} onChange={(e) => update("department", e.target.value)} />}
              </Field>
              <Field label="입사일">
                {(props) => <input {...props} type="date" value={form.joinedAt} onChange={(e) => update("joinedAt", e.target.value)} />}
              </Field>
              <Field label="전화번호">
                {(props) => <input {...props} type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />}
              </Field>
              <Field label="이메일" error={errors.email?.[0]}>
                {(props) => <input {...props} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />}
              </Field>
            </div>

            {message ? <p className="mt-3 text-sm font-medium text-danger-fg">{message}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setMode("idle")} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel">
                취소
              </button>
              <button
                type="submit"
                disabled={busy === "saving"}
                className="inline-flex items-center gap-2 rounded-md bg-marine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
