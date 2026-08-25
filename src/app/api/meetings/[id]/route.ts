import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "HR"] as const;
const meetingStatus = ["SCHEDULED", "DONE", "MINUTES_DRAFT", "FOLLOW_UP", "COMPLETED"] as const;
const updateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  meetingType: z.string().trim().min(1).max(80).optional(),
  clientId: z.string().trim().optional().nullable(),
  location: z.string().trim().max(240).optional().nullable(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional().nullable(),
  agenda: z.string().trim().max(4000).optional().nullable(),
  minutes: z.string().trim().max(50000).optional().nullable(),
  status: z.enum(meetingStatus).optional()
});

export const PATCH = withAuth(async (request, context) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  if (data.clientId) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!client) return NextResponse.json({ ok: false, message: "연결할 거래처를 찾을 수 없습니다." }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ ok: false, message: "회의록을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.meetingType !== undefined ? { meetingType: data.meetingType } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId || null } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.startedAt !== undefined ? { startedAt: new Date(data.startedAt) } : {}),
      ...(data.endedAt !== undefined ? { endedAt: data.endedAt ? new Date(data.endedAt) : null } : {}),
      ...(data.agenda !== undefined ? { agenda: data.agenda || null } : {}),
      ...(data.minutes !== undefined ? { minutes: data.minutes || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  });

  return NextResponse.json({ ok: true, meeting: {
    ...updated,
    startedAt: updated.startedAt.toISOString(),
    endedAt: updated.endedAt?.toISOString() ?? null
  } });
}, { roles: [...writableRoles], write: true });

export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const attachments = await prisma.attachment.findMany({
    where: { entityType: "MEETING", entityId: id },
    select: { fileUrl: true }
  });
  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { id: true } });
  if (!meeting) return NextResponse.json({ ok: false, message: "회의록을 찾을 수 없습니다." }, { status: 404 });

  await prisma.$transaction([
    prisma.attachment.deleteMany({ where: { entityType: "MEETING", entityId: id } }),
    prisma.meeting.delete({ where: { id } })
  ]);

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
  await Promise.all(attachments.map(async ({ fileUrl }) => {
    const prefix = "/api/uploads/meetings/";
    if (!fileUrl.startsWith(prefix)) return;
    const filePath = path.join(uploadRoot, "meetings", path.basename(fileUrl.slice(prefix.length)));
    await unlink(filePath).catch(() => undefined);
  }));

  return NextResponse.json({ ok: true, message: "회의록을 삭제했습니다." });
}, { roles: [...writableRoles], write: true });
