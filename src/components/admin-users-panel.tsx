"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";
import { TONE_BADGE_CLASS } from "@/lib/status-tone";

type Role = "CEO" | "ADMIN" | "OPERATIONS" | "ACCOUNTING" | "HR" | "EMPLOYEE" | "AUDITOR";
type Status = "ACTIVE" | "INACTIVE" | "ARCHIVED";
type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  createdAt: string;
};

const roleLabels: Record<Role, string> = {
  CEO: "대표",
  ADMIN: "관리자",
  OPERATIONS: "운영",
  ACCOUNTING: "회계",
  HR: "인사",
  EMPLOYEE: "직원",
  AUDITOR: "감사 조회"
};

const statusLabels: Record<Status, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  ARCHIVED: "보관"
};

const roleOptions: Role[] = ["ADMIN", "OPERATIONS", "ACCOUNTING", "HR", "EMPLOYEE", "AUDITOR"];

export function AdminUsersPanel({ currentUserRole }: { currentUserRole: Role }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "EMPLOYEE" as Role });

  const availableRoles = useMemo(
    () => (currentUserRole === "CEO" ? (["CEO", ...roleOptions] as Role[]) : roleOptions),
    [currentUserRole]
  );

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "계정 목록을 불러오지 못했습니다.");
      setUsers(data.users);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "계정을 만들지 못했습니다.");
      setForm({ email: "", name: "", password: "", role: "EMPLOYEE" });
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정을 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(user: User, changes: Partial<Pick<User, "role" | "status">> & { password?: string }) {
    setMessage("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "계정 변경에 실패했습니다.");
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
  }

  async function resetPassword(user: User) {
    const password = window.prompt(`${user.name}님의 새 비밀번호(12자 이상)를 입력하세요.`);
    if (!password) return;
    await updateUser(user, { password });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-5">
          <ShieldCheck className="h-5 w-5 text-marine" />
          <p className="mt-4 text-sm text-steel">등록 계정</p>
          <p className="mt-1 text-3xl font-bold text-ink">{users.length}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <UserRoundCog className="h-5 w-5 text-marine" />
          <p className="mt-4 text-sm text-steel">활성 계정</p>
          <p className="mt-1 text-3xl font-bold text-ink">{users.filter((user) => user.status === "ACTIVE").length}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <KeyRound className="h-5 w-5 text-marine" />
          <p className="mt-4 text-sm text-steel">권한 관리</p>
          <p className="mt-1 text-sm font-bold text-ink">관리자 전용</p>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink">직원 계정 추가</h3>
            <p className="mt-1 text-sm text-steel">비밀번호는 12자 이상으로 설정하세요.</p>
          </div>
          <Plus className="h-5 w-5 text-marine" />
        </div>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input required type="text" placeholder="이름" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" />
          <input required type="email" placeholder="이메일" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" />
          <input required minLength={12} type="password" placeholder="초기 비밀번호" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine" />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine">
            {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            계정 추가
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-bold text-ink">계정 목록</h3>
            <p className="mt-1 text-sm text-steel">관리자 계정은 CEO만 추가·변경할 수 있습니다.</p>
          </div>
          <button type="button" onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-steel hover:text-marine">
            <RefreshCw className="h-4 w-4" /> 새로고침
          </button>
        </div>
        {message ? <p className="mx-5 mt-4 rounded-md bg-[#fff4ed] px-3 py-3 text-sm text-[#9a3412]">{message}</p> : null}
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-steel"><Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-paper text-steel"><tr><th className="px-5 py-3 font-medium">이름</th><th className="px-5 py-3 font-medium">이메일</th><th className="px-5 py-3 font-medium">역할</th><th className="px-5 py-3 font-medium">상태</th><th className="px-5 py-3 font-medium">관리</th></tr></thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 font-bold text-ink">{user.name}</td>
                    <td className="px-5 py-4 text-steel">{user.email}</td>
                    <td className="px-5 py-4"><select value={user.role} disabled={user.role === "CEO" && currentUserRole !== "CEO"} onChange={(event) => void updateUser(user, { role: event.target.value as Role })} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"><option value="CEO">{roleLabels.CEO}</option>{roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => void updateUser(user, { status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} disabled={user.role === "CEO" && currentUserRole !== "CEO"} className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${user.status === "ACTIVE" ? TONE_BADGE_CLASS.success : TONE_BADGE_CLASS.neutral}`} title={user.status === "ACTIVE" ? "클릭하면 비활성으로 전환합니다" : "클릭하면 활성으로 전환합니다"}>{statusLabels[user.status]}</button></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => void resetPassword(user)} className="text-sm font-medium text-marine hover:underline">비밀번호 재설정</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
