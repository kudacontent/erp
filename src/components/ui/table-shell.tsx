import { EmptyState } from "@/components/ui/empty-state";

type TableShellProps = {
  /** 스크린리더가 이 표가 무엇인지 알 수 있게 하는 설명 */
  caption: string;
  /** 행이 하나도 없을 때 표시할 내용 */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * 표를 감싸는 공통 껍데기.
 *
 *  - overflow-x-auto 를 항상 붙여 좁은 화면에서 표가 잘리지 않게 한다
 *    (기존에는 표마다 있기도 하고 없기도 해서 모바일에서 열이 잘렸다)
 *  - 빈 상태를 표 헤더만 남은 모습 대신 안내 문구로 보여준다
 *  - caption 으로 표의 목적을 스크린리더에 전달한다
 */
export function TableShell({
  caption,
  isEmpty = false,
  emptyTitle = "표시할 내용이 없습니다",
  emptyDescription,
  emptyAction,
  children
}: TableShellProps) {
  if (isEmpty) {
    return (
      <div className="rounded-md border border-line bg-surface">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
