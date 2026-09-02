const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_FILES_URL = "https://generativelanguage.googleapis.com/v1beta/files";
const GEMINI_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly status = 502
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

type GeminiSchema = Record<string, unknown>;

type GenerateVisionJsonInput = {
  data: string;
  mimeType: string;
  prompt: string;
  schema: GeminiSchema;
};

type GenerateMediaTextInput = {
  data: string;
  mimeType: string;
  prompt: string;
  maxOutputTokens?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function cleanJsonText(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  if (firstObject >= 0 && lastObject > firstObject) {
    return cleaned.slice(firstObject, lastObject + 1);
  }

  return cleaned;
}

function extractCandidateText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function normalizeStatus(status: number) {
  if (status === 429) {
    return 429;
  }

  return status >= 500 ? 503 : 400;
}

function getModelCandidates() {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  return [...new Set([configuredModel, ...DEFAULT_FALLBACK_MODELS].filter((model): model is string => Boolean(model)))];
}

function shouldTryFallback(status: number, message: string) {
  return status === 429 || status >= 500 || /model|not available|unavailable|not found|unsupported/i.test(message);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateGeminiText({
  mediaPart,
  prompt,
  schema,
  maxOutputTokens = 2048,
  operationLabel,
  timeoutMs
}: {
  /** inline_data (작은 파일) 또는 file_data (Files API 로 올린 큰 파일) */
  mediaPart: Record<string, unknown>;
  prompt: string;
  schema?: GeminiSchema;
  maxOutputTokens?: number;
  operationLabel: string;
  timeoutMs?: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiApiError(
      "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio API 키를 서버 환경변수에 추가하세요.",
      503
    );
  }

  const models = getModelCandidates();
  let lastError: GeminiApiError | null = null;

  for (const [index, model] of models.entries()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? Number(process.env.GEMINI_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [mediaPart, { text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
            maxOutputTokens
          }
        }),
        signal: controller.signal
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      lastError = new GeminiApiError(
        timedOut ? `${operationLabel} 요청 시간이 초과되었습니다.` : `${operationLabel} API에 연결하지 못했습니다.`,
        timedOut ? 504 : 502
      );
      if (index < models.length - 1) {
        console.warn("Gemini request failed; trying fallback model", { model, message: lastError.message });
        await delay(250);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    let payload: GeminiResponse = {};

    try {
      payload = responseText ? (JSON.parse(responseText) as GeminiResponse) : {};
    } catch {
      throw new GeminiApiError(`${operationLabel} 응답을 읽을 수 없습니다.`, 502);
    }

    if (!response.ok) {
      const providerMessage = payload.error?.message || "unknown provider error";
      const errorMessage = `${operationLabel} 요청이 거부되었습니다: ${providerMessage}`;
      lastError = new GeminiApiError(errorMessage, normalizeStatus(response.status));
      console.error("Gemini request failed", { model, status: response.status, message: providerMessage });

      if (index < models.length - 1 && shouldTryFallback(response.status, providerMessage)) {
        await delay(response.status === 429 || response.status >= 500 ? 500 : 250);
        continue;
      }

      throw lastError;
    }

    const text = extractCandidateText(payload);
    if (!text) {
      throw new GeminiApiError(`${operationLabel} 결과를 반환하지 않았습니다.`, 502);
    }

    return text;
  }

  throw lastError ?? new GeminiApiError(`${operationLabel}에 실패했습니다.`, 502);
}

export async function generateVisionJson({ data, mimeType, prompt, schema }: GenerateVisionJsonInput) {
  return cleanJsonText(
    await generateGeminiText({
      mediaPart: { inline_data: { mime_type: mimeType, data } },
      prompt,
      schema,
      operationLabel: "Google Gemini OCR"
    })
  );
}

export async function generateTextFromMedia({ data, mimeType, prompt, maxOutputTokens = 8192 }: GenerateMediaTextInput) {
  return (
    await generateGeminiText({
      mediaPart: { inline_data: { mime_type: mimeType, data } },
      prompt,
      maxOutputTokens,
      operationLabel: "Google Gemini 회의 전사"
    })
  ).trim();
}

/**
 * Files API 로 올린 파일을 가리켜 전사한다.
 *
 * 요청 본문에 오디오를 base64 로 실어 보내는 방식(inline)은 전체 요청이 20MB 를 넘을 수 없어서,
 * 실무에서는 40분쯤 되는 회의부터 막혔다.
 * Files API 로 올리면 파일당 2GB, 오디오 9.5시간까지 처리된다.
 *
 * 긴 오디오는 모델이 답하는 데도 시간이 걸리므로 기본 타임아웃을 길게 잡는다.
 */
export async function generateTextFromFileUri({
  fileUri,
  mimeType,
  prompt,
  maxOutputTokens = 8192,
  timeoutMs = 15 * 60 * 1000
}: {
  fileUri: string;
  mimeType: string;
  prompt: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}) {
  return (
    await generateGeminiText({
      mediaPart: { file_data: { mime_type: mimeType, file_uri: fileUri } },
      prompt,
      maxOutputTokens,
      timeoutMs,
      operationLabel: "Google Gemini 회의 전사"
    })
  ).trim();
}

function requireApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiApiError(
      "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio API 키를 서버 환경변수에 추가하세요.",
      503
    );
  }

  return apiKey;
}

type GeminiFile = { name: string; uri: string; state: string };

/**
 * 파일을 Gemini Files API 로 올린다.
 *
 * 두 단계로 나뉜 프로토콜이다.
 *   1) 업로드를 시작하겠다고 알리고 전용 업로드 주소를 받는다
 *   2) 그 주소로 파일 내용을 보낸다
 *
 * 파일 내용은 스트림으로 흘려보낸다 — 두 시간짜리 녹음을 통째로 메모리에 올리지 않기 위해서다.
 * 올린 파일은 48시간 뒤 구글 쪽에서 자동으로 지워진다. 원본은 우리 NAS 에 남는다.
 */
export async function uploadFileToGemini({
  filePath,
  mimeType,
  sizeBytes,
  displayName
}: {
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  displayName: string;
}): Promise<GeminiFile> {
  const apiKey = requireApiKey();
  const { createReadStream } = await import("node:fs");
  const { Readable } = await import("node:stream");

  const startResponse = await fetch(GEMINI_UPLOAD_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(sizeBytes),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ file: { display_name: displayName } })
  });

  if (!startResponse.ok) {
    throw new GeminiApiError(
      `녹음 파일 업로드를 시작하지 못했습니다. (${startResponse.status})`,
      normalizeStatus(startResponse.status)
    );
  }

  const uploadUrl = startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new GeminiApiError("업로드 주소를 받지 못했습니다.", 502);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(sizeBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize"
    },
    body: Readable.toWeb(createReadStream(filePath)) as ReadableStream,
    // 스트림을 본문으로 보낼 때 필요하다 (undici 규칙)
    duplex: "half"
  } as RequestInit & { duplex: "half" });

  if (!uploadResponse.ok) {
    throw new GeminiApiError(
      `녹음 파일을 업로드하지 못했습니다. (${uploadResponse.status})`,
      normalizeStatus(uploadResponse.status)
    );
  }

  const payload = (await uploadResponse.json()) as { file?: GeminiFile };

  if (!payload.file?.uri || !payload.file?.name) {
    throw new GeminiApiError("업로드 결과를 읽을 수 없습니다.", 502);
  }

  return payload.file;
}

