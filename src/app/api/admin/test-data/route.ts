import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { denyHardDelete } from "@/lib/hard-delete";

export const runtime = "nodejs";

/**
 * 개발 단계 테스트 데이터 일괄 정리.
 *
 * 개발 중에는 화면을 확인하려고 넣어 본 계약·견적·지출이 계속 쌓인다.
 * 한 건씩 지우는 것보다 영역별로 한 번에 비우는 편이 실제로 시간을 아낀다.
 *
 * ALLOW_HARD_DELETE 가 켜져 있고 최고관리자일 때만 열린다.
 * 거래처·직원은 여기서 지우지 않는다 — 테스트 중에도 계속 쓰는 기준 정보라
 * 실수로 통째로 날리면 다시 만드는 비용이 크다. 개별 삭제로 지운다.
 */
const scopeSchema = z.object({
  scopes: z
    .array(z.enum(["contracts", "estimates", "expenses", "taxInvoices"]))
    .min(1, "지울 영역을 하나 이상 고르세요.")
});

export const GET = withAuth(async (_request, _context, user) => {
  const denied = denyHardDelete(user);
  if (denied) return denied;

  const [contracts, estimates, expenses, taxInvoices] = await Promise.all([
    prisma.projectContract.count(),
    prisma.estimate.count(),
    prisma.expense.count(),
    prisma.taxInvoice.count()
  ]);

  return NextResponse.json({ ok: true, counts: { contracts, estimates, expenses, taxInvoices } });
}, { roles: ["CEO"] });

export const POST = withAuth(async (request, _context, user) => {
  const denied = denyHardDelete(user);
  if (denied) return denied;

  const parsed = scopeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const scopes = new Set(parsed.data.scopes);
  const deleted: Record<string, number> = {};

  // 순서가 중요하다. 참조하는 쪽을 먼저 정리해야 외래키에 걸리지 않는다.
  await prisma.$transaction(async (tx) => {
    if (scopes.has("taxInvoices")) {
      deleted.taxInvoices = (await tx.taxInvoice.deleteMany({})).count;
    }

    if (scopes.has("expenses")) {
      deleted.expenses = (await tx.expense.deleteMany({})).count;
    }

    if (scopes.has("contracts")) {
      // 계약을 지우면 계약 품목은 Cascade 로 함께 사라진다.
      // 세금계산서·회의·일정은 남기고 연결만 끊는다.
      if (!scopes.has("taxInvoices")) {
        await tx.taxInvoice.updateMany({ where: { contractId: { not: null } }, data: { contractId: null } });
      }

      await tx.meeting.updateMany({ where: { contractId: { not: null } }, data: { contractId: null } });
      await tx.calendarEvent.updateMany({ where: { contractId: { not: null } }, data: { contractId: null } });

      if (!scopes.has("estimates")) {
        await tx.estimate.updateMany({
          where: { contractId: { not: null } },
          data: { contractId: null, status: "ACCEPTED" }
        });
      }

      deleted.contracts = (await tx.projectContract.deleteMany({})).count;
    }

    if (scopes.has("estimates")) {
      deleted.estimates = (await tx.estimate.deleteMany({})).count;
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "HARD_DELETE",
        entityType: "TEST_DATA",
        entityId: [...scopes].join(","),
        beforeData: deleted,
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, deleted });
}, { roles: ["CEO"], write: true });
