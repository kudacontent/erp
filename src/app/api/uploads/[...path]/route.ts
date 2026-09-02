import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { UPLOAD_READ_ROLES, withAuth } from "@/lib/auth";
import { getMimeTypeForPath, resolveUploadPath } from "@/lib/upload-storage";

export const runtime = "nodejs";

// 회의 녹음은 한 시간짜리면 수십 MB 가 된다.
// 예전에는 15MB 를 넘으면 404 를 돌려줘서, 보관은 됐는데 다시 들을 수는 없었다.
const MAX_FILE_BYTES = 500 * 1024 * 1024;

/** "bytes=0-" / "bytes=1000-2000" 만 다룬다. 오디오 탐색에는 이 정도면 충분하다 */
function parseRange(header: string | null, size: number) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, startRaw, endRaw] = match;

  if (startRaw === "" && endRaw === "") return null;

  // "bytes=-500" → 마지막 500바이트
  if (startRaw === "") {
    const length = Number(endRaw);
    if (!Number.isFinite(length) || length <= 0) return null;
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(startRaw);
  const end = endRaw === "" ? size - 1 : Number(endRaw);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

export const GET = withAuth(async (request, context, user) => {
  const params = await context.params;
  const segments = Array.isArray(params.path) ? params.path : [];
  const filePath = resolveUploadPath(segments);

  if (!filePath) {
    return NextResponse.json({ ok: false, message: "파일 경로가 올바르지 않습니다." }, { status: 400 });
  }

  // 업로드 파일은 종류마다 민감도가 다르다.
  // 영수증은 회계 자료라 지출을 볼 수 있는 역할만 열람할 수 있어야 한다.
  // (이전에는 로그인만 하면 파일명을 아는 누구나 받을 수 있었다)
  const directory = segments[0] ?? "";
  const allowed = UPLOAD_READ_ROLES[directory];

  if (!allowed || !allowed.includes(user.role)) {
    return NextResponse.json({ ok: false, message: "이 파일을 볼 권한이 없습니다." }, { status: 403 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile() || fileStats.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, message: "파일을 열 수 없습니다." }, { status: 404 });
    }

    const contentType = getMimeTypeForPath(filePath);
    const headers: Record<string, string> = {
      "Cache-Control": "private, no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      // 오디오 플레이어가 중간으로 건너뛰려면 구간 요청을 받아 준다고 알려야 한다
      "Accept-Ranges": "bytes"
    };

    const range = parseRange(request.headers.get("range"), fileStats.size);

    if (range) {
      const chunk = createReadStream(filePath, { start: range.start, end: range.end });

      return new NextResponse(Readable.toWeb(chunk) as ReadableStream, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${range.start}-${range.end}/${fileStats.size}`,
          "Content-Length": String(range.end - range.start + 1)
        }
      });
    }

    // 통째로 메모리에 올리지 않고 흘려보낸다 (40MB 짜리 녹음도 안전하게)
    const stream = createReadStream(filePath);

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: { ...headers, "Content-Length": String(fileStats.size) }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
});
