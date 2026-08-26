import { redirect } from "next/navigation";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "CEO" && user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 border-b border-line pb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-marine">ADMINISTRATION</p>
        <h2 className="mt-2 text-3xl font-bold text-ink">관리자</h2>
        <p className="mt-2 text-sm text-steel">직원 계정, 역할과 접근 상태를 관리합니다.</p>
      </section>
      <AdminUsersPanel currentUserRole={user.role} />
    </main>
  );
}
