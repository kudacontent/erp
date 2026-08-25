import { Bot, CalendarPlus, CheckSquare, MessageSquareText, Users } from "lucide-react";
import { FilterableMeetingsTable } from "@/components/filterable-meetings-table";
import { MeetingRecorder, type InitialMeeting } from "@/components/meeting-recorder";
import { getClientsForList } from "@/lib/clients-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  SCHEDULED: "예정",
  DONE: "완료",
  MINUTES_DRAFT: "진행 중",
  FOLLOW_UP: "후속 조치",
  COMPLETED: "완료"
} as const;

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ clientId?: string; meetingId?: string }> }) {
  const params = await searchParams;
  const [clients, records] = await Promise.all([
    getClientsForList(),
    prisma.meeting.findMany({
      include: { client: true, _count: { select: { attendees: true } } },
      orderBy: { startedAt: "desc" },
      take: 200
    })
  ]);
  const meetings = records.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    type: meeting.meetingType,
    client: meeting.client?.name || "내부 회의",
    time: meeting.startedAt.toLocaleString("ko-KR"),
    attendees: `${meeting._count.attendees}명`,
    status: statusLabels[meeting.status],
    minutes: meeting.minutes ? "회의록 있음" : "회의록 없음"
  }));
  const selectedMeetingRecord = params.meetingId ? records.find((meeting) => meeting.id === params.meetingId) : null;
  const selectedMeeting: InitialMeeting | null = selectedMeetingRecord
    ? {
        id: selectedMeetingRecord.id,
        title: selectedMeetingRecord.title,
        meetingType: selectedMeetingRecord.meetingType,
        clientId: selectedMeetingRecord.clientId,
        location: selectedMeetingRecord.location,
        startedAt: selectedMeetingRecord.startedAt.toISOString(),
        agenda: selectedMeetingRecord.agenda,
        minutes: selectedMeetingRecord.minutes
      }
    : null;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeek = records.filter((meeting) => meeting.startedAt >= startOfWeek);
  const today = records.filter((meeting) => meeting.startedAt.toDateString() === now.toDateString());
  const meetingStats = [
    { label: "이번 주 회의", value: `${thisWeek.length}건`, hint: `거래처 ${thisWeek.filter((meeting) => meeting.clientId).length} / 내부 ${thisWeek.filter((meeting) => !meeting.clientId).length}` },
    { label: "회의록 작성", value: `${records.filter((meeting) => Boolean(meeting.minutes)).length}건`, hint: "전사 포함" },
    { label: "후속 조치", value: "0건", hint: "등록된 액션 기준" },
    { label: "오늘 회의", value: `${today.length}건`, hint: `예정 ${today.filter((meeting) => meeting.status === "SCHEDULED").length} / 완료 ${today.filter((meeting) => meeting.status !== "SCHEDULED").length}` }
  ];
  const meetingTimeline = today.slice(0, 5).map((meeting) => ({
    time: meeting.startedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    title: meeting.title,
    room: meeting.location || "장소 미정"
  }));
  const meetingSummaries = records.filter((meeting) => meeting.minutes).slice(0, 3).map((meeting) => ({
    label: meeting.title,
    value: (meeting.minutes ?? "").slice(0, 180)
  }));

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">회의 관리</h2>
        </div>
        <a href="#meeting-recorder" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <CalendarPlus className="h-4 w-4" />
          회의 등록
        </a>
      </section>

      <MeetingRecorder
        clients={clients.map((client) => ({ id: client.slug, name: client.name }))}
        selectedClientId={params.clientId}
        initialMeeting={selectedMeeting}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {meetingStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <FilterableMeetingsTable meetings={meetings} statusOptions={["전체", "예정", "진행 중", "후속 조치", "완료"]} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">오늘 회의</h3>
            </div>
            <div className="space-y-4">
              {meetingTimeline.length ? meetingTimeline.map((item) => (
                <div key={`${item.time}-${item.title}`} className="flex gap-3">
                  <div className="w-12 shrink-0 text-sm font-bold text-marine">{item.time}</div>
                  <div className="min-w-0 border-l border-line pl-3">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-steel">{item.room}</p>
                  </div>
                </div>
              )) : <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">오늘 등록된 회의가 없습니다.</p>}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">후속 조치</h3>
            </div>
            <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">등록된 후속 조치가 없습니다.</p>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">회의록 요약</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {meetingSummaries.length ? meetingSummaries.map((summary) => (
              <div key={summary.label} className="rounded-md bg-paper p-4">
                <p className="text-sm font-bold text-marine">{summary.label}</p>
                <p className="mt-3 text-sm leading-6 text-ink">{summary.value}</p>
              </div>
            )) : <p className="rounded-md bg-paper px-3 py-4 text-sm font-medium text-steel">전사된 회의록이 없습니다.</p>}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">참석자 현황</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">내부 참석</p>
              <p className="mt-1 text-xl font-bold text-ink">{records.reduce((sum, meeting) => sum + meeting._count.attendees, 0)}명</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">외부 참석</p>
              <p className="mt-1 text-xl font-bold text-ink">0명</p>
            </div>
            <div className="rounded-md bg-paper px-3 py-3">
              <p className="text-sm text-steel">회의록 첨부</p>
              <p className="mt-1 text-xl font-bold text-marine">{records.filter((meeting) => Boolean(meeting.minutes)).length}건</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
