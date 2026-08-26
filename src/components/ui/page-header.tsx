type PageHeaderProps = {
  /** 화면 상단의 작은 영문 라벨 (예: "CONTRACTS") */
  eyebrow?: string;
  title: string;
  description?: string;
  /** 오른쪽에 놓을 버튼 등 */
  actions?: React.ReactNode;
};

/**
 * 모든 모듈 화면 상단에서 쓰는 공통 헤더.
 * 화면마다 마진과 글자 크기가 제각각이던 것을 하나로 맞춘다.
 */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-sm font-bold uppercase tracking-wide text-marine">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-sm text-steel">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
