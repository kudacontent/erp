import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";

type ReceiptResult = {
  merchantName: string;
  businessNumber: string;
  spentAt: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: string;
  cardLast4: string;
  approvalNumber: string;
  rawText: string;
  confidence: number;
  receiptImageUrl: string;
  receiptFileName: string;
  receiptMimeType: string;
};

const emptyResult: Omit<ReceiptResult, "receiptImageUrl" | "receiptFileName" | "receiptMimeType"> = {
  merchantName: "",
  businessNumber: "",
  spentAt: "",
  amount: 0,
  vatAmount: 0,
  totalAmount: 0,
  paymentMethod: "법인카드",
  cardLast4: "",
  approvalNumber: "",
  rawText: "",
  confidence: 0
};

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  return 0;
}

function normalizeDate(value: unknown) {
  const text = toStringValue(value).replace(/\./g, "-").replace(/\//g, "-");

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }

  return "";
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeResult(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return emptyResult;
  }

  const data = raw as Record<string, unknown>;
  const totalAmount = toMoney(data.totalAmount) || toMoney(data.amount) + toMoney(data.vatAmount);
  const vatAmount = toMoney(data.vatAmount);
  const amount = toMoney(data.amount) || Math.max(0, totalAmount - vatAmount);

  return {
    merchantName: toStringValue(data.merchantName),
    businessNumber: toStringValue(data.businessNumber),
    spentAt: normalizeDate(data.spentAt),
    amount,
    vatAmount,
    totalAmount: totalAmount || amount + vatAmount,
    paymentMethod: toStringValue(data.paymentMethod) || "법인카드",
    cardLast4: toStringValue(data.cardLast4).replace(/\D/g, "").slice(-4),
    approvalNumber: toStringValue(data.approvalNumber),
    rawText: toStringValue(data.rawText),
    confidence: normalizeConfidence(data.confidence)
  } satisfies Omit<ReceiptResult, "receiptImageUrl" | "receiptFileName" | "receiptMimeType">;
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

function getExtension(mimeType: string) {
  const extension = mimeType.split("/")[1]?.toLowerCase();

  if (extension === "jpeg") {
    return "jpg";
  }

  return ["png", "webp", "jpg", "gif"].includes(extension ?? "") ? extension : "bin";
}

export const POST = withAuth(async (request) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "GEMINI_API_KEY가 설정되지 않았습니다. 카드 영수증 OCR을 사용하려면 Google AI Studio API 키를 .env에 추가하세요."
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "분석할 카드 영수증 이미지가 없습니다." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "이미지 형식의 카드 영수증만 분석할 수 있습니다." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "영수증 이미지는 10MB 이하로 올려주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageBase64 = bytes.toString("base64");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = `
카드 영수증 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
금액은 원 단위 정수로 작성하세요. 공급가액을 확인할 수 없으면 totalAmount에서 vatAmount를 뺀 값으로 계산하세요.
날짜는 YYYY-MM-DD 형식으로 작성하고, 모르는 값은 빈 문자열 또는 0으로 두세요.
paymentMethod는 법인카드, 개인카드, 현금, 계좌이체 중 가장 가까운 값으로 작성하세요.

{
  "merchantName": "",
  "businessNumber": "",
  "spentAt": "YYYY-MM-DD",
  "amount": 0,
  "vatAmount": 0,
  "totalAmount": 0,
  "paymentMethod": "법인카드",
  "cardLast4": "",
  "approvalNumber": "",
  "rawText": "영수증에서 읽은 핵심 텍스트",
  "confidence": 0
}
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
                mime_type: file.type,
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { ok: false, message: "카드 영수증 분석 API 호출에 실패했습니다.", details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  const text = extractText(data);

  try {
    const result = normalizeResult(JSON.parse(cleanJsonText(text)));
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
    const receiptDirectory = path.join(uploadRoot, "receipts");
    const fileName = `${randomUUID()}.${getExtension(file.type)}`;

    await mkdir(receiptDirectory, { recursive: true });
    await writeFile(path.join(receiptDirectory, fileName), bytes, { mode: 0o600 });

    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        receiptImageUrl: `/api/uploads/receipts/${fileName}`,
        receiptFileName: file.name || fileName,
        receiptMimeType: file.type
      } satisfies ReceiptResult
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "카드 영수증 분석 결과를 읽을 수 없습니다.", details: text },
      { status: 502 }
    );
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
