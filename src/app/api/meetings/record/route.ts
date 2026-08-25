import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { GeminiApiError, generateTextFromMedia } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_INLINE_AUDIO_BYTES = 15 * 1024 * 1024;
const GEMINI_AUDIO_MIME_TYPES = new Set(["audio/wav", "audio/mp3", "audio/mpeg", "audio/aiff", "audio/aac", "audio/flac"]);

function cleanText(text: string) {
  return text
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function audioExtension(mimeType: string) {
  const baseType = mimeType.split(";")[0].toLowerCase();
  const extension = baseType.split("/")[1] ?? "webm";
  return ["webm", "ogg", "wav", "mpeg", "mp4", "mp3", "aac", "flac", "aiff", "m4a"].includes(extension) ? extension : "webm";
}

function normalizedAudioMimeType(mimeType: string) {
  const baseType = mimeType.split(";")[0].toLowerCase();
  return baseType === "audio/mpeg" ? "audio/mp3" : baseType;
}

async function prepareAudioForGemini(bytes: Buffer, mimeType: string) {
  const normalizedMimeType = normalizedAudioMimeType(mimeType);
  const isOggVorbis = normalizedMimeType === "audio/ogg" && !mimeType.toLowerCase().includes("opus");
  const isSupportedInlineAudio = GEMINI_AUDIO_MIME_TYPES.has(normalizedMimeType) || isOggVorbis;

  if (isSupportedInlineAudio && bytes.length <= MAX_INLINE_AUDIO_BYTES) {
    return { bytes, mimeType: normalizedMimeType };
  }

  const temporaryDirectory = path.join(tmpdir(), `kudalabs-meeting-${randomUUID()}`);
  const inputPath = path.join(temporaryDirectory, `input.${audioExtension(mimeType)}`);
  const outputPath = path.join(temporaryDirectory, "normalized.mp3");

  try {
    await mkdir(temporaryDirectory, { recursive: true });
    await writeFile(inputPath, bytes, { mode: 0o600 });
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "48k",
      outputPath
    ], { timeout: 120_000 });

    const normalizedBytes = await readFile(outputPath);
    if (!normalizedBytes.length) {
      throw new Error("ffmpeg returned an empty audio file");
    }

    return { bytes: normalizedBytes, mimeType: "audio/mp3" };
  } catch (error) {
    console.error("Meeting audio normalization failed", {
      mimeType,
      size: bytes.length,
      error: error instanceof Error ? error.message : "unknown error"
    });
    throw new GeminiApiError(
      "현재 브라우저 녹음 형식을 전사 가능한 MP3로 변환하지 못했습니다. 잠시 후 다시 녹음해 주세요.",
      415
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const POST = withAuth(async (request, _context, user) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "GEMINI_API_KEY가 설정되지 않았습니다. 회의 녹음 전사를 사용하려면 Google AI Studio API 키를 .env에 추가하세요." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const meetingId = typeof formData.get("meetingId") === "string" ? String(formData.get("meetingId")).trim() : "";
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
  const meetingType = typeof formData.get("meetingType") === "string" ? String(formData.get("meetingType")).trim() : "내부 회의";
  const clientId = typeof formData.get("clientId") === "string" ? String(formData.get("clientId")).trim() : "";
  const location = typeof formData.get("location") === "string" ? String(formData.get("location")).trim() : "";
  const agenda = typeof formData.get("agenda") === "string" ? String(formData.get("agenda")).trim() : "";
  const startedAtRaw = typeof formData.get("startedAt") === "string" ? String(formData.get("startedAt")) : "";
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : new Date();
  const existingMeeting = meetingId
    ? await prisma.meeting.findUnique({ where: { id: meetingId }, select: { id: true, title: true, meetingType: true, clientId: true, location: true, startedAt: true, agenda: true } })
    : null;

  if (meetingId && !existingMeeting) {
    return NextResponse.json({ ok: false, message: "녹음을 연결할 회의록을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!(file instanceof File) || !file.type.startsWith("audio/")) {
    return NextResponse.json({ ok: false, message: "회의 녹음 파일을 찾을 수 없습니다." }, { status: 400 });
  }

  const resolvedTitle = title || existingMeeting?.title || "";
  const resolvedMeetingType = meetingType || existingMeeting?.meetingType || "내부 회의";
  const resolvedClientId = clientId || existingMeeting?.clientId || "";
  const resolvedLocation = location || existingMeeting?.location || "";
  const resolvedAgenda = agenda || existingMeeting?.agenda || "";
  const resolvedStartedAt = startedAtRaw ? startedAt : existingMeeting?.startedAt || new Date();

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

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "회의 녹음 파일은 50MB 이하로 올려주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let preparedAudio: { bytes: Buffer; mimeType: string };
  try {
    preparedAudio = await prepareAudioForGemini(bytes, file.type);
  } catch (error) {
    if (error instanceof GeminiApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }

    console.error("Meeting audio preparation failed", error);
    return NextResponse.json({ ok: false, message: "회의 음성 파일을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 415 });
  }
  const prompt = `
이 음성 녹음을 한국어 회의록 초안으로 전사하세요.
들리지 않는 부분은 [불명확]으로 표시하고, 추측으로 내용을 만들지 마세요.
화자 구분이 가능하면 화자 1, 화자 2 형식으로 표시하세요.
인사말이나 설명 없이 전사 본문만 반환하세요.
`;

  let transcript: string;
  try {
    transcript = cleanText(await generateTextFromMedia({
      data: preparedAudio.bytes.toString("base64"),
      mimeType: preparedAudio.mimeType,
      prompt
    }));
  } catch (error) {
    if (error instanceof GeminiApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }

    console.error("Meeting transcription failed", error);
    return NextResponse.json({ ok: false, message: "회의 음성 전사 API 호출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  if (!transcript) {
    return NextResponse.json({ ok: false, message: "음성에서 전사할 내용을 찾지 못했습니다." }, { status: 502 });
  }

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
  const recordingDirectory = path.join(uploadRoot, "meetings");
  const fileName = `${randomUUID()}.${audioExtension(file.type)}`;
  await mkdir(recordingDirectory, { recursive: true });
  await writeFile(path.join(recordingDirectory, fileName), bytes, { mode: 0o600 });

  const meeting = await prisma.$transaction(async (transaction) => {
    const created = meetingId
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
            agenda: resolvedAgenda || null,
            minutes: transcript
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
            minutes: transcript,
            createdById: user.id
          }
        });

    await transaction.attachment.create({
      data: {
        entityType: "MEETING",
        entityId: created.id,
        fileName: file.name || fileName,
        fileUrl: `/api/uploads/meetings/${fileName}`,
        mimeType: file.type || "audio/webm",
        fileSize: BigInt(file.size),
        uploadedBy: user.id
      }
    });

    return created;
  });

  return NextResponse.json({
    ok: true,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      minutes: meeting.minutes,
      recordingUrl: `/api/uploads/meetings/${fileName}`
    }
  }, { status: 201 });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "HR"], write: true });
