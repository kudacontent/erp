import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

const schema = z.object({
  inspectionStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE", "ON_HOLD"]),
  inspectionMemo: z.string().trim().max(2000).optional().nullable()
});

/**
 * 검사 작업 진행 상황 기록.
 *
 * 착수일·완료일·담당자는 사용자가 입력하지 않고 서버가 채운다 —
 * 이 날짜들이 청구의 근거가 되는데, 손으로 적게 하면 비거나 틀린다.
 *
 * 착수일은 처음 '검사 중' 으로 바꾼 시점에 한 번만 찍고 이후 덮어쓰지 않는다.
 * 보류됐다 재개해도 실제로 일을 시작한 날은 처음 그날이기 때문이다.
 */
export const PATCH = withAuth(async (request, context, user) => {
  const { slug } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const contract = await prisma.projectContract.findUnique({
    where: { id: slug },
    select: {
      id: true,
      projectTitle: true,
      inspectionStatus: true,
      inspectionStartedAt: true,
      contractStatus: true
    }
  });

  if (!contract) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  if (contract.contractStatus === "CANCELED") {
    return NextResponse.json({ ok: false, message: "취소된 계약입니다." }, { status: 409 });
  }

  const { inspectionStatus, inspectionMemo } = parsed.data;
  const now = new Date();
  // 아직 시작 전으로 되돌리면 날짜와 담당자도 함께 지운다
  const resetting = inspectionStatus === "NOT_STARTED";

  const updated = await prisma.projectContract.update({
    where: { id: slug },
    data: {
      inspectionStatus,
      inspectionMemo: inspectionMemo || null,
      // 착수일은 한 번만 찍는다 (보류 후 재개해도 처음 날짜를 지킨다)
      inspectionStartedAt: resetting ? null : contract.inspectionStartedAt ?? now,
      inspectionDoneAt: inspectionStatus === "DONE" ? now : null,
      inspectorId: resetting ? null : user.id
    },
    select: { inspectionStatus: true, inspectionStartedAt: true, inspectionDoneAt: true }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "INSPECT",
        entityType: "PROJECT_CONTRACT",
        entityId: slug,
        beforeData: { inspectionStatus: contract.inspectionStatus },
        afterData: { inspectionStatus: updated.inspectionStatus },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, inspection: updated });
}, { roles: [...writableRoles], write: true });
