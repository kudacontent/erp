import {
  CalendarDays,
  ClipboardCheck,
  CircleDollarSign,
  ContactRound,
  FileText,
  HandCoins,
  MessageSquareText,
  ReceiptText,
  ScanText,
  TriangleAlert,
  UserRoundCog,
  UsersRound
} from "lucide-react";

export const modules = [
  {
    title: "거래처",
    href: "/clients",
    icon: ContactRound,
    metric: "명함 OCR 포함",
    description: "발주처, 선사, 협력업체와 담당자 명함을 한곳에서 관리합니다."
  },
  {
    title: "계약/매출",
    href: "/contracts",
    icon: HandCoins,
    metric: "정산 흐름",
    description: "계약금, 부가세, 세금계산서, 입금 상태를 연결합니다."
  },
  {
    title: "지출",
    href: "/expenses",
    icon: ReceiptText,
    metric: "영수증 OCR",
    description: "법인카드와 계좌이체 지출을 승인 흐름으로 관리합니다."
  },
  {
    title: "회의",
    href: "/meetings",
    icon: UsersRound,
    metric: "액션 아이템",
    description: "회의록, 참석자, 후속 업무와 관련 거래처를 연결합니다."
  },
  {
    title: "캘린더",
    href: "/calendar",
    icon: CalendarDays,
    metric: "Google 연동",
    description: "ERP 내부 일정 허브와 Google Calendar 동기화를 준비합니다."
  },
  {
    title: "인사",
    href: "/hr",
    icon: UserRoundCog,
    metric: "임직원 관리",
    description: "직원 정보, 재직 상태, 인사 면담과 증명서 발급 기준 데이터를 관리합니다."
  },
  {
    title: "일일경영보고",
    href: "/reports/daily",
    icon: FileText,
    metric: "Gemini 브리핑",
    description: "매출, 지출, 회의, 일정을 모아 대표용 브리핑을 생성합니다."
  }
];

export const kpis = [
  {
    label: "이번 달 매출",
    value: "0원",
    hint: "계약 데이터 연결 후 자동 집계",
    icon: CircleDollarSign
  },
  {
    label: "이번 달 지출",
    value: "0원",
    hint: "승인 완료 지출 기준",
    icon: ReceiptText
  },
  {
    label: "검수 대기 OCR",
    value: "0건",
    hint: "명함/영수증 분석 결과",
    icon: ScanText
  }
];

export const todaySections = [
  {
    title: "오늘 일정",
    value: "0건",
    description: "Google Calendar 연동 후 자동 집계",
    icon: CalendarDays
  },
  {
    title: "오늘 회의",
    value: "0건",
    description: "회의록과 액션 아이템 연결 예정",
    icon: MessageSquareText
  },
  {
    title: "진행 중 할 일",
    value: "0건",
    description: "회의 후속 조치 기준",
    icon: ClipboardCheck
  }
];

export const reviewItems = [
  {
    label: "미입금 계약",
    value: "0건",
    tone: "border-l-[#075985]",
    icon: TriangleAlert
  },
  {
    label: "승인 대기 지출",
    value: "0건",
    tone: "border-l-[#0891b2]",
    icon: ReceiptText
  },
  {
    label: "OCR 검수 대기",
    value: "0건",
    tone: "border-l-[#0f172a]",
    icon: ScanText
  }
];

export const cashflowTrend = [
  { label: "1월", revenue: 320, expense: 180, cash: 140 },
  { label: "2월", revenue: 420, expense: 220, cash: 200 },
  { label: "3월", revenue: 380, expense: 260, cash: 120 },
  { label: "4월", revenue: 520, expense: 300, cash: 220 },
  { label: "5월", revenue: 610, expense: 340, cash: 270 },
  { label: "6월", revenue: 560, expense: 360, cash: 200 }
];

export const revenueSources = [
  { label: "ROV 검사", value: 58, amount: "3,540만원" },
  { label: "장비 임대", value: 22, amount: "1,340만원" },
  { label: "기술 지원", value: 14, amount: "860만원" },
  { label: "기타", value: 6, amount: "370만원" }
];

export const expenseBreakdown = [
  { label: "장비/정비", value: 34, amount: "1,160만원" },
  { label: "인건비", value: 28, amount: "950만원" },
  { label: "여비교통", value: 18, amount: "610만원" },
  { label: "운영비", value: 20, amount: "680만원" }
];

