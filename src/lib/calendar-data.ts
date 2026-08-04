export const calendarStats = [
  { label: "이번 달 일정", value: "0건" },
  { label: "거래처 미팅", value: "0건" },
  { label: "정산 일정", value: "0건" },
  { label: "인사/내부", value: "0건" }
];

export const calendarDays: Array<{
  day: string;
  muted: boolean;
  today?: boolean;
  events: string[];
}> = [];

export const todayEvents: Array<{
  time: string;
  title: string;
  category: string;
  link: string;
}> = [];

export const calendarCategories: Array<{
  label: string;
  count: number;
  color: string;
}> = [];

export const upcomingEvents: Array<{
  date: string;
  title: string;
  type: string;
}> = [];
