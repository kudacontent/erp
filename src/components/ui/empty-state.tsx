type EmptyStateProps = {
  title: string;
  /** 왜 비어 있는지, 무엇을 하면 되는지 한 줄로 */
  description?: string;
  action?: React.ReactNode;
};

/**
 * 표나 목록이 비었을 때 보여주는 자리.
 * 빈 표가 그냥 헤더만 남으면 로딩 중인지 결과가 없는지 구분되지 않는다.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-steel">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
