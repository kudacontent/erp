import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function cleanText(text: string) {
  return text
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractText(response: unknown) {
  const data = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function audioExtension(mimeType: string) {
  const baseType = mimeType.split(";")[0].toLowerCase();
  const extension = baseType.split("/")[1] ?? "webm";
  return ["webm", "ogg", "wav", "mpeg", "mp4", "mp3"].includes(extension) ? extension : "webm";
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
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
  const meetingType = typeof formData.get("meetingType") === "string" ? String(formData.get("meetingType")).trim() : "내부 회의";
  const location = typeof formData.get("location") === "string" ? String(formData.get("location")).trim() : "";
  const agenda = typeof formData.get("agenda") === "string" ? String(formData.get("agenda")).trim() : "";
  const startedAtRaw = typeof formData.get("startedAt") === "string" ? String(formData.get("startedAt")) : "";
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : new Date();

  if (!(file instanceof File) || !file.type.startsWith("audio/")) {
    return NextResponse.json({ ok: false, message: "회의 녹음 파일을 찾을 수 없습니다." }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ ok: false, message: "회의 제목을 입력하세요." }, { status: 400 });
  }

  if (Number.isNaN(startedAt.getTime())) {
    return NextResponse.json({ ok: false, message: "회의 시작 시간이 올바르지 않습니다." }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "회의 녹음 파일은 50MB 이하로 올려주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = `
이 음성 녹음을 한국어 회의록 초안으로 전사하세요.
들리지 않는 부분은 [불명확]으로 표시하고, 추측으로 내용을 만들지 마세요.
화자 구분이 가능하면 화자 1, 화자 2 형식으로 표시하세요.
인사말이나 설명 없이 전사 본문만 반환하세요.
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: file.type.split(";")[0],
                data: bytes.toString("base64")
              }
            },
            { text: prompt }
          ]
        }
      ],
      generationConfig: { temperature: 0.1 }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ ok: false, message: "회의 음성 전사 API 호출에 실패했습니다.", details }, { status: response.status });
  }

  const transcript = cleanText(extractText(await response.json()));

  if (!transcript) {
    return NextResponse.json({ ok: false, message: "음성에서 전사할 내용을 찾지 못했습니다." }, { status: 502 });
  }

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
  const recordingDirectory = path.join(uploadRoot, "meetings");
  const fileName = `${randomUUID()}.${audioExtension(file.type)}`;
  await mkdir(recordingDirectory, { recursive: true });
  await writeFile(path.join(recordingDirectory, fileName), bytes, { mode: 0o600 });

  const meeting = await prisma.$transaction(async (transaction) => {
    const created = await transaction.meeting.create({
      data: {
        title,
        meetingType: meetingType || "내부 회의",
        status: "DONE",
        location: location || null,
        startedAt,
        endedAt: new Date(),
        agenda: agenda || null,
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
