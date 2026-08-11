"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Pencil, Plus, RefreshCw, Save, ShieldCheck, Trash2, UserRoundCog, X } from "lucide-react";

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

type UserEditForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
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

export function AdminUsersPanel({ currentUserRole, currentUserId }: { currentUserRole: Role; currentUserId: string }) {
  const canManageUsers = currentUserRole === "CEO";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "EMPLOYEE" as Role });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserEditForm | null>(null);

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
    if (!canManageUsers) return;
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

  async function updateUser(user: User, changes: Partial<Pick<User, "name" | "email" | "role" | "status">> & { password?: string }) {
    if (!canManageUsers) return false;
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "계정 변경에 실패했습니다.");
        return false;
      }
      setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
      return true;
    } catch {
      setMessage("네트워크 오류로 계정 변경에 실패했습니다.");
      return false;
    }
  }

  function beginEdit(user: User) {
    if (!canManageUsers) return;
    setEditingUserId(user.id);
    setEditForm({ name: user.name, email: user.email, password: "", role: user.role, status: user.status });
    setMessage("");
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditForm(null);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageUsers || !editingUserId || !editForm) return;

    const user = users.find((item) => item.id === editingUserId);
    if (!user) return;

    setSaving(true);
    const updated = await updateUser(user, {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      status: editForm.status,
      ...(editForm.password ? { password: editForm.password } : {})
    });

    if (updated) {
      cancelEdit();
      setMessage("계정 정보를 수정했습니다.");
    }
    setSaving(false);
  }

  async function resetPassword(user: User) {
    if (!canManageUsers) return;
    const password = window.prompt(`${user.name}님의 새 비밀번호(12자 이상)를 입력하세요.`);
    if (!password) return;
    if (await updateUser(user, { password })) {
      setMessage("비밀번호를 변경했습니다.");
    }
  }

  async function archiveUser(user: User) {
    if (!canManageUsers || user.status === "ARCHIVED") return;
    if (!window.confirm(`${user.name} 계정을 보관 처리할까요? 보관된 계정은 로그인할 수 없습니다.`)) return;

    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "계정 삭제에 실패했습니다.");
      return;
    }

    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, status: "ARCHIVED" } : item)));
    setMessage(data.message ?? "계정을 보관 처리했습니다.");
  }

  async function permanentlyDeleteUser(user: User) {
    if (!canManageUsers || user.id === currentUserId) return;

    const typedEmail = window.prompt(`완전 삭제하려면 아래 이메일을 그대로 입력하세요.\n${user.email}`);
    if (typedEmail === null) return;
    if (typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setMessage("이메일이 일치하지 않아 영구 삭제를 취소했습니다.");
      return;
    }

    if (!window.confirm(`${user.name} 계정을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}?permanent=true`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message ?? "계정을 영구 삭제하지 못했습니다.");
        return;
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      if (editingUserId === user.id) cancelEdit();
      setMessage(data.message ?? "계정을 영구 삭제했습니다.");
    } catch {
      setMessage("네트워크 오류로 계정을 영구 삭제하지 못했습니다.");
    }
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
            <p className="mt-1 text-sm text-steel">{canManageUsers ? "비밀번호는 12자 이상으로 설정하세요." : "계정 생성·변경·삭제는 CEO 전용입니다."}</p>
          </div>
          <Plus className="h-5 w-5 text-marine" />
        </div>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input disabled={!canManageUsers} required type="text" placeholder="이름" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50" />
          <input disabled={!canManageUsers} required type="email" placeholder="이메일" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50" />
          <input disabled={!canManageUsers} required minLength={12} type="password" placeholder="초기 비밀번호" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50" />
          <select disabled={!canManageUsers} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50">
            {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
          <button type="submit" disabled={!canManageUsers || saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            계정 추가
          </button>
        </form>
      </section>

      {editingUserId && editForm ? (
        <section className="rounded-md border border-[#9dc6d5] bg-[#f8fcfd] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-ink">계정 정보 수정</h3>
              <p className="mt-1 text-sm text-steel">비밀번호를 비워두면 기존 비밀번호를 유지합니다.</p>
            </div>
            <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-steel hover:text-marine"><X className="h-4 w-4" />취소</button>
          </div>
          <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input disabled={!canManageUsers} required type="text" placeholder="이름" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-marine disabled:opacity-50" />
            <input disabled={!canManageUsers} required type="email" placeholder="이메일" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-marine disabled:opacity-50" />
            <input disabled={!canManageUsers} minLength={12} type="password" placeholder="새 비밀번호(선택)" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-marine disabled:opacity-50" />
            <select disabled={!canManageUsers || editingUserId === currentUserId} value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50">
              {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
            <select disabled={!canManageUsers || editingUserId === currentUserId} value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as Status })} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-50">
              {Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </select>
            <button type="submit" disabled={!canManageUsers || saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 xl:col-start-5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "저장 중…" : "수정 저장"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-bold text-ink">계정 목록</h3>
            <p className="mt-1 text-sm text-steel">{canManageUsers ? "관리자 계정은 CEO만 추가·변경·삭제할 수 있습니다. 보관은 로그인 차단, 영구 삭제는 되돌릴 수 없습니다." : "조회 전용입니다. 계정 관리는 CEO로 로그인하세요."}</p>
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
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-paper text-steel"><tr><th className="px-5 py-3 font-medium">이름</th><th className="px-5 py-3 font-medium">이메일</th><th className="px-5 py-3 font-medium">역할</th><th className="px-5 py-3 font-medium">상태</th><th className="px-5 py-3 font-medium">관리</th></tr></thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 font-bold text-ink">{user.name}</td>
                    <td className="px-5 py-4 text-steel">{user.email}</td>
                    <td className="px-5 py-4"><select value={user.role} disabled={!canManageUsers || user.id === currentUserId || user.role === "CEO" && currentUserRole !== "CEO"} onChange={(event) => void updateUser(user, { role: event.target.value as Role })} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"><option value="CEO">{roleLabels.CEO}</option>{roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => void updateUser(user, { status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} disabled={!canManageUsers || user.id === currentUserId || user.role === "CEO" && currentUserRole !== "CEO" || user.status === "ARCHIVED"} className={user.status === "ACTIVE" ? "rounded-md bg-[#ecfdf3] px-2 py-1 text-xs font-bold text-[#027a48] disabled:cursor-not-allowed disabled:opacity-50" : "rounded-md bg-paper px-2 py-1 text-xs font-bold text-steel disabled:cursor-not-allowed disabled:opacity-50"}>{statusLabels[user.status]}</button></td>
                    <td className="px-5 py-4"><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => beginEdit(user)} disabled={!canManageUsers} className="inline-flex items-center gap-1 text-sm font-medium text-marine hover:underline disabled:cursor-not-allowed disabled:opacity-50"><Pencil className="h-4 w-4" />수정</button><button type="button" onClick={() => void resetPassword(user)} disabled={!canManageUsers || user.status === "ARCHIVED"} className="text-sm font-medium text-marine hover:underline disabled:cursor-not-allowed disabled:opacity-50">비밀번호 재설정</button><button type="button" onClick={() => void archiveUser(user)} disabled={!canManageUsers || user.id === currentUserId || user.status === "ARCHIVED"} className="inline-flex items-center gap-1 text-sm font-medium text-[#b42318] hover:underline disabled:cursor-not-allowed disabled:opacity-50" title="계정 보관"><Trash2 className="h-4 w-4" />보관</button><button type="button" onClick={() => void permanentlyDeleteUser(user)} disabled={!canManageUsers || user.id === currentUserId} className="text-sm font-medium text-[#b42318] hover:underline disabled:cursor-not-allowed disabled:opacity-50" title="계정 영구 삭제">영구 삭제</button></div></td>
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
