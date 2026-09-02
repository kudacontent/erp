import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

/** 계약에 붙은 검사 보고서를 가리키는 표식 */
const ENTITY_TYPE = "CONTRACT_INSPECTION_REPORT";

const MAX_BYTES = 50 * 1024 * 1024;

export const GET = withAuth(async (_request, context) => {
  const { slug } = await context.params;

  const reports = await prisma.attachment.findMany({
    where: { entityType: ENTITY_TYPE, entityId: slug },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    ok: true,
    reports: reports.map((report) => ({
      id: report.id,
      fileName: report.fileName,
      fileUrl: report.fileUrl,
      sizeBytes: report.fileSize ? Number(report.fileSize) : 0,
      uploadedAt: report.createdAt.toISOString().slice(0, 10)
    }))
  });
}, { roles: [...FINANCE_READ_ROLES] });

/**
 * 검사 보고서 PDF 첨부.
 *
 * 보고서 자체는 surveyreport 라는 별도 시스템에서 만들어 거래처로 나간다.
 * ERP 는 그 문서를 만들지 않고, 나간 사본을 계약에 붙여 둔다 —
 * 나중에 "이 청구의 근거가 무엇이냐" 를 물었을 때 계약 한 곳에서 답할 수 있어야 하기 때문이다.
 */
export const POST = withAuth(async (request, context, user) => {
  const { slug } = await context.params;

  const contract = await prisma.projectContract.findUnique({
    where: { id: slug },
    select: { id: true, projectTitle: true, contractStatus: true }
  });

  if (!contract) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  if (contract.contractStatus === "CANCELED") {
    return NextResponse.json({ ok: false, message: "취소된 계약입니다." }, { status: 409 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json({ ok: false, message: "검사 보고서는 PDF 파일만 첨부할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "보고서는 50MB 이하로 올려주세요." }, { status: 413 });
  }

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
  const directory = path.join(uploadRoot, "inspections");
  const storedName = `${randomUUID()}.pdf`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedName), Buffer.from(await file.arrayBuffer()), { mode: 0o600 });

  const attachment = await prisma.attachment.create({
    data: {
      entityType: ENTITY_TYPE,
      entityId: slug,
      fileName: file.name || storedName,
      fileUrl: `/api/uploads/inspections/${storedName}`,
      mimeType: "application/pdf",
      fileSize: BigInt(file.size),
      uploadedBy: user.id
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "ATTACH",
        entityType: "PROJECT_CONTRACT",
        entityId: slug,
        afterData: { report: attachment.fileName },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json(
    {
      ok: true,
      report: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeBytes: file.size,
        uploadedAt: attachment.createdAt.toISOString().slice(0, 10)
      }
    },
    { status: 201 }
  );
}, { roles: [...writableRoles], write: true });

/**
 * 잘못 올린 보고서를 뗀다.
 *
 * 파일 자체는 디스크에 남긴다. 첨부 기록만 지워 목록에서 감춘다 —
 * 청구 근거로 한 번 쓰인 문서를 되돌릴 수 없게 지우는 것은 위험하다.
 */
export const DELETE = withAuth(async (request, context, user) => {
  const { slug } = await context.params;
  const reportId = new URL(request.url).searchParams.get("reportId") ?? "";

  const attachment = await prisma.attachment.findFirst({
    where: { id: reportId, entityType: ENTITY_TYPE, entityId: slug }
  });

  if (!attachment) {
    return NextResponse.json({ ok: false, message: "첨부를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });

  await prisma.auditLog
    .create({
      data: {
        action: "DETACH",
        entityType: "PROJECT_CONTRACT",
        entityId: slug,
        beforeData: { report: attachment.fileName },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, message: `${attachment.fileName} 첨부를 뗐습니다.` });
}, { roles: [...writableRoles], write: true });
