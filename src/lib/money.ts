/**
 * 금액 표시 규칙을 한 곳에 모은다.
 *
 * 이전에는 화면마다 포맷이 달랐다.
 *   계약  "250만원"      (DB 에 만원 단위로 저장)
 *   지출  "2,500,000원"  (DB 에 원 단위로 저장)
 * 같은 회사 안에서 단위가 두 가지라 합계를 낼 수도, 비교할 수도 없었다.
 *
 * 이제 DB 는 항상 원 단위로 저장하고, 표시도 항상 원으로 한다.
 */

/** 2500000 → "2,500,000원" */
export function formatWon(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0원";
  }

  const amount = typeof value === "bigint" ? Number(value) : Number(value);

  if (!Number.isFinite(amount)) {
    return "0원";
  }

  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

/** 단위 없이 숫자만. 표 안에서 '원'을 열 제목에 둔 경우에 쓴다 */
export function formatNumber(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const amount = typeof value === "bigint" ? Number(value) : Number(value);

  return Number.isFinite(amount) ? Math.round(amount).toLocaleString("ko-KR") : "0";
}

/** 사용자가 입력한 "2,500,000" 이나 "2500000" 을 숫자로 */
export function parseWon(input: string): number {
  const digits = input.replace(/[^0-9-]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
