import { BriefcaseBusiness, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { EmployeeRegistrationForm, HrManagementPanel, type EmployeeView } from "@/components/hr-management-panel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function employeeStatus(status: string) {
  if (status === "ACTIVE") return "재직";
  if (status === "INACTIVE") return "휴직";
  return "퇴사";
}

export default async function HrPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/hr");

  const employees = await prisma.employee.findMany({ orderBy: [{ status: "asc" }, { joinedAt: "desc" }] });
  const employeeViews: EmployeeView[] = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    department: employee.department || "미지정",
    role: employee.role,
    joined: employee.joinedAt.toLocaleDateString("ko-KR"),
    status: employeeStatus(employee.status),
    phone: employee.phone || "-",
    email: employee.email || "-"
  }));
  const now = new Date();
  const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE");
  const newEmployees = employees.filter((employee) => employee.joinedAt.getFullYear() === now.getFullYear() && employee.joinedAt.getMonth() === now.getMonth());
  const departmentSummary = [...employees.reduce((map, employee) => map.set(employee.department || "미지정", (map.get(employee.department || "미지정") ?? 0) + 1), new Map<string, number>()).entries()].map(([label, count]) => ({ label, count }));

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-3xl font-bold text-ink">인사 관리</h2><p className="mt-2 text-sm text-steel">직원 등록과 재직 현황을 관리합니다.</p></div>
        {(user.role === "CEO" || user.role === "ADMIN" || user.role === "HR") ? <EmployeeRegistrationForm /> : null}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {[{ label: "재직 인원", value: `${activeEmployees.length}명`, hint: "현재 재직 기준" }, { label: "신규 입사", value: `${newEmployees.length}명`, hint: "이번 달" }, { label: "인사 면담", value: "0건", hint: "예정" }, { label: "증명서 요청", value: "0건", hint: "처리 대기" }].map((stat) => <div key={stat.label} className="rounded-md border border-line bg-white p-5"><p className="text-sm font-medium text-steel">{stat.label}</p><p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p><p className="mt-2 text-sm font-bold text-marine">{stat.hint}</p></div>)}
      </section>

      <HrManagementPanel employees={employeeViews} departmentSummary={departmentSummary} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5"><div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-marine" /><h3 className="font-bold text-ink">인사 면담</h3></div><p className="rounded-md bg-paper px-3 py-4 text-sm text-steel">면담 일정을 등록하면 이곳에 표시됩니다.</p></div>
        <div className="rounded-md border border-line bg-white p-5"><div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-marine" /><h3 className="font-bold text-ink">증명서 요청</h3></div><p className="rounded-md bg-paper px-3 py-4 text-sm text-steel">현재 처리 대기 중인 증명서 요청이 없습니다.</p></div>
      </section>
    </main>
  );
}
