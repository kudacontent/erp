"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Loader2, Mic, Pause, Play, RefreshCw, Save, Square, Waves } from "lucide-react";

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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function writeWavString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(chunks: Float32Array[], inputSampleRate: number) {
  const inputLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  if (!inputLength) return null;

  const input = new Float32Array(inputLength);
  let offset = 0;
  for (const chunk of chunks) {
    input.set(chunk, offset);
    offset += chunk.length;
  }

  const targetSampleRate = 16_000;
  const sampleRateRatio = inputSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / sampleRateRatio));
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  writeWavString(view, 0, "RIFF");
  view.setUint32(4, 36 + outputLength * 2, true);
  writeWavString(view, 8, "WAVE");
  writeWavString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeWavString(view, 36, "data");
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * sampleRateRatio;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const weight = sourcePosition - leftIndex;
    const sample = input[leftIndex] * (1 - weight) + input[rightIndex] * weight;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

type PcmCapture = {
  pause: () => void;
  resume: () => void;
  stop: () => Blob | null;
};

function createPcmCapture(stream: MediaStream): PcmCapture | null {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    const chunks: Float32Array[] = [];
    let paused = false;
    let stopped = false;
    silentGain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (!paused && !stopped) {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      }
    };
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);
    void audioContext.resume();

    return {
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
        void audioContext.resume();
      },
      stop: () => {
        if (stopped) return null;
        stopped = true;
        source.disconnect();
        processor.disconnect();
        silentGain.disconnect();
        const blob = encodeWav(chunks, audioContext.sampleRate);
        void audioContext.close();
        return blob;
      }
    };
  } catch {
    return null;
  }
}

function LiveWaveform({ stream, active, paused }: { stream: MediaStream | null; active: boolean; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const levelsRef = useRef<number[]>([]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;
    levelsRef.current = [];

    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const context = canvas.getContext("2d");
    let frame = 0;
    let lastSampleAt = 0;

    void audioContext.resume();

    const draw = () => {
      frame = window.requestAnimationFrame(draw);
      if (!context) return;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(canvas.clientWidth, 280);
      const height = Math.max(canvas.clientHeight, 96);
      const pixelWidth = Math.floor(width * devicePixelRatio);
      const pixelHeight = Math.floor(height * devicePixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fbfbfd";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#e5e7eb";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();

      const now = performance.now();
      if (!pausedRef.current && now - lastSampleAt >= 65) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const level = Math.min(1, Math.max(0.035, Math.sqrt(sum / data.length) * 7));
        levelsRef.current.push(level);
        lastSampleAt = now;
      }

      const barWidth = 3;
      const barGap = 2;
      const maxBars = Math.max(1, Math.floor((width - 16) / (barWidth + barGap)));
      const levels = levelsRef.current.slice(-maxBars);
      const startX = width - 8 - levels.length * (barWidth + barGap);
      for (let index = 0; index < levels.length; index += 1) {
        const barHeight = Math.max(8, levels[index] * (height - 22));
        const x = startX + index * (barWidth + barGap);
        const y = (height - barHeight) / 2;
        context.fillStyle = pausedRef.current ? "#cbd5e1" : "#ff3b30";
        if (typeof context.roundRect === "function") {
          context.beginPath();
          context.roundRect(x, y, barWidth, barHeight, 2);
          context.fill();
        } else {
          context.fillRect(x, y, barWidth, barHeight);
        }
      }

      context.fillStyle = pausedRef.current ? "#94a3b8" : "#ff3b30";
      context.beginPath();
      context.arc(width - 8, height / 2, 3, 0, Math.PI * 2);
      context.fill();
    };

    draw();
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void audioContext.close();
    };
  }, [active, stream]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#fbfbfd] px-3 py-2" aria-label="실시간 녹음 파형">
      <canvas ref={canvasRef} width={720} height={112} className="h-24 w-full" />
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCaptureRef = useRef<PcmCapture | null>(null);
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
    setElapsedSeconds(0);
    setIsPaused(false);
    pendingBlobRef.current = null;
  }, [initialMeeting?.id, selectedClientId]);

  useEffect(() => () => {
    audioCaptureRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (status !== "recording" || isPaused) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, status]);

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
    const fileExtension = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "mp4" : "webm";
    formData.append("file", blob, `meeting-${Date.now()}.${fileExtension}`);
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
      setElapsedSeconds(0);
      setIsPaused(false);
      recordingStartedAtRef.current = new Date().toISOString();
      streamRef.current = activeStream;
      setStream(activeStream);
      audioCaptureRef.current = createPcmCapture(activeStream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const originalBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const normalizedBlob = audioCaptureRef.current?.stop();
        audioCaptureRef.current = null;
        const blob = normalizedBlob?.size ? normalizedBlob : originalBlob;
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
        mediaRecorderRef.current = null;
        setIsPaused(false);
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
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording" || recorder?.state === "paused") recorder.stop();
  }

  function togglePause() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || status !== "recording") return;

    if (recorder.state === "recording") {
      recorder.pause();
      audioCaptureRef.current?.pause();
      setIsPaused(true);
      setMessage("녹음을 일시정지했습니다. 다시 누르면 이어서 녹음합니다.");
    } else if (recorder.state === "paused") {
      recorder.resume();
      audioCaptureRef.current?.resume();
      setIsPaused(false);
      setMessage("녹음을 계속합니다.");
    }
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

      {status === "recording" ? (
        <div className="mt-4 rounded-[28px] border border-[#e5e7eb] bg-[#fbfbfd] p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#ff3b30]">
              <span className={`h-2.5 w-2.5 rounded-full bg-[#ff3b30] ${isPaused ? "" : "animate-pulse"}`} />
              {isPaused ? "일시정지" : "녹음 중"}
            </div>
            <time className="font-mono text-3xl font-semibold tracking-tight text-ink" dateTime={`PT${elapsedSeconds}S`}>
              {formatDuration(elapsedSeconds)}
            </time>
          </div>
          <LiveWaveform stream={stream} active={status === "recording"} paused={isPaused} />
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={togglePause}
              aria-label={isPaused ? "녹음 계속하기" : "녹음 일시정지"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f1f5] text-ink shadow-sm transition hover:bg-[#e4e5ea]"
            >
              {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff3b30] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e02f26]"
            >
              <Square className="h-4 w-4 fill-current" /> 녹음 종료
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void saveDraft()} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-steel hover:border-marine hover:text-marine disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> 회의록 저장</button>
        {status !== "recording" ? <button type="button" onClick={() => void startRecording()} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{status === "saving" || status === "transcribing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} 녹음 시작</button> : <span className="inline-flex items-center gap-2 text-sm font-medium text-steel"><Waves className="h-4 w-4 text-[#ff3b30]" /> 음성 메모처럼 녹음 중입니다.</span>}
        {pendingBlobRef.current ? <button type="button" onClick={() => meetingId && void uploadRecording(pendingBlobRef.current as Blob, meetingId)} disabled={status === "transcribing"} className="inline-flex items-center gap-2 rounded-md bg-[#e8f5fb] px-3 py-2.5 text-sm font-bold text-marine disabled:opacity-60"><RefreshCw className="h-4 w-4" /> 녹음 파일 재전송</button> : null}
        {status === "saving" ? <span className="text-sm text-steel">저장 중…</span> : null}
        {status === "transcribing" ? <span className="text-sm text-steel">전사 중…</span> : null}
        {message ? <p className={`basis-full text-sm ${status === "error" ? "text-danger-fg" : "text-marine"}`}>{message}</p> : null}
      </div>
    </section>
  );
}
