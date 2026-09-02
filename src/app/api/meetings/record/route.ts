import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { deleteGeminiFile, GeminiApiError, generateTextFromFileUri, uploadFileToGemini, waitForGeminiFile } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { AudioConversionError, convertFileToMp3, looksLikeAudio } from "@/lib/meeting-audio";

export const runtime = "nodejs";
// 업로드를 통째로 메모리에 올리지 않고 흘려보내므로 시간만 넉넉히 두면 된다
export const maxDuration = 3600;

/**
 * 업로드 상한.
 *
 * 0 이면 상한 없음. 기본값도 0 이다 —
 * 파일을 메모리가 아니라 디스크로 바로 흘려보내기 때문에 크기가 커져도 메모리는 일정하다.
 * 실질적인 한계는 디스크 여유 공간과 업로드에 걸리는 시간이다.
 *
 * 그래도 값을 남겨 둔 이유: 실수로 수십 GB 짜리를 올려 볼륨을 채우는 일을 막고 싶을 때
 * MEETING_UPLOAD_MAX_MB 로 잠글 수 있게 하기 위해서다.
 */
const MAX_UPLOAD_BYTES = (() => {
  const configured = Number(process.env.MEETING_UPLOAD_MAX_MB ?? "0");
  return Number.isFinite(configured) && configured > 0 ? configured * 1024 * 1024 : 0;
})();

const TRANSCRIBE_PROMPT = `
이 음성 녹음을 한국어 회의록 초안으로 전사하세요.
들리지 않는 부분은 [불명확]으로 표시하고, 추측으로 내용을 만들지 마세요.
화자 구분이 가능하면 화자 1, 화자 2 형식으로 표시하세요.
인사말이나 설명 없이 전사 본문만 반환하세요.
`;

