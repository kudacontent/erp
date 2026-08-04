import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

type BusinessCardResult = {
  companyName: string;
  contactName: string;
  position: string;
  department: string;
  mobile: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  clientType: string;
  confidence: number;
};

const emptyResult: BusinessCardResult = {
  companyName: "",
  contactName: "",
  position: "",
  department: "",
  mobile: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  clientType: "기타",
  confidence: 0
};

const clientTypes = ["선사", "발주처", "협력업체", "공급업체", "정비업체", "잠재고객", "기타"];

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

function normalizeClientType(value: unknown) {
  const type = toStringValue(value);
  return clientTypes.includes(type) ? type : "기타";
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeResult(raw: unknown): BusinessCardResult {
  if (!raw || typeof raw !== "object") {
    return emptyResult;
  }

  const data = raw as Record<string, unknown>;

  return {
    companyName: toStringValue(data.companyName),
    contactName: toStringValue(data.contactName),
    position: toStringValue(data.position),
    department: toStringValue(data.department),
    mobile: toStringValue(data.mobile),
    phone: toStringValue(data.phone),
    email: toStringValue(data.email),
    address: toStringValue(data.address),
    website: toStringValue(data.website),
    clientType: normalizeClientType(data.clientType),
    confidence: normalizeConfidence(data.confidence)
  };
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

export const POST = withAuth(async (request) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "GEMINI_API_KEY가 설정되지 않았습니다. 실제 명함 분석을 사용하려면 Google AI Studio API 키를 .env.local에 추가하세요."
      },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "분석할 명함 이미지가 없습니다." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "이미지 파일만 분석할 수 있습니다." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageBase64 = bytes.toString("base64");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `
명함 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
모르는 값은 빈 문자열로 두고, confidence는 전체 추출 신뢰도를 0부터 1 사이 숫자로 작성하세요.
clientType은 반드시 다음 중 하나만 사용하세요: 선사, 발주처, 협력업체, 공급업체, 정비업체, 잠재고객, 기타.

{
  "companyName": "",
  "contactName": "",
  "position": "",
  "department": "",
  "mobile": "",
  "phone": "",
  "email": "",
  "address": "",
  "website": "",
  "clientType": "",
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
      {
        ok: false,
        message: "명함 분석 API 호출에 실패했습니다.",
        details: errorText
      },
      { status: response.status }
    );
  }

  const data = await response.json();
  const text = extractText(data);

  try {
    const result = normalizeResult(JSON.parse(cleanJsonText(text)));

    return NextResponse.json({
      ok: true,
      result
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "명함 분석 결과를 읽을 수 없습니다.",
        details: text
      },
      { status: 502 }
    );
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS"], write: true });
