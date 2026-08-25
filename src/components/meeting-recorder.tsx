"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Loader2, Mic, RefreshCw, Save, Square, Waves } from "lucide-react";

type RecorderStatus = "idle" | "saving" | "recording" | "transcribing" | "saved" | "error";
type ClientOption = { id: string; name: string };

export type InitialMeeting = {
  id: string;
  title: string;
  meetingType: string;
  clientId: string | null;
  location: string | null;
  startedAt: string;
  agenda: string | null;
  minutes: string | null;
};

function toDatetimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function LiveWaveform({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;

    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const context = canvas.getContext("2d");
    let frame = 0;

    void audioContext.resume();

    const draw = () => {
      frame = window.requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      if (!context) return;

      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#f4f9fc";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#d9e7ef";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();
      context.strokeStyle = "#0876a8";
      context.lineWidth = 3;
      context.beginPath();

      for (let index = 0; index < data.length; index += 1) {
        const x = (index / (data.length - 1)) * width;
        const y = (data[index] / 255) * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
    };

    draw();
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void audioContext.close();
    };
  }, [active, stream]);

  return (
    <div className="overflow-hidden rounded-md border border-line bg-paper p-2" aria-label="실시간 녹음 파형">
      <canvas ref={canvasRef} width={720} height={180} className="h-28 w-full sm:h-36" />
    </div>
  );
}

