import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { GeminiApiError, generateVisionJson, MAX_IMAGE_BYTES } from "@/lib/gemini";
import { isSupportedImageMimeType, normalizeMimeType, storeUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

type ReceiptData = {
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
};

type ReceiptResult = ReceiptData & {
  receiptImageUrl: string;
  receiptFileName: string;
  receiptMimeType: string;
};

const emptyResult: ReceiptData = {
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

const receiptSchema = {
  type: "OBJECT",
  properties: {
    merchantName: { type: "STRING" },
    businessNumber: { type: "STRING" },
    spentAt: { type: "STRING" },
    amount: { type: "INTEGER" },
    vatAmount: { type: "INTEGER" },
    totalAmount: { type: "INTEGER" },
    paymentMethod: { type: "STRING" },
    cardLast4: { type: "STRING" },
    approvalNumber: { type: "STRING" },
    rawText: { type: "STRING" },
    confidence: { type: "NUMBER" }
  },
  required: [
    "merchantName",
    "businessNumber",
    "spentAt",
    "amount",
    "vatAmount",
    "totalAmount",
    "paymentMethod",
    "cardLast4",
    "approvalNumber",
    "rawText",
    "confidence"
  ]
};

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
  const text = toStringValue(value).split(/[T ]/)[0].replace(/\./g, "-").replace(/\//g, "-");

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
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const normalized = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, normalized));
}

function normalizeResult(raw: unknown): ReceiptData {
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
    rawText: toStringValue(data.rawText).slice(0, 50_000),
    confidence: normalizeConfidence(data.confidence)
  };
}

function getErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof GeminiApiError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
  }

  console.error(fallbackMessage, error);
  return NextResponse.json({ ok: false, message: fallbackMessage }, { status: 502 });
}

export const POST = withAuth(async (request) => {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "분석할 카드 영수증 이미지가 없습니다." }, { status: 400 });
  }

  const mimeType = normalizeMimeType(file.type);

  if (!isSupportedImageMimeType(mimeType)) {
    return NextResponse.json({ ok: false, message: "JPG, PNG, WEBP, GIF, HEIC, HEIF 이미지만 분석할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, message: "영수증 이미지는 10MB 이하로 올려주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const prompt = `
카드 영수증 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
금액은 원 단위 정수로 작성하세요. 공급가액을 확인할 수 없으면 totalAmount에서 vatAmount를 뺀 값으로 계산하세요.
날짜는 YYYY-MM-DD 형식으로 작성하고, 모르는 값은 빈 문자열 또는 0으로 두세요.
paymentMethod는 법인카드, 개인카드, 현금, 계좌이체 중 가장 가까운 값으로 작성하세요.
confidence는 추출 결과 전체 신뢰도를 0부터 1 사이 숫자로 작성하세요.

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

  try {
    const responseText = await generateVisionJson({
      data: bytes.toString("base64"),
      mimeType,
      prompt,
      schema: receiptSchema
    });
    const result = normalizeResult(JSON.parse(responseText));
    const stored = await storeUpload({ bytes, directory: "receipts", mimeType });

    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        receiptImageUrl: stored.fileUrl,
        receiptFileName: file.name || stored.fileName,
        receiptMimeType: stored.mimeType
      } satisfies ReceiptResult
    });
  } catch (error) {
    return getErrorResponse(error, "카드 영수증 분석 결과를 처리하지 못했습니다.");
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
