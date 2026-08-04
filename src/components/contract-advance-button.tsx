"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ContractAdvanceButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleAdvance() {
    setStatus("saving");
    setMessage("");

    const response = await fetch(`/api/contracts/${slug}/advance`, {
      method: "POST"
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(data.message ?? "상태 변경에 실패했습니다.");
      return;
    }

    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleAdvance}
        disabled={status === "saving"}
        className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        상태 변경
      </button>
      {status === "error" ? <p className="text-xs font-medium text-[#075985]">{message}</p> : null}
    </div>
  );
}
