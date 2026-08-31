import { NextResponse } from "next/server";
import { z } from "zod";
import { HR_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const roles = ["CEO", "ADMIN", "HR"] as const;
const employeeSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(80),
  role: z.string().trim().min(1, "직무를 입력하세요.").max(120),
  department: z.string().trim().max(120).optional().nullable(),
  joinedAt: z.string().datetime(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("이메일 형식을 확인하세요.").optional().or(z.literal("")),
  baseSalary: z.coerce.number().int().nonnegative().optional()
});

function serializeEmployee(employee: { id: string; name: string; role: string; department: string | null; baseSalary: bigint | null; joinedAt: Date; resignedAt: Date | null; status: string; phone: string | null; email: string | null }) {
  return {
    ...employee,
    baseSalary: employee.baseSalary?.toString() ?? null,
    joinedAt: employee.joinedAt.toISOString(),
    resignedAt: employee.resignedAt?.toISOString() ?? null
  };
}

// 급여가 들어 있으므로 인사 권한이 있는 사람만 읽는다
export const GET = withAuth(async () => {
  const employees = await prisma.employee.findMany({ orderBy: [{ status: "asc" }, { joinedAt: "desc" }] });
  return NextResponse.json({ ok: true, employees: employees.map(serializeEmployee) });
}, { roles: [...HR_ROLES] });

export const POST = withAuth(async (request) => {
  const parsed = employeeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data = parsed.data;
  const joinedAt = new Date(data.joinedAt);
  if (Number.isNaN(joinedAt.getTime())) return NextResponse.json({ ok: false, message: "입사일을 확인하세요." }, { status: 400 });

  const employee = await prisma.employee.create({
    data: {
      name: data.name,
      role: data.role,
      department: data.department || null,
      baseSalary: data.baseSalary === undefined ? null : BigInt(data.baseSalary),
      joinedAt,
      phone: data.phone || null,
      email: data.email || null,
      status: "ACTIVE"
    }
  });
  return NextResponse.json({ ok: true, employee: serializeEmployee(employee) }, { status: 201 });
}, { roles: [...roles], write: true });
