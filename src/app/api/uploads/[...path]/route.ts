import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".webp": "image/webp"
  };

  return types[extension] ?? "application/octet-stream";
}

export const GET = withAuth(async (_request, context) => {
  const params = await context.params;
  const segments = Array.isArray(params.path) ? params.path : [];

  if (!segments.length || segments.some((segment: string) => segment === ".." || segment.includes("\0"))) {
    return NextResponse.json({ ok: false, message: "잘못된 파일 경로입니다." }, { status: 400 });
  }

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
  const filePath = path.resolve(uploadRoot, ...segments);

  if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    return NextResponse.json({ ok: false, message: "허용되지 않은 파일 경로입니다." }, { status: 403 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile() || fileStats.size > 15 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "파일을 열 수 없습니다." }, { status: 404 });
    }

    const contents = await readFile(filePath);
    return new Response(contents, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(contents.byteLength),
        "Content-Type": contentTypeFor(filePath),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
});
