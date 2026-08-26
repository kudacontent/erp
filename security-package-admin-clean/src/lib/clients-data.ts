export const clientStats = [
  { label: "전체 거래처", value: "42" },
  { label: "활성 계약처", value: "16" },
  { label: "명함 검수", value: "5" },
  { label: "이번 달 미팅", value: "12" }
];

export const clientTypes = ["전체", "선사", "발주처", "협력업체", "공급업체", "잠재고객"];

export const clients = [
  {
    slug: "hanjin-technical",
    name: "한진해운 기술팀",
    type: "선사",
    contact: "김도윤 팀장",
    phone: "010-4821-1190",
    email: "dy.kim@example.com",
    address: "부산광역시 중구 중앙대로 120",
    businessNumber: "602-81-12345",
    memo: "ROV 정기 검사와 긴급 점검 요청이 많은 핵심 거래처",
    contracts: 4,
    revenue: "4,820만원",
    lastMeeting: "2026-05-24",
    status: "활성"
  },
  {
    slug: "busan-shipbuilding-partner",
    name: "부산조선 협력사",
    type: "협력업체",
    contact: "박서연 매니저",
    phone: "010-3920-7714",
    email: "sy.park@example.com",
    address: "부산광역시 영도구 해양로 88",
    businessNumber: "617-86-20391",
    memo: "정비 일정 조율과 장비 반출입 확인 필요",
    contracts: 2,
    revenue: "1,860만원",
    lastMeeting: "2026-05-21",
    status: "검토"
  },
  {
    slug: "namhae-ocean-service",
    name: "남해오션서비스",
    type: "발주처",
    contact: "이준호 이사",
    phone: "010-7772-8841",
    email: "jh.lee@example.com",
    address: "경상남도 거제시 장승포로 31",
    businessNumber: "612-88-99120",
    memo: "정산 서류와 세금계산서 발행 일정 확인 필요",
    contracts: 3,
    revenue: "3,120만원",
    lastMeeting: "2026-05-19",
    status: "활성"
  },
  {
    slug: "bluetech-equipment",
    name: "블루텍 장비",
    type: "공급업체",
    contact: "최민아 과장",
    phone: "010-5510-2838",
    email: "ma.choi@example.com",
    address: "울산광역시 동구 방어진순환도로 540",
    businessNumber: "620-81-43820",
    memo: "ROV 부품과 소모품 견적 관리",
    contracts: 1,
    revenue: "620만원",
    lastMeeting: "2026-05-17",
    status: "활성"
  }
];

export function getClientBySlug(slug: string) {
  return clients.find((client) => client.slug === slug);
}

export const clientDetailActivities = [
  { date: "2026-05-27", title: "ROV 정산 회의 예정", type: "회의", owner: "경영지원" },
  { date: "2026-05-24", title: "5월 검사 프로젝트 회의록 작성", type: "회의록", owner: "김도윤" },
  { date: "2026-05-20", title: "세금계산서 발행 정보 확인", type: "정산", owner: "회계" },
  { date: "2026-05-18", title: "담당자 명함 OCR 저장", type: "명함", owner: "경영지원" }
];

export const clientContacts = [
  { name: "김도윤", role: "기술팀장", phone: "010-4821-1190", email: "dy.kim@example.com", primary: true },
  { name: "서민재", role: "운항지원", phone: "010-6652-0831", email: "mj.seo@example.com", primary: false },
  { name: "정하린", role: "정산담당", phone: "010-8823-1402", email: "hr.jung@example.com", primary: false }
];

export const clientContracts = [
  { title: "ROV 수중 검사 정산", status: "입금 대기", amount: "1,240만원", due: "2026-05-30" },
  { title: "선체 하부 점검", status: "정산 완료", amount: "1,680만원", due: "2026-05-12" },
  { title: "긴급 투입 기술지원", status: "발행 대기", amount: "840만원", due: "2026-06-03" }
];

export const ocrQueue = [
  { file: "business-card-0527-01.jpg", extracted: "오션테크 / 정현우 / 영업팀", status: "검수 필요" },
  { file: "business-card-0526-03.jpg", extracted: "해양엔지니어링 / 문가영 / 대표", status: "중복 확인" },
  { file: "business-card-0525-02.jpg", extracted: "선박정비K / 강민석 / 기술이사", status: "저장 가능" }
];

export const clientActivities = [
  { date: "05-27", title: "한진해운 기술팀 ROV 정산 회의 예정", type: "회의" },
  { date: "05-26", title: "남해오션서비스 세금계산서 발행 완료", type: "계약" },
  { date: "05-25", title: "블루텍 장비 견적서 첨부", type: "파일" },
  { date: "05-24", title: "부산조선 협력사 담당자 명함 등록", type: "명함" }
];
