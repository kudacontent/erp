import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif"
]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4"
};

export type UploadDirectory = "receipts" | "business-cards" | "meetings";

export function normalizeMimeType(mimeType: string) {
  const baseType = mimeType.split(";")[0].trim().toLowerCase();
  return baseType === "image/jpg" ? "image/jpeg" : baseType;
}

export function isSupportedImageMimeType(mimeType: string) {
  return IMAGE_MIME_TYPES.has(normalizeMimeType(mimeType));
}

export function getUploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
}

export function resolveUploadPath(segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes(String.fromCharCode(0)))) {
    return null;
  }

  const root = getUploadRoot();
  const resolved = path.resolve(root, ...segments);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolved;
}

export function getMimeTypeForPath(filePath: string) {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  if (extension === "jpeg") {
    return "image/jpeg";
  }

  const entry = Object.entries(extensionByMimeType).find(([, value]) => value === extension);

  return entry?.[0] || "application/octet-stream";
}

export async function storeUpload({
  bytes,
  directory,
  mimeType
}: {
  bytes: Buffer;
  directory: UploadDirectory;
  mimeType: string;
}) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const fileName = `${randomUUID()}.${extensionByMimeType[normalizedMimeType] || "bin"}`;
  const directoryPath = path.join(getUploadRoot(), directory);

  await mkdir(directoryPath, { recursive: true });
  await writeFile(path.join(directoryPath, fileName), bytes, { mode: 0o600 });

  return {
    fileName,
    fileUrl: `/api/uploads/${directory}/${fileName}`,
    mimeType: normalizedMimeType
  };
}
