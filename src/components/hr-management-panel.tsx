"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Loader2, Mail, Phone, UserRoundCog, X } from "lucide-react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";

export type EmployeeView = {
  id: string;
  name: string;
  department: string;
  role: string;
  joined: string;
  status: string;
  phone: string;
  email: string;
};

function EmployeeRegistrationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", role: "", department: "", joinedAt: new Date().toISOString().slice(0, 10), phone: "", email: "", baseSalary: "" });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/hr/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, joinedAt: new Date(`${form.joinedAt}T00:00:00`).toISOString(), baseSalary: form.baseSalary || undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "직원을 등록하지 못했습니다.");
      setOpen(false);
      setForm({ name: "", role: "", department: "", joinedAt: new Date().toISOString().slice(0, 10), phone: "", email: "", baseSalary: "" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원을 등록하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white"><FilePlus2 className="h-4 w-4" /> 직원 등록</button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#092235]/50 p-4" role="dialog" aria-modal="true" aria-label="직원 등록"><form onSubmit={submit} className="w-full max-w-xl rounded-md bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold text-ink">직원 등록</h3><p className="mt-1 text-sm text-steel">인사 관리에 등록할 직원 정보를 입력하세요.</p></div><button type="button" onClick={() => setOpen(false)} disabled={busy} aria-label="닫기" className="rounded-md p-2 text-steel hover:bg-paper"><X className="h-5 w-5" /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-xs font-medium text-steel">이름</span><input required value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label><label className="block"><span className="text-xs font-medium text-steel">직무</span><input required value={form.role} onChange={(event) => update("role", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label><label className="block"><span className="text-xs font-medium text-steel">부서</span><input value={form.department} onChange={(event) => update("department", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label><label className="block"><span className="text-xs font-medium text-steel">입사일</span><input required type="date" value={form.joinedAt} onChange={(event) => update("joinedAt", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label><label className="block"><span className="text-xs font-medium text-steel">전화번호</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label><label className="block"><span className="text-xs font-medium text-steel">이메일</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" /></label></div>{message ? <p className="mt-3 rounded-md bg-[#fff4ed] px-3 py-2 text-sm text-[#b42318]">{message}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-md border border-line px-3 py-2 text-sm font-bold text-steel">취소</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-marine px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} 등록</button></div></form></div> : null}
  </>;
}

export function HrManagementPanel({ employees, departmentSummary }: { employees: EmployeeView[]; departmentSummary: Array<{ label: string; count: number }> }) {
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("전체");
  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return employees.filter((employee) => (selectedStatus === "전체" || employee.status === selectedStatus) && (!normalized || [employee.name, employee.department, employee.role, employee.joined, employee.phone, employee.email].join(" ").toLowerCase().includes(normalized)));
  }, [employees, query, selectedStatus]);

  return <>
    <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]"><div className="min-w-0 rounded-md border border-line bg-white p-5"><ResponsiveFilterBar searchLabel="직원 검색" searchPlaceholder="이름, 부서, 직무 검색" searchValue={query} onSearchChange={setQuery} options={["전체", "재직", "휴직", "퇴사"]} selectedOption={selectedStatus} onOptionChange={setSelectedStatus} /><div className="hidden overflow-x-auto rounded-md border border-line md:block"><table className="min-w-[760px] w-full border-collapse text-left text-sm"><thead className="bg-paper text-steel"><tr><th className="px-4 py-3 font-medium">직원</th><th className="px-4 py-3 font-medium">부서/직무</th><th className="px-4 py-3 font-medium">입사일</th><th className="px-4 py-3 font-medium">연락처</th><th className="px-4 py-3 font-medium">상태</th></tr></thead><tbody className="divide-y divide-line bg-white">{filteredEmployees.length ? filteredEmployees.map((employee) => <tr key={employee.id} className="hover:bg-paper"><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-marine"><UserRoundCog className="h-5 w-5" /></span><p className="font-bold text-ink">{employee.name}</p></div></td><td className="px-4 py-4"><p className="font-medium text-ink">{employee.department}</p><p className="mt-1 text-xs text-steel">{employee.role}</p></td><td className="px-4 py-4 text-steel">{employee.joined}</td><td className="px-4 py-4"><div className="flex flex-col gap-1 text-xs text-steel"><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{employee.phone}</span><span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span></div></td><td className="px-4 py-4"><StatusBadge status={employee.status} /></td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">{employees.length ? "조건에 맞는 직원이 없습니다." : "등록된 직원이 없습니다."}</td></tr>}</tbody></table></div><div className="space-y-3 md:hidden">{filteredEmployees.length ? filteredEmployees.map((employee) => <div key={employee.id} className="rounded-md border border-line bg-paper/60 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-marine"><UserRoundCog className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-bold text-ink">{employee.name}</p><p className="mt-1 truncate text-xs text-steel">{employee.department} · {employee.role}</p></div></div><StatusBadge status={employee.status} className="shrink-0" /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-md bg-white px-3 py-2"><p className="text-steel">입사일</p><p className="mt-1 font-bold text-ink">{employee.joined}</p></div><div className="rounded-md bg-white px-3 py-2"><p className="text-steel">연락처</p><p className="mt-1 truncate font-bold text-ink">{employee.phone}</p></div></div><p className="mt-3 truncate text-xs text-steel">{employee.email}</p></div>) : <div className="rounded-md border border-line bg-paper px-4 py-10 text-center text-sm font-medium text-steel">{employees.length ? "조건에 맞는 직원이 없습니다." : "등록된 직원이 없습니다."}</div>}</div></div><aside className="space-y-4"><section className="rounded-md border border-line bg-white p-5"><h3 className="mb-4 font-bold text-ink">부서 구성</h3><div className="space-y-3">{departmentSummary.length ? departmentSummary.map((item) => <div key={item.label} className="flex items-center justify-between rounded-md bg-paper px-3 py-3"><p className="text-sm font-medium text-ink">{item.label}</p><p className="text-sm font-bold text-marine">{item.count}명</p></div>) : <p className="rounded-md bg-paper px-3 py-4 text-sm text-steel">등록된 부서가 없습니다.</p>}</div></section></aside></section>
  </>;
}

export { EmployeeRegistrationForm };