export const pipelineItems = [
  { label: "계약 준비", count: 3, amount: "2,800만원" },
  { label: "발행 대기", count: 2, amount: "1,450만원" },
  { label: "입금 대기", count: 4, amount: "3,120만원" },
  { label: "정산 완료", count: 7, amount: "5,860만원" }
];

export const todayTimeline = [
  { time: "09:30", title: "주간 경영 미팅", tag: "경영회의" },
  { time: "11:00", title: "선사 견적 검토", tag: "거래처" },
  { time: "14:00", title: "장비 정비비 지출 승인", tag: "지출" },
  { time: "17:30", title: "일일경영보고 생성", tag: "AI 보고" }
];

export const receivables = [
  { client: "한진해운 기술팀", amount: "1,240만원", due: "D-3" },
  { client: "부산조선 협력사", amount: "860만원", due: "D+2" },
  { client: "남해오션서비스", amount: "1,020만원", due: "D-7" }
];

export const actionItems = [
  { title: "정산 회의록 확인", owner: "경영지원", due: "오늘" },
  { title: "영수증 OCR 검수", owner: "회계", due: "내일" },
  { title: "견적서 첨부 확인", owner: "영업", due: "금요일" }
];

export const erpSummaryCards = [
  {
    label: "활성 메뉴",
    value: "7개",
    hint: "거래처, 계약, 지출, 회의, 일정, 인사, 보고",
    icon: ClipboardCheck
  },
  {
    label: "오늘 처리",
    value: "14건",
    hint: "일정 4건, 문서 5건, 검수 3건, 알림 2건",
    icon: CalendarDays
  },
  {
    label: "검토 필요",
    value: "5건",
    hint: "계약, OCR, 지출 승인 항목",
    icon: TriangleAlert
  },
  {
    label: "자동화/OCR",
    value: "3개",
    hint: "명함, 영수증, 일일 보고",
    icon: ScanText
  }
];

export const menuStatusRows = [
  { menu: "거래처", scope: "업체 정보와 담당자", today: "명함 검수 2건", status: "진행", next: "신규 담당자 저장" },
  { menu: "계약/매출", scope: "계약, 견적서, 계산서", today: "발행 대기 2건", status: "확인", next: "계산서 발행 요청" },
  { menu: "지출", scope: "영수증, 지출결의서", today: "승인 대기 2건", status: "대기", next: "증빙 확인" },
  { menu: "회의", scope: "회의록과 후속 업무", today: "후속 조치 3건", status: "진행", next: "정산 회의록 확인" },
  { menu: "캘린더", scope: "현장 일정과 회의", today: "오늘 일정 4건", status: "정상", next: "내일 작업 배정" },
  { menu: "인사", scope: "직원 정보와 증명서", today: "변경 없음", status: "정상", next: "재직 상태 유지" },
  { menu: "일일경영보고", scope: "전체 요약과 리스크", today: "보고 생성 1건", status: "대기", next: "일일 보고 생성" }
];

export const erpFlowGroups = [
  {
    title: "거래 시작",
    items: ["거래처", "명함 OCR", "담당자"]
  },
  {
    title: "계약 처리",
    items: ["견적서", "계약서", "지출결의서"]
  },
  {
    title: "운영 기록",
    items: ["회의", "캘린더", "첨부 문서"]
  },
  {
    title: "정산 마감",
    items: ["세금계산서", "입금 확인", "일일 보고"]
  }
];

export const integrationSummary = [
  { name: "명함 OCR", module: "거래처", status: "연결", detail: "Gemini 이미지 분석" },
  { name: "영수증 OCR", module: "지출", status: "준비", detail: "증빙 자동 분류" },
  { name: "Google Calendar", module: "캘린더", status: "준비", detail: "현장 일정 동기화" },
  { name: "세금계산서 API", module: "계약/매출", status: "테스트", detail: "로컬 발행 테스트" },
  { name: "일일 보고", module: "보고", status: "준비", detail: "Gemini 브리핑" }
];

