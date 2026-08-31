import { getStatusTone, TONE_BADGE_CLASS, TONE_DOT_CLASS, type StatusTone } from "@/lib/status-tone";

type StatusBadgeProps = {
  /** 화면에 표시할 상태 문자열. 한글 라벨을 넘기는 것을 권장한다 */
  status: string;
  /** 자동 매핑을 무시하고 tone 을 직접 지정할 때 */
  tone?: StatusTone;
  /** sm: 표 안, md: 상세 화면 헤더 */
  size?: "sm" | "md";
  /** 색맹 사용자를 위해 색 앞에 점을 붙인다. 기본 true */
  withDot?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm"
} as const;

/**
 * 상태 뱃지. 앱 전체에서 상태 표시는 이 컴포넌트 하나만 쓴다.
 * 색상 규칙은 src/lib/status-tone.ts 에 있다.
 */
export function StatusBadge({
  status,
  tone,
  size = "sm",
  withDot = true,
  className = ""
}: StatusBadgeProps) {
  const resolved = tone ?? getStatusTone(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium ${SIZE_CLASS[size]} ${TONE_BADGE_CLASS[resolved]} ${className}`}
    >
      {withDot ? (
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT_CLASS[resolved]}`} />
      ) : null}
      {status}
    </span>
  );
}
