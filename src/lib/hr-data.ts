export const hrStats = [
  { label: "재직 인원", value: "0명", hint: "등록된 직원 없음" },
  { label: "신규 입사", value: "0명", hint: "이번 달" },
  { label: "인사 면담", value: "0건", hint: "예정" },
  { label: "증명서 요청", value: "0건", hint: "처리 대기" }
];

export type EmployeeListItem = {
  name: string;
  department: string;
  role: string;
  joined: string;
  status: string;
  phone: string;
  email: string;
};

export const employees: EmployeeListItem[] = [];
export const hrInterviews: Array<{ date: string; employee: string; title: string; owner: string }> = [];
export const certificateRequests: Array<{ employee: string; type: string; status: string }> = [];
export const departmentSummary: Array<{ label: string; count: number }> = [];
