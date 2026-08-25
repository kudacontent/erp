import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const eventSchema = z.object({
  title: z.string().trim().min(1, "일정 제목을 입력하세요.").max(160),
  category: z.string().trim().min(1).max(40).default("내부"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  description: z.string().trim().max(4000).optional().nullable()
});

function serializeEvent(event: { id: string; title: string; category: string; startTime: Date; endTime: Date; isAllDay: boolean; description: string | null; syncStatus: string }) {
  return { ...event, startTime: event.startTime.toISOString(), endTime: event.endTime.toISOString() };
}

export const GET = withAuth(async () => {
  const events = await prisma.calendarEvent.findMany({ orderBy: { startTime: "asc" }, take: 500 });
  return NextResponse.json({ ok: true, events: events.map(serializeEvent) });
});

export const POST = withAuth(async (request, _context, user) => {
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  const data = parsed.data;
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  if (endTime <= startTime) return NextResponse.json({ ok: false, message: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      category: data.category,
      startTime,
      endTime,
      isAllDay: data.isAllDay,
      description: data.description || null,
      syncStatus: "LOCAL_ONLY"
    }
  });

  await prisma.auditLog.create({ data: { action: "CREATE", entityType: "CALENDAR_EVENT", entityId: event.id, afterData: { title: event.title }, userId: user.id } }).catch(() => undefined);
  return NextResponse.json({ ok: true, event: serializeEvent(event) }, { status: 201 });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "HR", "EMPLOYEE"], write: true });
