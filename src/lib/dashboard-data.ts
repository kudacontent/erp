import {
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FileText,
  FilePlus2,
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
    metric: "명함에서 연결",
    description: "명함 정보를 확인한 뒤 거래처와 담당자를 한 번에 등록합니다."
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
    metric: "검수·승인",
    description: "영수증으로 지출을 만들고 검수·승인·지급 상태를 연결합니다."
  },
  {
    title: "견적서",
    href: "/documents/estimate",
    icon: FilePlus2,
    metric: "작성·PDF",
    description: "공급자 표와 항목별 VAT를 반영해 견적서를 발행합니다."
  },
  {
    title: "인보이스",
    href: "/documents/invoice",
    icon: FileText,
    metric: "작성·PDF",
    description: "KUDA LABS 인보이스 양식으로 청구 항목과 지급 정보를 관리합니다."
  },
  {
    title: "세금계산서",
    href: "/tax-invoices",
    icon: ReceiptText,
    metric: "발행 요청",
    description: "공급가액과 부가세를 검수한 뒤 발행 요청을 전송합니다."
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

