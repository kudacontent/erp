export const meetingStats = [
  { label: "이번 주 회의", value: "9건", hint: "거래처 5 / 내부 4" },
  { label: "회의록 작성", value: "6건", hint: "완료 기준" },
  { label: "후속 조치", value: "14건", hint: "진행 중 8" },
  { label: "오늘 회의", value: "3건", hint: "예정 2 / 완료 1" }
];

export const meetings = [
  {
    id: "MTG-2026-0527-01",
    title: "한진해운 ROV 정산 회의",
    type: "정산 회의",
    client: "한진해운 기술팀",
    time: "2026-05-27 09:30",
    attendees: "4명",
    status: "후속 조치",
    minutes: "작성 완료"
  },
  {
    id: "MTG-2026-0527-02",
    title: "선사 견적 검토",
    type: "거래처 미팅",
    client: "남해오션서비스",
    time: "2026-05-27 11:00",
    attendees: "3명",
    status: "예정",
    minutes: "미작성"
  },
  {
    id: "MTG-2026-0526-01",
    title: "장비 정비비 승인",
    type: "내부 회의",
    client: "블루텍 장비",
    time: "2026-05-26 14:00",
    attendees: "5명",
    status: "완료",
    minutes: "요약 완료"
  },
  {
    id: "MTG-2026-0524-01",
    title: "부산조선 협력 일정 조율",
    type: "프로젝트 회의",
    client: "부산조선 협력사",
    time: "2026-05-24 16:30",
    attendees: "6명",
    status: "진행 중",
    minutes: "작성 중"
  }
];

export const meetingActions = [
  { title: "정산 회의록 대표 확인", owner: "경영지원", due: "오늘", status: "대기" },
  { title: "견적서 수정본 전달", owner: "영업", due: "내일", status: "진행" },
  { title: "장비 정비비 지출 연결", owner: "회계", due: "금요일", status: "진행" },
  { title: "후속 미팅 일정 등록", owner: "경영지원", due: "금요일", status: "대기" }
];

export const meetingTimeline = [
  { time: "09:30", title: "한진해운 ROV 정산 회의", room: "회의실 A" },
  { time: "11:00", title: "선사 견적 검토", room: "온라인" },
  { time: "15:30", title: "운영 주간 점검", room: "회의실 B" }
];

export const meetingSummaries = [
  { label: "결정사항", value: "정산 금액 확정, 세금계산서 발행 일정 합의" },
  { label: "리스크", value: "입금 예정일 전 서류 확인 필요" },
  { label: "다음 조치", value: "견적서 수정본 발송 및 후속 일정 등록" }
];