function cleanText(text: string) {
  return text.replace(/^```(?:text)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

/** 파일명에서 안전한 확장자만 뽑는다 (ffmpeg 이 형식을 추측하는 데 도움이 된다) */
function safeExtension(fileName: string, mimeType: string) {
  const fromName = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;

  const guess = mimeType.split(";")[0].toLowerCase().split("/")[1] ?? "webm";
  return /^[a-z0-9]{1,5}$/.test(guess) ? guess : "webm";
}

export const POST = withAuth(async (request, _context, user) => {
  const url = new URL(request.url);
  const query = (name: string) => (url.searchParams.get(name) ?? "").trim();

  const meetingId = query("meetingId");
  const title = query("title");
  const meetingType = query("meetingType") || "내부 회의";
  const clientId = query("clientId");
  const location = query("location");
  const agenda = query("agenda");
  const startedAtRaw = query("startedAt");
  const skipTranscription = query("skipTranscription") === "true";
  const originalName = query("fileName") || `meeting-${Date.now()}.webm`;
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!looksLikeAudio(contentType, originalName)) {
    return NextResponse.json(
      { ok: false, message: "오디오 파일만 올릴 수 있습니다. (mp3, m4a, wav, webm 등)" },
      { status: 400 }
    );
  }

  // 서버가 파일을 다 받기 전에 거를 수 있으면 그렇게 한다
  const declaredSize = Number(request.headers.get("content-length") ?? "0");

  if (MAX_UPLOAD_BYTES > 0 && declaredSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, message: `녹음 파일은 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 이하로 올려주세요.` },
      { status: 413 }
    );
  }

  if (!request.body) {
    return NextResponse.json({ ok: false, message: "회의 녹음 파일을 찾을 수 없습니다." }, { status: 400 });
  }

  const existingMeeting = meetingId
    ? await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: { id: true, title: true, meetingType: true, clientId: true, location: true, startedAt: true, agenda: true, minutes: true }
      })
    : null;

  if (meetingId && !existingMeeting) {
    return NextResponse.json({ ok: false, message: "녹음을 연결할 회의록을 찾을 수 없습니다." }, { status: 404 });
  }

  const resolvedTitle = title || existingMeeting?.title || "";
  const resolvedMeetingType = meetingType || existingMeeting?.meetingType || "내부 회의";
  const resolvedClientId = clientId || existingMeeting?.clientId || "";
  const resolvedLocation = location || existingMeeting?.location || "";
  const resolvedAgenda = agenda || existingMeeting?.agenda || "";
  const resolvedStartedAt = startedAtRaw ? new Date(startedAtRaw) : existingMeeting?.startedAt || new Date();

  if (!resolvedTitle) {
    return NextResponse.json({ ok: false, message: "회의 제목을 입력하세요." }, { status: 400 });
  }

  if (Number.isNaN(resolvedStartedAt.getTime())) {
    return NextResponse.json({ ok: false, message: "회의 시작 시간이 올바르지 않습니다." }, { status: 400 });
  }

  if (resolvedClientId) {
    const client = await prisma.client.findUnique({ where: { id: resolvedClientId }, select: { id: true } });

    if (!client) {
      return NextResponse.json({ ok: false, message: "연결할 거래처를 찾을 수 없습니다." }, { status: 400 });
    }
  }

  const workDirectory = path.join(tmpdir(), `kudalabs-meeting-${randomUUID()}`);
  const originalPath = path.join(workDirectory, `original.${safeExtension(originalName, contentType)}`);
  const archivePath = path.join(workDirectory, "archive.mp3");

  try {
    await mkdir(workDirectory, { recursive: true });

    // ── 1) 업로드를 디스크로 바로 흘려보낸다 ─────────────────────
    // 메모리에 담지 않으므로 파일이 커져도 사용량이 늘지 않는다.
    await pipeline(Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(originalPath, { mode: 0o600 }));

    const received = await stat(originalPath);

    if (!received.size) {
      return NextResponse.json({ ok: false, message: "빈 파일입니다." }, { status: 400 });
    }

    if (MAX_UPLOAD_BYTES > 0 && received.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: `녹음 파일은 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB 이하로 올려주세요.` },
        { status: 413 }
      );
    }

    // ── 2) MP3 로 변환 ─────────────────────────────────────────
    let archiveSize: number;

    try {
      archiveSize = await convertFileToMp3(originalPath, archivePath, "archive");
    } catch (error) {
      const message = error instanceof AudioConversionError ? error.message : "오디오 파일을 처리하지 못했습니다.";
      return NextResponse.json({ ok: false, message }, { status: 415 });
    }

    // ── 3) 보관 위치로 옮긴다 ──────────────────────────────────
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
    const recordingDirectory = path.join(uploadRoot, "meetings");
    const storedName = `${randomUUID()}.mp3`;
    const storedPath = path.join(recordingDirectory, storedName);

    await mkdir(recordingDirectory, { recursive: true });

    try {
      await rename(archivePath, storedPath);
    } catch {
      // /tmp 와 uploads 가 다른 파일시스템이면 rename 이 안 된다. 그때는 복사한다.
      await pipeline(Readable.from((await import("node:fs")).createReadStream(archivePath)), createWriteStream(storedPath, { mode: 0o600 }));
    }

    const recordingUrl = `/api/uploads/meetings/${storedName}`;

    // ── 4) 회의록과 첨부를 먼저 만든다 ─────────────────────────
    //
    // 전사보다 먼저 저장하는 이유: 예전에는 전사가 실패하면 그 자리에서 응답을 돌려보내
    // 방금 올린 녹음까지 통째로 사라졌다. 한 시간짜리 회의를 다시 녹음할 수는 없다.
    const meeting = await prisma.$transaction(async (transaction) => {
      const saved = meetingId
        ? await transaction.meeting.update({
            where: { id: meetingId },
            data: {
              title: resolvedTitle,
              meetingType: resolvedMeetingType,
              status: "DONE",
              clientId: resolvedClientId || null,
              location: resolvedLocation || null,
              startedAt: resolvedStartedAt,
              endedAt: new Date(),
              agenda: resolvedAgenda || null
            }
          })
        : await transaction.meeting.create({
            data: {
              title: resolvedTitle,
              meetingType: resolvedMeetingType,
              status: "DONE",
              clientId: resolvedClientId || null,
              location: resolvedLocation || null,
              startedAt: resolvedStartedAt,
              endedAt: new Date(),
              agenda: resolvedAgenda || null,
              createdById: user.id
            }
          });

      await transaction.attachment.create({
        data: {
          entityType: "MEETING",
          entityId: saved.id,
          fileName: `${originalName.replace(/\.[^.]+$/, "")}.mp3`,
          fileUrl: recordingUrl,
          mimeType: "audio/mpeg",
          fileSize: BigInt(archiveSize),
          uploadedBy: user.id
        }
      });

      return saved;
    });

    const savedResponse = (message: string) =>
      NextResponse.json(
        {
          ok: true,
          transcribed: false,
          meeting: { id: meeting.id, title: meeting.title, minutes: meeting.minutes, recordingUrl },
          message
        },
        { status: 201 }
      );

    if (skipTranscription) {
      return savedResponse("녹음을 MP3로 보관했습니다. 전사는 건너뛰었습니다.");
    }

    if (!process.env.GEMINI_API_KEY) {
      return savedResponse("녹음은 MP3로 보관했습니다. GEMINI_API_KEY가 없어 자동 전사는 하지 못했습니다.");
    }

    // ── 5) 전사 ────────────────────────────────────────────────
    //
    // 여기서부터 실패해도 ok:true 로 돌려준다. 녹음은 이미 저장됐다.
    let uploadedName: string | null = null;

    try {
      // 보관본 MP3 를 그대로 올린다.
      // 예전에는 요청 본문에 base64 로 실어 보내느라 15MB 안에 욱여넣어야 했고,
      // 그래서 한 시간 넘는 회의는 전사 자체가 불가능했다.
      // Files API 는 파일당 2GB, 오디오 9.5시간까지 받는다.
      const uploaded = await uploadFileToGemini({
        filePath: storedPath,
        mimeType: "audio/mp3",
        sizeBytes: archiveSize,
        displayName: meeting.title
      });

      uploadedName = uploaded.name;
      await waitForGeminiFile(uploaded.name);

      const transcript = cleanText(
        await generateTextFromFileUri({
          fileUri: uploaded.uri,
          mimeType: "audio/mp3",
          prompt: TRANSCRIBE_PROMPT
        })
      );

      if (!transcript) {
        throw new GeminiApiError("음성에서 전사할 내용을 찾지 못했습니다.", 502);
      }

      const updated = await prisma.meeting.update({
        where: { id: meeting.id },
        data: { minutes: transcript },
        select: { id: true, title: true, minutes: true }
      });

      return NextResponse.json({ ok: true, transcribed: true, meeting: { ...updated, recordingUrl } }, { status: 201 });
    } catch (error) {
      const reason =
        error instanceof AudioConversionError || error instanceof GeminiApiError
          ? error.message
          : "전사 중 오류가 발생했습니다.";

      console.error("Meeting transcription failed (recording was saved)", error);

      return savedResponse(`녹음은 MP3로 안전하게 보관했습니다. 다만 자동 전사에는 실패했습니다 — ${reason}`);
    } finally {
      // 구글 쪽 임시 파일은 48시간 뒤 자동 삭제되지만, 끝났으면 바로 치운다
      if (uploadedName) await deleteGeminiFile(uploadedName);
    }
  } finally {
    await rm(workDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "HR"], write: true });
