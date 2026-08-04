export const meetingStats = [
  { label: "이번 주 회의", value: "0건", hint: "거래처 0 / 내부 0" },
  { label: "회의록 작성", value: "0건", hint: "완료 기준" },
  { label: "후속 조치", value: "0건", hint: "진행 중 0" },
  { label: "오늘 회의", value: "0건", hint: "예정 0 / 완료 0" }
];

export type MeetingListItem = {
  id: string;
  title: string;
  type: string;
  client: string;
  time: string;
  attendees: string;
  status: string;
  minutes: string;
};

export const meetings: MeetingListItem[] = [];
export const meetingActions: Array<{ title: string; owner: string; due: string; status: string }> = [];
export const meetingTimeline: Array<{ time: string; title: string; room: string }> = [];
export const meetingSummaries: Array<{ label: string; value: string }> = [];
