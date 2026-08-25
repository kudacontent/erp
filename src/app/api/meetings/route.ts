import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "HR"] as const;
const meetingStatus = ["SCHEDULED", "DONE", "MINUTES_DRAFT", "FOLLOW_UP", "COMPLETED"] as const;

const meetingSchema = z.object({
  title: z.string().trim().min(1, "회의 제목을 입력하세요.").max(160),
  meetingType: z.string().trim().min(1).max(80).default("내부 회의"),
  clientId: z.string().trim().optional().nullable(),
  location: z.string().trim().max(240).optional().nullable(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional().nullable(),
  agenda: z.string().trim().max(4000).optional().nullable(),
  minutes: z.string().trim().max(50000).optional().nullable(),
  status: z.enum(meetingStatus).optional()
});

function serializeMeeting(meeting: {
  id: string;
  title: string;
  meetingType: string;
  status: string;
  clientId: string | null;
  location: string | null;
  startedAt: Date;
  endedAt: Date | null;
  agenda: string | null;
  minutes: string | null;
}) {
  return {
    ...meeting,
    startedAt: meeting.startedAt.toISOString(),
    endedAt: meeting.endedAt?.toISOString() ?? null
  };
}

async function assertClient(clientId: string | null | undefined) {
  if (!clientId) return;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new Error("CLIENT_NOT_FOUND");
}

export const GET = withAuth(async () => {
  const meetings = await prisma.meeting.findMany({
    include: { client: { select: { id: true, name: true } }, _count: { select: { attendees: true, actionItems: true } } },
    orderBy: { startedAt: "desc" },
    take: 200
  });

  return NextResponse.json({
    ok: true,
    meetings: meetings.map((meeting) => ({
      ...serializeMeeting(meeting),
      client: meeting.client,
      attendeeCount: meeting._count.attendees,
      actionItemCount: meeting._count.actionItems
    }))
  });
});

export const POST = withAuth(async (request, _context, user) => {
  const parsed = meetingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const startedAt = data.startedAt ? new Date(data.startedAt) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    return NextResponse.json({ ok: false, message: "회의 시작 시간이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await assertClient(data.clientId);
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        meetingType: data.meetingType,
        status: data.status ?? "MINUTES_DRAFT",
        clientId: data.clientId || null,
        location: data.location || null,
        startedAt,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
        agenda: data.agenda || null,
        minutes: data.minutes || null,
        createdById: user.id
      }
    });

    return NextResponse.json({ ok: true, meeting: serializeMeeting(meeting) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return NextResponse.json({ ok: false, message: "연결할 거래처를 찾을 수 없습니다." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: "회의록을 저장하지 못했습니다." }, { status: 503 });
  }
}, { roles: [...writableRoles], write: true });