export const attentionQueue = [
  { item: "한진해운 기술팀 세금계산서", module: "계약/매출", owner: "회계", due: "오늘" },
  { item: "남해오션서비스 견적 검토", module: "계약/매출", owner: "영업", due: "내일" },
  { item: "영수증 OCR 검수", module: "지출", owner: "회계", due: "내일" },
  { item: "정산 회의록 확인", module: "회의", owner: "경영지원", due: "오늘" },
  { item: "현장 일정 확인", module: "캘린더", owner: "운영", due: "오늘" }
];

export const heroStats = [
  { label: "등록 거래처", value: "128", sub: "신규 4", icon: ContactRound },
  { label: "진행 계약", value: "14", sub: "검토 3", icon: HandCoins },
  { label: "오늘 일정", value: "4", sub: "회의 1", icon: CalendarDays },
  { label: "검수 대기", value: "3", sub: "OCR 2", icon: ScanText },
  { label: "지출 승인", value: "2", sub: "증빙 확인", icon: ReceiptText },
  { label: "보고 생성", value: "1", sub: "17:30 예정", icon: FileText }
];

export const operationOverview = [
  { title: "거래처", primary: "384", primaryLabel: "등록 업체", secondary: "24", secondaryLabel: "신규 담당자" },
  { title: "계약/매출", primary: "14", primaryLabel: "진행 계약", secondary: "2", secondaryLabel: "발행 대기" },
  { title: "지출", primary: "27", primaryLabel: "이번 달 지출", secondary: "2", secondaryLabel: "승인 대기" },
  { title: "회의", primary: "8", primaryLabel: "이번 주 회의", secondary: "12", secondaryLabel: "후속 조치" },
  { title: "캘린더", primary: "4", primaryLabel: "오늘 일정", secondary: "9", secondaryLabel: "이번 주 일정" },
  { title: "인사", primary: "12", primaryLabel: "등록 직원", secondary: "1", secondaryLabel: "확인 필요" },
  { title: "보고", primary: "1", primaryLabel: "오늘 보고", secondary: "3", secondaryLabel: "검토 항목" },
  { title: "문서", primary: "19", primaryLabel: "첨부 문서", secondary: "5", secondaryLabel: "검수 대기" }
];

export const calendarDays = [
  { day: "1", muted: false },
  { day: "2", muted: false },
  { day: "3", muted: false },
  { day: "4", muted: false },
  { day: "5", muted: false },
  { day: "6", muted: false },
  { day: "7", muted: false },
  { day: "8", muted: false },
  { day: "9", muted: false, active: true },
  { day: "10", muted: false },
  { day: "11", muted: false },
  { day: "12", muted: false },
  { day: "13", muted: false },
  { day: "14", muted: false },
  { day: "15", muted: false },
  { day: "16", muted: false },
  { day: "17", muted: false },
  { day: "18", muted: false },
  { day: "19", muted: false },
  { day: "20", muted: false },
  { day: "21", muted: false },
  { day: "22", muted: false },
  { day: "23", muted: false },
  { day: "24", muted: false },
  { day: "25", muted: false },
  { day: "26", muted: false },
  { day: "27", muted: false },
  { day: "28", muted: false },
  { day: "29", muted: false },
  { day: "30", muted: false }
];

export const dashboardSchedule = [
  { title: "ROV 정산 회의", time: "10:00", place: "회의실", tone: "bg-[#e8f5fb] text-marine" },
  { title: "명함 OCR 검수", time: "11:30", place: "거래처", tone: "bg-[#ecfeff] text-[#075985]" },
  { title: "지출결의서 확인", time: "14:00", place: "회계", tone: "bg-[#eef6fb] text-steel" },
  { title: "일일 보고 생성", time: "17:30", place: "보고", tone: "bg-[#e8f5fb] text-marine" }
];

export const dashboardTaskRows = [
  { group: "계약/매출", task: "한진해운 기술팀 세금계산서 발행 요청", owner: "회계", due: "오늘", status: "대기" },
  { group: "거래처", task: "명함 OCR 결과 검수 후 담당자 저장", owner: "영업", due: "오늘", status: "진행" },
  { group: "지출", task: "ROV 장비 정비비 지출결의서 증빙 확인", owner: "회계", due: "내일", status: "확인" },
  { group: "회의", task: "정산 회의록 결정사항 계약 상세 연결", owner: "경영지원", due: "내일", status: "진행" },
  { group: "캘린더", task: "남해오션서비스 현장 일정 재확인", owner: "운영", due: "금요일", status: "대기" }
];