export function MeetingRecorder({
  clients = [],
  selectedClientId = "",
  initialMeeting
}: {
  clients?: ClientOption[];
  selectedClientId?: string;
  initialMeeting?: InitialMeeting | null;
}) {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string | null>(initialMeeting?.id ?? null);
  const [title, setTitle] = useState(initialMeeting?.title ?? "");
  const [meetingType, setMeetingType] = useState(initialMeeting?.meetingType ?? "내부 회의");
  const [clientId, setClientId] = useState(initialMeeting?.clientId ?? selectedClientId);
  const [location, setLocation] = useState(initialMeeting?.location ?? "");
  const [agenda, setAgenda] = useState(initialMeeting?.agenda ?? "");
  const [startedAt, setStartedAt] = useState(toDatetimeLocal(initialMeeting?.startedAt ?? new Date()));
  const [minutes, setMinutes] = useState(initialMeeting?.minutes ?? "");
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [message, setMessage] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingBlobRef = useRef<Blob | null>(null);
  const recordingStartedAtRef = useRef("");

  useEffect(() => {
    setMeetingId(initialMeeting?.id ?? null);
    setTitle(initialMeeting?.title ?? "");
    setMeetingType(initialMeeting?.meetingType ?? "내부 회의");
    setClientId(initialMeeting?.clientId ?? selectedClientId);
    setLocation(initialMeeting?.location ?? "");
    setAgenda(initialMeeting?.agenda ?? "");
    setStartedAt(toDatetimeLocal(initialMeeting?.startedAt ?? new Date()));
    setMinutes(initialMeeting?.minutes ?? "");
    setStatus("idle");
    setMessage("");
    pendingBlobRef.current = null;
  }, [initialMeeting?.id, selectedClientId]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function formPayload() {
    return {
      title: title.trim(),
      meetingType,
      clientId: clientId || null,
      location: location.trim() || null,
      startedAt: toIso(startedAt),
      agenda: agenda.trim() || null,
      minutes: minutes.trim() || null,
      status: "MINUTES_DRAFT"
    };
  }

  async function saveDraft() {
    if (!title.trim()) {
      setStatus("error");
      setMessage("회의 제목을 먼저 입력하세요.");
      return null;
    }

    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch(meetingId ? `/api/meetings/${meetingId}` : "/api/meetings", {
        method: meetingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload())
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? "회의록 저장에 실패했습니다.");
      setMeetingId(data.meeting.id);
      setStatus("saved");
      setMessage("회의록 초안을 저장했습니다. 이제 녹음을 시작할 수 있습니다.");
      router.refresh();
      return data.meeting.id as string;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "회의록 저장에 실패했습니다.");
      return null;
    }
  }

  async function uploadRecording(blob: Blob, targetMeetingId: string) {
    pendingBlobRef.current = blob;
    setStatus("transcribing");
    setMessage("녹음 파일을 서버로 전송하고 회의록으로 변환하는 중입니다. 잠시 기다려주세요.");
    const formData = new FormData();
    formData.append("file", blob, `meeting-${Date.now()}.webm`);
    formData.append("meetingId", targetMeetingId);
    formData.append("title", title);
    formData.append("meetingType", meetingType);
    formData.append("clientId", clientId);
    formData.append("location", location);
    formData.append("agenda", agenda);
    formData.append("startedAt", recordingStartedAtRef.current || toIso(startedAt));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 180_000);

    try {
      if (!navigator.onLine) throw new Error("현재 인터넷 연결이 끊겨 있습니다. 연결 후 재전송하세요.");
      const response = await fetch("/api/meetings/record", { method: "POST", body: formData, signal: controller.signal });
      const responseText = await response.text();
      let data: { message?: string; meeting?: { minutes?: string } } = {};
      try { data = responseText ? JSON.parse(responseText) as typeof data : {}; } catch { /* The proxy may return HTML on a network failure. */ }
      if (!response.ok) throw new Error(data.message ?? `서버가 녹음 파일을 처리하지 못했습니다. (${response.status})`);
      setMinutes(data.meeting?.minutes ?? minutes);
      pendingBlobRef.current = null;
      setStatus("saved");
      setMessage("녹음과 전사된 회의록이 저장되었습니다.");
      router.refresh();
    } catch (error) {
      const messageText = error instanceof DOMException && error.name === "AbortError"
        ? "서버 응답 시간이 초과되었습니다. 인터넷 상태를 확인한 뒤 녹음 파일을 재전송하세요."
        : error instanceof Error
          ? error.message
          : "네트워크 오류로 녹음 파일을 전송하지 못했습니다. 녹음 파일을 재전송하세요.";
      setStatus("error");
      setMessage(messageText);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function startRecording() {
    const targetMeetingId = await saveDraft();
    if (!targetMeetingId) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setMessage("이 브라우저에서는 마이크 녹음을 사용할 수 없습니다.");
      return;
    }

    try {
      const activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream);
      chunksRef.current = [];
      recordingStartedAtRef.current = new Date().toISOString();
      streamRef.current = activeStream;
      setStream(activeStream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
        mediaRecorderRef.current = null;
        if (blob.size > 0) void uploadRecording(blob, targetMeetingId);
        else {
          setStatus("error");
          setMessage("녹음된 음성이 없습니다.");
        }
      };
      recorder.start(1000);
      setStatus("recording");
      setMessage("녹음 중입니다. 파형을 확인하면서 회의를 진행하세요.");
    } catch {
      setStatus("error");
      setMessage("마이크 권한을 허용하지 않아 녹음을 시작할 수 없습니다.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }

  function newMeeting() {
    window.location.assign("/meetings#meeting-recorder");
  }

  const editing = Boolean(meetingId);
  const disabled = status === "saving" || status === "recording" || status === "transcribing";
  const inputClass = "mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-5" id="meeting-recorder">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FilePenLine className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">{editing ? "회의록 수정 및 녹음" : "회의록 생성 및 녹음"}</h3>
          </div>
          <p className="mt-1 text-sm text-steel">초안을 먼저 저장한 뒤 같은 회의록에서 녹음을 시작할 수 있습니다.</p>
        </div>
        {editing ? <button type="button" onClick={newMeeting} className="text-sm font-bold text-marine hover:underline">새 회의록</button> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-steel">회의 제목</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 주간 운영회의" disabled={disabled} /></label>
        <label className="block"><span className="text-xs font-medium text-steel">회의 유형</span><select className={inputClass} value={meetingType} onChange={(event) => setMeetingType(event.target.value)} disabled={disabled}><option>내부 회의</option><option>거래처 미팅</option><option>프로젝트 회의</option><option>기타</option></select></label>
        <label className="block"><span className="text-xs font-medium text-steel">연결 거래처</span><select className={inputClass} value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={disabled}><option value="">내부 회의</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label className="block"><span className="text-xs font-medium text-steel">장소 또는 화상회의</span><input className={inputClass} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="회의실 / 링크" disabled={disabled} /></label>
        <label className="block"><span className="text-xs font-medium text-steel">시작 시간</span><input type="datetime-local" className={inputClass} value={startedAt} onChange={(event) => setStartedAt(event.target.value)} disabled={disabled} /></label>
        <label className="block md:col-span-2"><span className="text-xs font-medium text-steel">안건</span><textarea className={`${inputClass} min-h-20`} value={agenda} onChange={(event) => setAgenda(event.target.value)} placeholder="이번 회의에서 다룰 내용" disabled={disabled} /></label>
        {minutes ? <label className="block md:col-span-2"><span className="text-xs font-medium text-steel">회의록 내용</span><textarea className={`${inputClass} min-h-40`} value={minutes} onChange={(event) => setMinutes(event.target.value)} disabled={disabled} /></label> : null}
      </div>

      {status === "recording" ? <div className="mt-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#b42318]"><Waves className="h-4 w-4" /> 실시간 녹음 파형</div><LiveWaveform stream={stream} active={status === "recording"} /></div> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void saveDraft()} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-steel hover:border-marine hover:text-marine disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> 회의록 저장</button>
        {status === "recording" ? <button type="button" onClick={stopRecording} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#b42318] px-4 py-2.5 text-sm font-bold text-white"><Square className="h-4 w-4" /> 녹음 중지 및 전사</button> : <button type="button" onClick={() => void startRecording()} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{status === "saving" || status === "transcribing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} 녹음 시작</button>}
        {pendingBlobRef.current ? <button type="button" onClick={() => meetingId && void uploadRecording(pendingBlobRef.current as Blob, meetingId)} disabled={status === "transcribing"} className="inline-flex items-center gap-2 rounded-md bg-[#e8f5fb] px-3 py-2.5 text-sm font-bold text-marine disabled:opacity-60"><RefreshCw className="h-4 w-4" /> 녹음 파일 재전송</button> : null}
        {status === "saving" ? <span className="text-sm text-steel">저장 중…</span> : null}
        {status === "transcribing" ? <span className="text-sm text-steel">전사 중…</span> : null}
        {message ? <p className={`basis-full text-sm ${status === "error" ? "text-[#b42318]" : "text-marine"}`}>{message}</p> : null}
      </div>
    </section>
  );
}
