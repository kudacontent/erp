"use client";

import { useId } from "react";

/** 입력 요소에 그대로 펼쳐 넣을 속성들 */
export type FieldInputProps = {
  id: string;
  className: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  required?: true;
};

type FieldProps = {
  label: string;
  /** 필수 항목이면 라벨에 표시하고 required 속성을 넘긴다 */
  required?: boolean;
  /** 서버/클라이언트 검증 오류 메시지 */
  error?: string;
  /** 오류가 아닌 보조 설명 (예: "'-' 없이 숫자만") */
  hint?: string;
  /** 라벨을 시각적으로 숨긴다. 좁은 영역에서 쓰되 스크린리더에는 그대로 읽힌다 */
  hideLabel?: boolean;
  className?: string;
  children: (props: FieldInputProps) => React.ReactNode;
};

/** input / select / textarea 공통 스타일 */
export const fieldInputClass =
  "mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-marine";

/** 오류 상태의 입력 스타일 */
export const fieldInputErrorClass =
  "mt-2 w-full rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-danger-fg";

/**
 * 라벨 + 입력 + 오류 메시지를 하나로 묶는다.
 *
 * 폼을 직접 짤 때 반복해서 빠뜨리던 것들을 여기서 강제한다.
 *  - 오류 메시지가 danger 색으로 나온다 (이전에는 화면마다 파랑·하늘색이 섞여 있었다)
 *  - 라벨과 입력이 htmlFor/id 로 연결된다
 *  - 오류 시 aria-invalid 와 aria-describedby 가 붙어 스크린리더가 읽는다
 *  - 필수 항목에 required 속성과 시각적 표시가 함께 붙는다
 *
 * 사용 예:
 *   <Field label="거래처명" required error={errors.name?.[0]}>
 *     {(props) => <input {...props} value={form.name} onChange={...} />}
 *   </Field>
 */
export function Field({
  label,
  required,
  error,
  hint,
  hideLabel = false,
  className = "",
  children
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  const inputProps: FieldInputProps = {
    id,
    className: error ? fieldInputErrorClass : fieldInputClass,
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(required ? { required: true as const } : {})
  };

  return (
    <div className={`block ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-steel"}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-danger-fg">
              *
            </span>
            <span className="sr-only">(필수)</span>
          </>
        ) : null}
      </label>

      {children(inputProps)}

      {hint && !error ? (
        <p id={hintId} className="mt-1 text-xs text-steel">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
