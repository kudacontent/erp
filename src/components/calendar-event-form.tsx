"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Pencil, Trash2, X } from "lucide-react";

export type CalendarEventFormValue = {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  description: string | null;
  syncStatus: string;
};

function toDatetimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function CalendarEventForm({ initialEvent }: { initialEvent?: CalendarEventFormValue | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initialEvent));
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [category, setCategory] = useState(initialEvent?.category ?? "내부");
  const [startTime, setStartTime] = useState(toDatetimeLocal(initialEvent?.startTime ?? new Date()));
  const [endTime, setEndTime] = useState(toDatetimeLocal(initialEvent?.endTime ?? new Date(Date.now() + 60 * 60 * 1000)));
  const [isAllDay, setIsAllDay] = useState(initialEvent?.isAllDay ?? false);
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setOpen(Boolean(initialEvent));
    setTitle(initialEvent?.title ?? "");
    setCategory(initialEvent?.category ?? "내부");
    setStartTime(toDatetimeLocal(initialEvent?.startTime ?? new Date()));
    setEndTime(toDatetimeLocal(initialEvent?.endTime ?? new Date(Date.now() + 60 * 60 * 1000)));
    setIsAllDay(initialEvent?.isAllDay ?? false);
    setDescription(initialEvent?.description ?? "");
    setMessage("");
  }, [initialEvent?.id]);

  function close() {
    if (busy) return;
    setOpen(false);
    setMessage("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(initialEvent ? `/api/calendar/events/${initialEvent.id}` : "/api/calendar/events", {
        method: initialEvent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, startTime: toIso(startTime), endTime: toIso(endTime), isAllDay, description: description || null })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "일정을 저장하지 못했습니다.");
      close();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "일정을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initialEvent || !window.confirm(`“${initialEvent.title}” 일정을 삭제할까요?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/calendar/events/${initialEvent.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "일정을 삭제하지 못했습니다.");
      close();
      router.push("/calendar");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "일정을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white"><CalendarPlus className="h-4 w-4" /> {initialEvent ? "일정 수정" : "일정 등록"}</button>
      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#092235]/50 p-4" role="dialog" aria-modal="true" aria-label="일정 등록">
        <form onSubmit={save} className="w-full max-w-xl rounded-md bg-white p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-ink">{initialEvent ? "일정 수정" : "일정 등록"}</h3><p className="mt-1 text-sm text-steel">ERP 캘린더에 표시할 일정을 입력하세요.</p></div><button type="button" onClick={close} className="rounded-md p-2 text-steel hover:bg-paper" aria-label="닫기"><X className="h-5 w-5" /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-medium text-steel">일정 제목</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" placeholder="예: 주간 운영회의" /></label>
            <label className="block"><span className="text-xs font-medium text-steel">카테고리</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine"><option>내부</option><option>회의</option><option>거래처</option><option>정산</option><option>인사</option></select></label>
            <label className="flex items-end gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm"><input type="checkbox" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} className="h-4 w-4 accent-[#0876a8]" /> 종일 일정</label>
            <label className="block"><span className="text-xs font-medium text-steel">시작</span><input required type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" /></label>
            <label className="block"><span className="text-xs font-medium text-steel">종료</span><input required type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" /></label>
            <label className="block sm:col-span-2"><span className="text-xs font-medium text-steel">메모</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" /></label>
          </div>
          {message ? <p className="mt-3 rounded-md bg-[#fff4ed] px-3 py-2 text-sm text-[#b42318]">{message}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={close} disabled={busy} className="rounded-md border border-line px-3 py-2 text-sm font-bold text-steel">취소</button>{initialEvent ? <button type="button" onClick={() => void remove()} disabled={busy} className="mr-auto inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-bold text-[#b42318]"><Trash2 className="h-4 w-4" /> 삭제</button> : null}<button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-marine px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : initialEvent ? <Pencil className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />} 저장</button></div>
        </form>
      </div> : null}
    </>
  );
}
