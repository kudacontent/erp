import {
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FileText,
  HandCoins,
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

export const heroStats = [
  { label: "등록 거래처", value: "0", sub: "신규 0", icon: ContactRound },
  { label: "진행 계약", value: "0", sub: "검토 0", icon: HandCoins },
  { label: "오늘 일정", value: "0", sub: "회의 0", icon: CalendarDays },
  { label: "검수 대기", value: "0", sub: "OCR 0", icon: ScanText },
  { label: "지출 승인", value: "0", sub: "증빙 0", icon: ReceiptText },
  { label: "보고 생성", value: "0", sub: "예정 없음", icon: FileText }
];

export const operationOverview = [
  { title: "거래처", primary: "0", primaryLabel: "등록 업체", secondary: "0", secondaryLabel: "신규 담당자" },
  { title: "계약/매출", primary: "0", primaryLabel: "진행 계약", secondary: "0", secondaryLabel: "발행 대기" },
  { title: "지출", primary: "0", primaryLabel: "이번 달 지출", secondary: "0", secondaryLabel: "승인 대기" },
  { title: "회의", primary: "0", primaryLabel: "이번 주 회의", secondary: "0", secondaryLabel: "후속 조치" },
  { title: "캘린더", primary: "0", primaryLabel: "오늘 일정", secondary: "0", secondaryLabel: "이번 주 일정" },
  { title: "인사", primary: "0", primaryLabel: "등록 직원", secondary: "0", secondaryLabel: "확인 필요" },
  { title: "보고", primary: "0", primaryLabel: "오늘 보고", secondary: "0", secondaryLabel: "검토 항목" },
  { title: "문서", primary: "0", primaryLabel: "첨부 문서", secondary: "0", secondaryLabel: "검수 대기" }
];

export const erpFlowGroups = [
  { title: "거래 시작", items: ["거래처", "명함 OCR", "담당자"] },
  { title: "계약 처리", items: ["견적서", "계약서", "지출결의서"] },
  { title: "운영 기록", items: ["회의", "캘린더", "첨부 문서"] },
  { title: "정산 마감", items: ["세금계산서", "입금 확인", "일일 보고"] }
];

export const dashboardTaskRows: Array<{
  group: string;
  task: string;
  owner: string;
  due: string;
  status: string;
}> = [];

export const dashboardSchedule: Array<{
  time: string;
  title: string;
  place: string;
  tone: string;
}> = [];

export const calendarDays: Array<{ day: string; muted: boolean; active?: boolean }> = [];

export const kpis = [
  { label: "이번 달 매출", value: "0원", hint: "계약 데이터 연결 후 자동 집계", icon: HandCoins },
  { label: "이번 달 지출", value: "0원", hint: "승인 완료 지출 기준", icon: ReceiptText },
  { label: "검수 대기 OCR", value: "0건", hint: "명함/영수증 분석 결과", icon: ScanText }
];

export const todaySections = [
  { title: "오늘 일정", value: "0건", description: "등록된 일정 없음", icon: CalendarDays },
  { title: "오늘 회의", value: "0건", description: "등록된 회의 없음", icon: UsersRound },
  { title: "진행 중 할 일", value: "0건", description: "등록된 후속 조치 없음", icon: ClipboardCheck }
];

export const reviewItems = [
  { label: "미입금 계약", value: "0건", tone: "border-l-[#075985]", icon: TriangleAlert },
  { label: "승인 대기 지출", value: "0건", tone: "border-l-[#0891b2]", icon: ReceiptText },
  { label: "OCR 검수 대기", value: "0건", tone: "border-l-[#0f172a]", icon: ScanText }
];
