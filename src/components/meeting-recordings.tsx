import Link from "next/link";
import { AudioLines, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export type MeetingRecording = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  fileName: string;
  fileUrl: string;
  sizeLabel: string;
  recordedAt: string;
};

/**
 * 보관된 회의 녹음 목록.
 *
 * 녹음을 저장만 하고 다시 들을 방법이 없으면 보관하는 의미가 없다.
 * 브라우저 기본 오디오 플레이어를 그대로 쓴다 —
 * 업로드 라우트가 구간 요청(Range)을 받아 주므로 중간으로 건너뛰는 것도 된다.
 */
export function MeetingRecordings({ recordings }: { recordings: MeetingRecording[] }) {
  return (
    <section className="mb-6 rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <AudioLines className="h-5 w-5 text-marine" />
        <h3 className="font-bold text-ink">보관된 녹음</h3>
        <span className="text-sm text-steel">{recordings.length}건 · MP3</span>
      </div>

      {recordings.length === 0 ? (
        <EmptyState
          title="보관된 녹음이 없습니다."
          description="회의록에서 직접 녹음하거나 가지고 있는 녹음 파일을 올리면 여기에 MP3로 쌓입니다."
        />
      ) : (
        <ul className="space-y-3">
          {recordings.map((recording) => (
            <li key={recording.id} className="rounded-md border border-line bg-paper p-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/meetings?meetingId=${recording.meetingId}#meeting-recorder`}
                  className="min-w-0 truncate text-sm font-medium text-marine"
                >
                  {recording.meetingTitle}
                </Link>
                <span className="shrink-0 text-xs text-steel">
                  {recording.recordedAt} · {recording.sizeLabel}
                </span>
              </div>

              <audio controls preload="none" src={recording.fileUrl} className="w-full">
                이 브라우저는 오디오 재생을 지원하지 않습니다.
              </audio>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-steel">{recording.fileName}</p>
                <a
                  href={recording.fileUrl}
                  download={recording.fileName}
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-marine"
                >
                  <Download className="h-3.5 w-3.5" />
                  내려받기
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
