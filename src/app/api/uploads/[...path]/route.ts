import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getMimeTypeForPath, resolveUploadPath } from "@/lib/upload-storage";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, context) => {
  const params = await context.params;
  const segments = Array.isArray(params.path) ? params.path : [];
  const filePath = resolveUploadPath(segments);

  if (!filePath) {
    return NextResponse.json({ ok: false, message: "파일 경로가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile() || fileStats.size > 15 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "파일을 열 수 없습니다." }, { status: 404 });
    }

    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": getMimeTypeForPath(filePath),
        "Content-Length": String(file.byteLength),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
});
