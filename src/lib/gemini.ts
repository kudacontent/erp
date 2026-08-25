const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
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
  data,
  mimeType,
  prompt,
  schema,
  maxOutputTokens = 2048,
  operationLabel
}: GenerateMediaTextInput & { schema?: GeminiSchema; operationLabel: string }) {
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
  return cleanJsonText(await generateGeminiText({ data, mimeType, prompt, schema, operationLabel: "Google Gemini OCR" }));
}

export async function generateTextFromMedia({ data, mimeType, prompt, maxOutputTokens = 8192 }: GenerateMediaTextInput) {
  return (await generateGeminiText({ data, mimeType, prompt, maxOutputTokens, operationLabel: "Google Gemini 회의 전사" })).trim();
}
