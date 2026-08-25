import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  description: z.string().trim().max(4000).optional().nullable()
});

const roles = ["CEO", "ADMIN", "OPERATIONS", "HR", "EMPLOYEE"] as const;

export const PATCH = withAuth(async (request, context) => {
  const { id } = await context.params;
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ ok: false, message: "일정을 찾을 수 없습니다." }, { status: 404 });
  if (event.syncStatus !== "LOCAL_ONLY") return NextResponse.json({ ok: false, message: "Google에서 동기화된 일정은 Google Calendar에서 수정하세요." }, { status: 409 });

  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data = parsed.data;
  const startTime = data.startTime ? new Date(data.startTime) : event.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : event.endTime;
  if (endTime <= startTime) return NextResponse.json({ ok: false, message: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.startTime !== undefined ? { startTime } : {}),
      ...(data.endTime !== undefined ? { endTime } : {}),
      ...(data.isAllDay !== undefined ? { isAllDay: data.isAllDay } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {})
    }
  });
  return NextResponse.json({ ok: true, event: { ...updated, startTime: updated.startTime.toISOString(), endTime: updated.endTime.toISOString() } });
}, { roles: [...roles], write: true });

export const DELETE = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const event = await prisma.calendarEvent.findUnique({ where: { id }, select: { syncStatus: true } });
  if (!event) return NextResponse.json({ ok: false, message: "일정을 찾을 수 없습니다." }, { status: 404 });
  if (event.syncStatus !== "LOCAL_ONLY") return NextResponse.json({ ok: false, message: "Google에서 동기화된 일정은 Google Calendar에서 삭제하세요." }, { status: 409 });
  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true, message: "일정을 삭제했습니다." });
}, { roles: [...roles], write: true });
