/**
 * 상태 문자열 → 시맨틱 색상(tone) 매핑을 한 곳으로 모은 파일.
 *
 * 이전에는 화면마다 statusClass() 가 따로 있었고(6곳), 규칙이 조금씩 달랐다.
 * 무엇보다 "완료"·"지연"·"대기"·"미확인" 이 전부 파란 계열이라
 * 색만 봐서는 정상인지 문제인지 구분할 수 없었다.
 *
 * 새 상태값이 생기면 이 파일만 고치면 전 화면에 반영된다.
 * 한글 라벨과 DB enum 값을 모두 받는다.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_TONES: Record<string, StatusTone> = {
  // ── 정상적으로 끝난 상태 ────────────────────────────────
  완료: "success",
  "승인 완료": "success",
  "입금 완료": "success",
  "발행 완료": "success",
  "지급 완료": "success",
  "발급 접수 완료": "success",
  "발급 완료": "success",
  "처리 완료": "success",
  승인: "success",
  재직: "success",
  활성: "success",
  정상: "success",
  성공: "success",
  ACTIVE: "success",
  APPROVED: "success",
  PAID: "success",
  DONE: "success",
  COMPLETED: "success",
  ISSUED: "success",

  // ── 지금 흘러가고 있는 상태 ──────────────────────────────
  진행: "info",
  "진행 중": "info",
  검토: "info",
  "검토 중": "info",
  예정: "info",
  "발급 처리 중": "info",
  SCHEDULED: "info",
  MINUTES_DRAFT: "info",
  ISSUING: "info",

  // ── 사람이 손을 대야 하는 상태 ───────────────────────────
  대기: "warning",
  "승인 대기": "warning",
  "발행 대기": "warning",
  "입금 대기": "warning",
  "처리 대기": "warning",
  "검토 필요": "warning",
  미확인: "warning",
  "후속 조치": "warning",
  휴직: "warning",
  보류: "warning",
  REQUESTED: "warning",
  FOLLOW_UP: "warning",

  // ── 문제가 생긴 상태 ────────────────────────────────────
  지연: "danger",
  연체: "danger",
  반려: "danger",
  거절: "danger",
  실패: "danger",
  "발급 실패": "danger",
  오류: "danger",
  REJECTED: "danger",
  FAILED: "danger",

  // ── 끝났거나 비어 있는 상태 ─────────────────────────────
  확인: "neutral",
  취소: "neutral",
  "발행 취소": "neutral",
  퇴사: "neutral",
  비활성: "neutral",
  보관: "neutral",
  초안: "neutral",
  "작성 중": "neutral",
  "임시 저장": "neutral",
  종료: "neutral",
  INACTIVE: "neutral",
  ARCHIVED: "neutral",
  DRAFT: "neutral",
  CANCELED: "neutral",

  // ── 견적 상태 ───────────────────────────────────────────
  // ("작성 중"·REJECTED 는 위에 이미 있다)
  발송: "info",
  "수주 확정": "success",
  실주: "danger",
  "기한 만료": "warning",
  "계약 전환": "success",
  SENT: "info",
  ACCEPTED: "success",
  EXPIRED: "warning",
  CONVERTED: "success"
};

/** 상태 문자열의 tone 을 돌려준다. 등록되지 않은 값은 neutral. */
export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) {
    return "neutral";
  }

  // "발행  대기" 처럼 공백이 여러 개인 경우까지 흡수한다
  const normalized = status.trim().replace(/\s+/g, " ");

  return STATUS_TONES[normalized] ?? "neutral";
}

/**
 * 위험도/중요도는 상태와 축이 다르므로 따로 둔다.
 * 일일 보고서의 리스크 항목에서 쓴다.
 */
const RISK_TONES: Record<string, StatusTone> = {
  높음: "danger",
  중간: "warning",
  보통: "warning",
  낮음: "neutral"
};

/** 위험도 문자열의 tone. 등록되지 않은 값은 neutral. */
export function getRiskTone(level: string | null | undefined): StatusTone {
  if (!level) {
    return "neutral";
  }

  return RISK_TONES[level.trim()] ?? "neutral";
}

/** tone → 뱃지용 Tailwind 클래스 */
export const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-bg text-success-fg ring-1 ring-inset ring-success-border",
  warning: "bg-warning-bg text-warning-fg ring-1 ring-inset ring-warning-border",
  danger: "bg-danger-bg text-danger-fg ring-1 ring-inset ring-danger-border",
  info: "bg-info-bg text-info-fg ring-1 ring-inset ring-info-border",
  neutral: "bg-neutral-bg text-neutral-fg ring-1 ring-inset ring-neutral-border"
};

/** tone → 점(dot) 색상. 색만으로 구분하지 않도록 뱃지 앞에 붙인다. */
export const TONE_DOT_CLASS: Record<StatusTone, string> = {
  success: "bg-success-fg",
  warning: "bg-warning-fg",
  danger: "bg-danger-fg",
  info: "bg-info-fg",
  neutral: "bg-neutral-fg"
};
