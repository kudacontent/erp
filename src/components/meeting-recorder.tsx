"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square } from "lucide-react";

type RecorderStatus = "idle" | "recording" | "transcribing" | "saved" | "error";

type ClientOption = { id: string; name: string };

export function MeetingRecorder({ clients = [], selectedClientId = "" }: { clients?: ClientOption[]; selectedClientId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("내부 회의");
  const [clientId, setClientId] = useState(selectedClientId);
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [message, setMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function uploadRecording(blob: Blob) {
    setStatus("transcribing");
    const formData = new FormData();
    formData.append("file", blob, `meeting-${Date.now()}.webm`);
    formData.append("title", title);
    formData.append("meetingType", meetingType);
    formData.append("clientId", clientId);
    formData.append("location", location);
    formData.append("agenda", agenda);
    formData.append("startedAt", new Date().toISOString());

    try {
      const response = await fetch("/api/meetings/record", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "회의 녹음 저장에 실패했습니다.");
        return;
      }

      setStatus("saved");
      setMessage("회의 녹음과 전사된 회의록이 저장되었습니다.");
      router.refresh();
      setTitle("");
      setLocation("");
      setAgenda("");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 회의 녹음 저장에 실패했습니다.");
    }
  }

  async function startRecording() {
    if (!title.trim()) {
      setStatus("error");
      setMessage("회의 제목을 먼저 입력하세요.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setMessage("이 브라우저에서는 마이크 녹음을 사용할 수 없습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferredType });

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        if (blob.size > 0) {
          void uploadRecording(blob);
        } else {
          setStatus("error");
          setMessage("녹음된 음성이 없습니다.");
        }
      };
      recorder.start(1000);
      setStatus("recording");
      setMessage("녹음 중입니다. 회의가 끝나면 녹음 중지 버튼을 누르세요.");
    } catch {
      setStatus("error");
      setMessage("마이크 권한을 허용하지 않아 녹음을 시작할 수 없습니다.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">회의 녹음 및 자동 회의록</h3>
          </div>
          <p className="mt-1 text-sm text-steel">마이크로 녹음한 내용을 전사해 회의록과 원본 파일을 함께 저장합니다.</p>
        </div>
        {status === "transcribing" ? <span className="text-sm font-medium text-marine">전사 중…</span> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-steel">회의 제목</span>
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 주간 운영회의" disabled={status === "recording" || status === "transcribing"} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-steel">회의 유형</span>
          <select className={inputClass} value={meetingType} onChange={(event) => setMeetingType(event.target.value)} disabled={status === "recording" || status === "transcribing"}>
            <option>내부 회의</option>
            <option>거래처 미팅</option>
            <option>프로젝트 회의</option>
            <option>기타</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-steel">연결 거래처</span>
          <select className={inputClass} value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={status === "recording" || status === "transcribing"}>
            <option value="">내부 회의</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-steel">장소 또는 화상회의</span>
          <input className={inputClass} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="회의실 / 링크" disabled={status === "recording" || status === "transcribing"} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-steel">안건</span>
          <input className={inputClass} value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder="이번 회의에서 다룰 내용" disabled={status === "recording" || status === "transcribing"} />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {status === "recording" ? (
          <button type="button" onClick={stopRecording} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#b42318] px-4 py-2.5 text-sm font-medium text-white">
            <Square className="h-4 w-4" />
            녹음 중지 및 전사
          </button>
        ) : (
          <button type="button" onClick={() => void startRecording()} disabled={status === "transcribing"} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {status === "transcribing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            녹음 시작
          </button>
        )}
        {message ? <p className={`text-sm ${status === "error" ? "text-[#b42318]" : "text-marine"}`}>{message}</p> : null}
      </div>
    </section>
  );
}
