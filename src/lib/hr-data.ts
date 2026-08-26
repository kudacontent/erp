export const hrStats = [
  { label: "재직 인원", value: "12명", hint: "정규 10 / 계약 2" },
  { label: "신규 입사", value: "1명", hint: "이번 달" },
  { label: "인사 면담", value: "3건", hint: "예정" },
  { label: "증명서 요청", value: "2건", hint: "처리 대기" }
];

export const employees = [
  {
    name: "김민준",
    department: "ROV 운영",
    role: "ROV 오퍼레이터",
    joined: "2024-03-11",
    status: "재직",
    phone: "010-3821-6401",
    email: "mj.kim@example.com"
  },
  {
    name: "이서연",
    department: "경영지원",
    role: "경영지원 매니저",
    joined: "2023-09-04",
    status: "재직",
    phone: "010-2941-8830",
    email: "sy.lee@example.com"
  },
  {
    name: "박준호",
    department: "기술",
    role: "장비 정비",
    joined: "2025-01-15",
    status: "재직",
    phone: "010-7720-1184",
    email: "jh.park@example.com"
  },
  {
    name: "최하린",
    department: "회계",
    role: "회계 담당",
    joined: "2025-07-01",
    status: "휴직",
    phone: "010-5155-2088",
    email: "hr.choi@example.com"
  }
];

export const hrInterviews = [
  { date: "05-29", employee: "김민준", title: "현장 투입 일정 조율", owner: "경영지원" },
  { date: "06-02", employee: "박준호", title: "장비 정비 교육 계획", owner: "기술팀" },
  { date: "06-05", employee: "이서연", title: "경영지원 업무 분장", owner: "대표" }
];

export const certificateRequests = [
  { employee: "김민준", type: "재직증명서", status: "처리 대기" },
  { employee: "이서연", type: "경력증명서", status: "검토" },
  { employee: "박준호", type: "교육이수 확인서", status: "발급 완료" }
];

export const departmentSummary = [
  { label: "ROV 운영", count: 5 },
  { label: "기술", count: 3 },
  { label: "경영지원", count: 2 },
  { label: "회계", count: 1 },
  { label: "대표", count: 1 }
];
