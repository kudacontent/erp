"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function ReportGenerateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports/daily/generate", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "보고서를 생성하지 못했습니다.");
      setMessage("오늘 보고서를 생성했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "보고서를 생성하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void generate()} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 보고서 생성</button>{message ? <span className="text-sm font-medium text-marine">{message}</span> : null}</div>;
}