/**
 * 업로드한 파일이 처리될 때까지 기다린다.
 *
 * 올린 직후에는 PROCESSING 상태이고, 이때 전사를 요청하면 거부된다.
 * 오디오는 보통 몇 초 안에 ACTIVE 가 된다.
 */
export async function waitForGeminiFile(name: string, timeoutMs = 5 * 60 * 1000) {
  const apiKey = requireApiKey();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${GEMINI_FILES_URL}/${encodeURIComponent(name.replace(/^files\//, ""))}`, {
      headers: { "x-goog-api-key": apiKey }
    });

    if (!response.ok) {
      throw new GeminiApiError(`업로드한 파일 상태를 확인하지 못했습니다. (${response.status})`, normalizeStatus(response.status));
    }

    const file = (await response.json()) as GeminiFile;

    if (file.state === "ACTIVE") {
      return file;
    }

    if (file.state === "FAILED") {
      throw new GeminiApiError("업로드한 녹음 파일을 구글이 처리하지 못했습니다.", 502);
    }

    await delay(2000);
  }

  throw new GeminiApiError("업로드한 녹음 파일이 처리되기를 기다리다 시간이 초과되었습니다.", 504);
}

/** 전사가 끝난 파일을 지운다. 실패해도 48시간 뒤 자동 삭제되므로 무시한다 */
export async function deleteGeminiFile(name: string) {
  try {
    await fetch(`${GEMINI_FILES_URL}/${encodeURIComponent(name.replace(/^files\//, ""))}`, {
      method: "DELETE",
      headers: { "x-goog-api-key": requireApiKey() }
    });
  } catch {
    // 무시
  }
}
