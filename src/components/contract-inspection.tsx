"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

type InspectionStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "ON_HOLD";

const STATUS_LABEL: Record<InspectionStatus, string> = {
  NOT_STARTED: "검사 전",
  IN_PROGRESS: "검사 중",
  DONE: "검사 완료",
  ON_HOLD: "보류"
};

const OPTIONS: InspectionStatus[] = ["NOT_STARTED", "IN_PROGRESS", "DONE", "ON_HOLD"];

export type InspectionState = {
  status: string;
  startedAt: string | null;
  doneAt: string | null;
  inspector: string | null;
  memo: string | null;
};

/**
 * 검사 작업 진행 상황.
 *
 * 검사는 우리가 거래처에 제공하는 용역 자체다. 일정을 잡고 현장에 나가 수행한다.
 * 이 작업이 끝나야 청구(인보이스)로 넘어가므로, 언제 나갔고 언제 끝났는지가 청구의 근거가 된다.
 */
type Report = {
  id: string;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
  uploadedAt: string;
};

function sizeLabel(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export function ContractInspection({
  slug,
  inspection,
  canEdit
}: {
  slug: string;
  inspection: InspectionState;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<InspectionStatus>((inspection.status as InspectionStatus) ?? "NOT_STARTED");
  const [memo, setMemo] = useState(inspection.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch(`/api/contracts/${slug}/inspection/report`)
      .then((response) => response.json())
      .then((data: { ok: boolean; reports?: Report[] }) => {
        if (alive && data.ok && data.reports) setReports(data.reports);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [slug]);

  async function uploadReport(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;

    setUploading(true);
    setError("");

    try {
      const body = new FormData();
      body.append("file", picked);

      const response = await fetch(`/api/contracts/${slug}/inspection/report`, { method: "POST", body });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "보고서를 첨부하지 못했습니다.");
        return;
      }

      setReports((current) => [data.report, ...current]);
    } catch {
      setError("첨부 중 문제가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function removeReport(id: string) {
    const response = await fetch(`/api/contracts/${slug}/inspection/report?reportId=${id}`, { method: "DELETE" });

    if (response.ok) {
      setReports((current) => current.filter((report) => report.id !== id));
    }
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/contracts/${slug}/inspection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionStatus: status, inspectionMemo: memo.trim() || null })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했습니다.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const currentLabel = STATUS_LABEL[(inspection.status as InspectionStatus) ?? "NOT_STARTED"];

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-marine" />
          <h3 className="font-bold text-ink">검사 작업</h3>
          <StatusBadge status={currentLabel} />
        </div>

        {canEdit && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-marine"
          >
            진행 상황 기록
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={status === option}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  status === option ? "border-marine bg-marine text-white" : "border-line bg-paper text-steel"
                }`}
              >
                {STATUS_LABEL[option]}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-medium text-steel">검사 메모</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="현장에서 확인한 내용이나 특이사항. 보류라면 무엇 때문에 멈췄는지 적어두면 재개할 때 도움이 됩니다."
              className="mt-2 min-h-20 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              disabled={saving}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-steel"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-paper p-3">
            <p className="text-xs text-steel">착수일</p>
            <p className="mt-1 text-sm font-medium text-ink">{inspection.startedAt ?? "-"}</p>
          </div>
          <div className="rounded-md bg-paper p-3">
            <p className="text-xs text-steel">완료일</p>
            <p className="mt-1 text-sm font-medium text-ink">{inspection.doneAt ?? "-"}</p>
          </div>
          <div className="rounded-md bg-paper p-3">
            <p className="text-xs text-steel">담당자</p>
            <p className="mt-1 text-sm font-medium text-ink">{inspection.inspector ?? "-"}</p>
          </div>
          <div className="rounded-md bg-paper p-3">
            <p className="text-xs text-steel">특이사항</p>
            <p className="mt-1 text-sm text-ink">{inspection.memo || "-"}</p>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-ink">검사 보고서</h4>
            <p className="mt-0.5 text-xs text-steel">
              surveyreport 에서 만들어 거래처로 보낸 PDF를 여기 붙여두면, 청구 근거가 계약에 함께 남습니다.
            </p>
          </div>

          {canEdit ? (
            <label className={`inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-marine ${uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              PDF 첨부
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void uploadReport(event)} disabled={uploading} />
            </label>
          ) : null}
        </div>

        {reports.length === 0 ? (
          <p className="rounded-md bg-paper px-3 py-3 text-sm text-steel">첨부된 보고서가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id} className="flex items-center gap-3 rounded-md bg-paper px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-marine" />
                <a href={report.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-marine">
                  {report.fileName}
                </a>
                <span className="shrink-0 text-xs text-steel">
                  {report.uploadedAt} · {sizeLabel(report.sizeBytes)}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void removeReport(report.id)}
                    aria-label={`${report.fileName} 첨부 떼기`}
                    className="shrink-0 rounded-md p-1.5 text-steel hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
