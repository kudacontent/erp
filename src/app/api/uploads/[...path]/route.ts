import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { UPLOAD_READ_ROLES, withAuth } from "@/lib/auth";
import { getMimeTypeForPath, resolveUploadPath } from "@/lib/upload-storage";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, context, user) => {
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
