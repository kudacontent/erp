import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { GeminiApiError, generateVisionJson, MAX_IMAGE_BYTES } from "@/lib/gemini";
import { isSupportedImageMimeType, normalizeMimeType, storeUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

type BusinessCardData = {
  companyName: string;
  businessNumber: string;
  contactName: string;
  position: string;
  department: string;
  mobile: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  clientType: string;
  rawText: string;
  confidence: number;
};

type BusinessCardResult = BusinessCardData & {
  businessCardImageUrl: string;
  businessCardFileName: string;
  businessCardMimeType: string;
};

const emptyResult: BusinessCardData = {
  companyName: "",
  businessNumber: "",
  contactName: "",
  position: "",
  department: "",
  mobile: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  clientType: "기타",
  rawText: "",
  confidence: 0
};

const clientTypes = ["선사", "발주처", "협력업체", "공급업체", "정비업체", "회계/세무", "잠재고객", "기타"];

const businessCardSchema = {
  type: "OBJECT",
  properties: {
    companyName: { type: "STRING" },
    businessNumber: { type: "STRING" },
    contactName: { type: "STRING" },
    position: { type: "STRING" },
    department: { type: "STRING" },
    mobile: { type: "STRING" },
    phone: { type: "STRING" },
    email: { type: "STRING" },
    address: { type: "STRING" },
    website: { type: "STRING" },
    clientType: { type: "STRING", enum: clientTypes },
    rawText: { type: "STRING" },
    confidence: { type: "NUMBER" }
  },
  required: [
    "companyName",
    "businessNumber",
    "contactName",
    "position",
    "department",
    "mobile",
    "phone",
    "email",
    "address",
    "website",
    "clientType",
    "rawText",
    "confidence"
  ]
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeClientType(value: unknown) {
  const type = toStringValue(value);
  return clientTypes.includes(type) ? type : "기타";
}

function normalizeConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const normalized = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, normalized));
}

function normalizeResult(raw: unknown): BusinessCardData {
  if (!raw || typeof raw !== "object") {
    return emptyResult;
  }

  const data = raw as Record<string, unknown>;

  return {
    companyName: toStringValue(data.companyName),
    businessNumber: toStringValue(data.businessNumber),
    contactName: toStringValue(data.contactName),
    position: toStringValue(data.position),
    department: toStringValue(data.department),
    mobile: toStringValue(data.mobile),
    phone: toStringValue(data.phone),
    email: toStringValue(data.email),
    address: toStringValue(data.address),
    website: toStringValue(data.website),
    clientType: normalizeClientType(data.clientType),
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
    return NextResponse.json({ ok: false, message: "분석할 명함 이미지가 없습니다." }, { status: 400 });
  }

  const mimeType = normalizeMimeType(file.type);

  if (!isSupportedImageMimeType(mimeType)) {
    return NextResponse.json({ ok: false, message: "JPG, PNG, WEBP, GIF, HEIC, HEIF 이미지만 분석할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, message: "명함 이미지는 10MB 이하로 올려주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const prompt = `
명함 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
모르는 값은 빈 문자열로 두고, confidence는 전체 추출 신뢰도를 0부터 1 사이 숫자로 작성하세요.
clientType은 반드시 다음 중 하나만 사용하세요: ${clientTypes.join(", ")}.
명함에 사업자등록번호가 있으면 businessNumber에 기록하세요.
rawText에는 이미지에서 읽은 핵심 원문을 넣으세요.

{
  "companyName": "",
  "businessNumber": "",
  "contactName": "",
  "position": "",
  "department": "",
  "mobile": "",
  "phone": "",
  "email": "",
  "address": "",
  "website": "",
  "clientType": "기타",
  "rawText": "",
  "confidence": 0
}
`;

  try {
    const responseText = await generateVisionJson({
      data: bytes.toString("base64"),
      mimeType,
      prompt,
      schema: businessCardSchema
    });
    const result = normalizeResult(JSON.parse(responseText));
    const stored = await storeUpload({ bytes, directory: "business-cards", mimeType });

    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        businessCardImageUrl: stored.fileUrl,
        businessCardFileName: file.name || stored.fileName,
        businessCardMimeType: stored.mimeType
      } satisfies BusinessCardResult
    });
  } catch (error) {
    return getErrorResponse(error, "명함 분석 결과를 처리하지 못했습니다.");
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS"], write: true });
