export const calendarStats = [
  { label: "이번 달 일정", value: "38건" },
  { label: "거래처 미팅", value: "12건" },
  { label: "정산 일정", value: "8건" },
  { label: "인사/내부", value: "6건" }
];

export const calendarDays = [
  { day: "1", muted: false, events: [] },
  { day: "2", muted: false, events: ["장비 점검"] },
  { day: "3", muted: false, events: [] },
  { day: "4", muted: false, events: ["정산 확인"] },
  { day: "5", muted: false, events: ["거래처 미팅"] },
  { day: "6", muted: false, events: [] },
  { day: "7", muted: false, events: ["지출 승인"] },
  { day: "8", muted: false, events: [] },
  { day: "9", muted: false, events: ["ROV 검사"] },
  { day: "10", muted: false, events: [] },
  { day: "11", muted: false, events: [] },
  { day: "12", muted: false, events: ["입금 예정"] },
  { day: "13", muted: false, events: [] },
  { day: "14", muted: false, events: ["회의록 확인"] },
  { day: "15", muted: false, events: [] },
  { day: "16", muted: false, events: ["정비 회의"] },
  { day: "17", muted: false, events: ["견적 전달"] },
  { day: "18", muted: false, events: [] },
  { day: "19", muted: false, events: ["선체 점검"] },
  { day: "20", muted: false, events: ["세금계산서"] },
  { day: "21", muted: false, events: ["협력사 회의"] },
  { day: "22", muted: false, events: [] },
  { day: "23", muted: false, events: ["출장"] },
  { day: "24", muted: false, events: ["정산 회의"] },
  { day: "25", muted: false, events: [] },
  { day: "26", muted: false, events: ["지출 검수"] },
  { day: "27", muted: false, today: true, events: ["ROV 정산", "견적 검토", "운영 점검"] },
  { day: "28", muted: false, events: ["입금 확인"] },
  { day: "29", muted: false, events: [] },
  { day: "30", muted: false, events: ["세금계산서"] },
  { day: "31", muted: false, events: [] }
];

export const todayEvents = [
  { time: "09:30", title: "한진해운 ROV 정산 회의", category: "정산", link: "회의" },
  { time: "11:00", title: "남해오션서비스 견적 검토", category: "거래처", link: "계약" },
  { time: "14:00", title: "장비 정비비 지출 승인", category: "지출", link: "지출" },
  { time: "17:30", title: "일일경영보고 생성", category: "보고", link: "보고" }
];

export const calendarCategories = [
  { label: "거래처", count: 12, color: "bg-marine" },
  { label: "정산", count: 8, color: "bg-[#1aa6c8]" },
  { label: "지출", count: 7, color: "bg-[#075985]" },
  { label: "내부", count: 6, color: "bg-[#0f172a]" },
  { label: "보고", count: 5, color: "bg-[#38bdf8]" }
];

export const upcomingEvents = [
  { date: "05-28", title: "한진해운 입금 확인", type: "정산" },
  { date: "05-30", title: "남해오션서비스 세금계산서", type: "정산" },
  { date: "06-03", title: "ROV 장비 임대 계약 검토", type: "계약" },
  { date: "06-05", title: "월간 운영 회의", type: "내부" }
];
