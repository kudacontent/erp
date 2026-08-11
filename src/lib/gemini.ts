const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 45_000;

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

  return status >= 500 ? 502 : 400;
}

export async function generateVisionJson({ data, mimeType, prompt, schema }: GenerateVisionJsonInput) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiApiError(
      "GEMINI_API_KEY가 설정되지 않았습니다. Google AI Studio API 키를 서버 환경변수에 추가하세요.",
      503
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.GEMINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

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
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data
                }
              },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: schema,
          maxOutputTokens: 2048
        }
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiApiError("Google Gemini OCR 요청 시간이 초과되었습니다.", 504);
    }

    throw new GeminiApiError("Google Gemini OCR API에 연결하지 못했습니다.", 502);
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload: GeminiResponse = {};

  try {
    payload = responseText ? (JSON.parse(responseText) as GeminiResponse) : {};
  } catch {
    throw new GeminiApiError("Google Gemini OCR 응답을 읽을 수 없습니다.", 502);
  }

  if (!response.ok) {
    const providerMessage = payload.error?.message;
    console.error("Gemini OCR request failed", {
      status: response.status,
      message: providerMessage || "unknown provider error"
    });
    throw new GeminiApiError(
      providerMessage ? `Google Gemini OCR 요청이 거부되었습니다: ${providerMessage}` : "Google Gemini OCR 요청이 거부되었습니다.",
      normalizeStatus(response.status)
    );
  }

  const text = extractCandidateText(payload);

  if (!text) {
    throw new GeminiApiError("Google Gemini가 OCR 결과를 반환하지 않았습니다.", 502);
  }

  return cleanJsonText(text);
}
