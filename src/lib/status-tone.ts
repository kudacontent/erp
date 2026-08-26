/**
 * 상태 문자열 → 시맨틱 색상(tone) 매핑을 한 곳으로 모은 파일.
 *
 * 이전에는 화면마다 statusClass() 가 따로 있었고(4곳), 규칙이 조금씩 달랐으며
 * 무엇보다 "지연", "미확인", "휴직", "완료" 가 전부 파란 계열로 칠해져서
 * 무엇이 정상이고 무엇이 문제인지 색으로 구분할 수 없었다.
 *
 * 새 상태값을 추가할 때는 이 파일만 고치면 전 화면에 반영된다.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_TONES: Record<string, StatusTone> = {
  // 정상적으로 끝난 상태
  완료: "success",
  "발행 완료": "success",
  "발급 완료": "success",
  "입금 완료": "success",
  "처리 완료": "success",
  "승인 완료": "success",
  승인: "success",
  재직: "success",
  활성: "success",
  ACTIVE: "success",
  정상: "success",
  성공: "success",

  // 지금 흘러가고 있는 상태
  진행: "info",
  "진행 중": "info",
  검토: "info",
  "검토 중": "info",
  예정: "info",

  // 사람이 손을 대야 하는 상태
  대기: "warning",
  "발행 대기": "warning",
  "입금 대기": "warning",
  "처리 대기": "warning",
  "승인 대기": "warning",
  미확인: "warning",
  휴직: "warning",
  보류: "warning",
  "후속 조치": "warning",

  // 문제가 생긴 상태
  지연: "danger",
  연체: "danger",
  반려: "danger",
  거절: "danger",
  취소: "danger",
  오류: "danger",
  실패: "danger",

  // 끝났거나 비어 있는 상태
  확인: "neutral",
  퇴사: "neutral",
  비활성: "neutral",
  INACTIVE: "neutral",
  초안: "neutral",
  종료: "neutral",
  보관: "neutral",
  ARCHIVED: "neutral"
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
