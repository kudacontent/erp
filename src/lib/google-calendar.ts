import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { prisma } from "@/lib/prisma";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_IDENTITY_SCOPES = "openid email profile";
const GOOGLE_STATE_COOKIE = "kudalabs_google_calendar_state";
const GOOGLE_CALENDAR_TIME_ZONE = "Asia/Seoul";
const CONNECTION_ID = "primary";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
};

type GoogleEventTime = {
  date?: string;
  dateTime?: string;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  hidden?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
  error?: { code?: number; message?: string };
};

const EXCLUDED_GOOGLE_CALENDAR_ID_PARTS = [
  "#holiday@group.v.calendar.google.com",
  "#contacts@group.v.calendar.google.com"
] as const;

const EXCLUDED_GOOGLE_CALENDAR_SUMMARY_WORDS = [
  "공휴일",
  "기념일",
  "생일",
  "holiday",
  "holidays",
  "anniversary",
  "anniversaries",
  "birthday",
  "birthdays"
] as const;

export type GoogleCalendarStatus = {
  configured: boolean;
  targetEmail: string;
  connected: boolean;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  eventCount: number;
};

export const googleCalendarStateCookieName = GOOGLE_STATE_COOKIE;

export class GoogleCalendarError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "google_calendar_error", status = 500) {
    super(message);
    this.name = "GoogleCalendarError";
    this.code = code;
    this.status = status;
  }
}

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new GoogleCalendarError("Google Calendar OAuth 설정이 필요합니다.", "google_oauth_not_configured", 503);
  }

  return { clientId, clientSecret };
}

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function getGoogleCalendarTargetEmail() {
  return (process.env.GOOGLE_CALENDAR_ACCOUNT?.trim() || "kuda.content@gmail.com").toLowerCase();
}

export function getGoogleCalendarRedirectUri() {
  const configured = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new GoogleCalendarError("NEXT_PUBLIC_APP_URL 또는 GOOGLE_CALENDAR_REDIRECT_URI가 필요합니다.", "google_redirect_not_configured", 503);
  }

  return new URL("/api/calendar/google/callback", appUrl).toString();
}

function getTokenEncryptionKey() {
  const keySource = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if (!keySource || keySource.length < 32) {
    throw new GoogleCalendarError("Google 토큰 암호화 키가 올바르게 설정되지 않았습니다.", "google_token_key_not_configured", 503);
  }

  return createHash("sha256").update(keySource).digest();
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptToken(value: string) {
  const [version, encodedIv, encodedAuthTag, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedAuthTag || !encodedCiphertext) {
    throw new GoogleCalendarError("Google 토큰 형식이 올바르지 않습니다.", "google_token_invalid", 500);
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getTokenEncryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new GoogleCalendarError("Google 토큰을 복호화할 수 없습니다. 캘린더를 다시 연결하세요.", "google_token_invalid", 500);
  }
}

export function createGoogleOAuthState() {
  return randomBytes(32).toString("hex");
}

export function isValidGoogleOAuthState(expected: string | undefined, actual: string | null) {
  if (!expected || !actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function googleOAuthStateCookieOptions() {
  const secure =
    process.env.AUTH_COOKIE_SECURE === "true" ||
    (process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true);

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60
  };
}

export function buildGoogleAuthorizationUrl(state: string) {
  const { clientId } = getClientCredentials();
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getGoogleCalendarRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", `${GOOGLE_IDENTITY_SCOPES} ${GOOGLE_CALENDAR_SCOPE}`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("login_hint", getGoogleCalendarTargetEmail());
  url.searchParams.set("state", state);
  return url;
}

async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret } = getClientCredentials();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleCalendarRedirectUri(),
      grant_type: "authorization_code"
    })
  });
  const data = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new GoogleCalendarError("Google 인증 코드를 교환하지 못했습니다. OAuth redirect URI와 동의 설정을 확인하세요.", data.error || "google_token_exchange_failed", 502);
  }

  return data;
}

async function refreshAccessToken(connection: { refreshTokenEncrypted: string }) {
  const { clientId, clientSecret } = getClientCredentials();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptToken(connection.refreshTokenEncrypted),
      grant_type: "refresh_token"
    })
  });
  const data = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new GoogleCalendarError("Google 인증이 만료되었습니다. 캘린더를 다시 연결하세요.", "google_refresh_failed", 401);
  }

  return data;
}

async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = (await response.json().catch(() => ({}))) as { email?: string };

  if (!response.ok || !data.email) {
    throw new GoogleCalendarError("Google 계정 이메일을 확인하지 못했습니다.", "google_identity_failed", 502);
  }

  return data.email.trim().toLowerCase();
}

export async function connectGoogleCalendar(code: string) {
  const token = await exchangeAuthorizationCode(code);
  const accountEmail = await getGoogleAccountEmail(token.access_token as string);
  const targetEmail = getGoogleCalendarTargetEmail();

  if (accountEmail !== targetEmail) {
    throw new GoogleCalendarError(`지정된 계정(${targetEmail})으로 로그인해야 합니다. 현재 선택한 계정: ${accountEmail}`, "google_account_mismatch", 400);
  }

  const existing = await prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } });
  const refreshToken = token.refresh_token
    ? encryptToken(token.refresh_token)
    : existing?.refreshTokenEncrypted;

  if (!refreshToken) {
    throw new GoogleCalendarError("Google refresh token을 받지 못했습니다. 다시 연결을 시도하세요.", "google_refresh_token_missing", 502);
  }

  return prisma.googleCalendarConnection.upsert({
    where: { id: CONNECTION_ID },
    update: {
      accountEmail,
      calendarId: "primary",
      accessTokenEncrypted: encryptToken(token.access_token as string),
      refreshTokenEncrypted: refreshToken,
      tokenExpiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      lastError: null
    },
    create: {
      id: CONNECTION_ID,
      accountEmail,
      calendarId: "primary",
      accessTokenEncrypted: encryptToken(token.access_token as string),
      refreshTokenEncrypted: refreshToken,
      tokenExpiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000)
    }
  });
}

async function getAccessToken(connection: {
  id: string;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date | null;
}) {
  if (connection.accessTokenEncrypted && connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    try {
      return decryptToken(connection.accessTokenEncrypted);
    } catch {
      // A corrupted access token can be replaced using the refresh token below.
    }
  }

  const refreshed = await refreshAccessToken(connection);
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token as string),
      tokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
      lastError: null
    }
  });

  return refreshed.access_token as string;
}

function getGoogleDateTime(value: GoogleEventTime | undefined) {
  if (value?.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : { date: parsed, isAllDay: false };
  }

  if (value?.date) {
    const [year, month, day] = value.date.split("-").map(Number);
    if ([year, month, day].some((part) => !Number.isFinite(part))) {
      return null;
    }

    return { date: new Date(Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000), isAllDay: true };
  }

  return null;
}

function categoryForEvent(title: string) {
  if (["정산", "입금", "세금계산서", "세금", "지급"].some((word) => title.includes(word))) {
    return "정산";
  }

  if (["회의", "미팅", "meeting", "conference"].some((word) => title.toLowerCase().includes(word.toLowerCase()))) {
    return "회의";
  }

  if (["거래처", "견적", "선체", "협력사", "고객"].some((word) => title.includes(word))) {
    return "거래처";
  }

  return "내부";
}

function safeSyncError(error: unknown) {
  if (error instanceof GoogleCalendarError) {
    return error.message.slice(0, 240);
  }

  return "Google Calendar 동기화 중 오류가 발생했습니다.";
}

async function listGoogleCalendars(accessToken: string, preferredCalendarId: string) {
  const calendars = new Map<string, GoogleCalendarListEntry>();
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GOOGLE_CALENDAR_API_URL}/users/me/calendarList`);
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("showHidden", "false");
    url.searchParams.set("minAccessRole", "reader");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = (await response.json().catch(() => ({}))) as GoogleCalendarListResponse;
    if (!response.ok) {
      if (response.status === 401) {
        throw new GoogleCalendarError("Google 인증이 만료되었습니다. 캘린더를 다시 연결하세요.", "google_unauthorized", 401);
      }

      const providerMessage = data.error?.message ? `: ${data.error.message}` : "";
      throw new GoogleCalendarError(`Google Calendar 목록을 조회하지 못했습니다${providerMessage}`, `google_calendar_list_${data.error?.code || response.status}`, 502);
    }

    for (const calendar of data.items ?? []) {
      if (calendar.id && !calendar.hidden) {
        calendars.set(calendar.id, calendar);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  if (!calendars.has(preferredCalendarId)) {
    calendars.set(preferredCalendarId, { id: preferredCalendarId, primary: preferredCalendarId === "primary" });
  }

  return [...calendars.values()].filter((calendar): calendar is GoogleCalendarListEntry & { id: string } => Boolean(calendar.id));
}

function externalGoogleEventId(calendarId: string, eventId: string) {
  return `${calendarId}:${eventId}`;
}

function isExcludedGoogleCalendarId(value: string) {
  const normalized = value.trim().toLowerCase();
  return EXCLUDED_GOOGLE_CALENDAR_ID_PARTS.some((part) => normalized.includes(part));
}

function isExcludedGoogleCalendar(calendar: GoogleCalendarListEntry) {
  const summary = calendar.summary?.trim().toLowerCase() ?? "";
  return Boolean(calendar.id && (isExcludedGoogleCalendarId(calendar.id) || EXCLUDED_GOOGLE_CALENDAR_SUMMARY_WORDS.some((word) => summary.includes(word))));
}

export async function syncGoogleCalendar() {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } });
  if (!connection) {
    throw new GoogleCalendarError("먼저 Google Calendar를 연결하세요.", "google_not_connected", 400);
  }

  const now = Date.now();
  const timeMin = new Date(now - 365 * 24 * 60 * 60 * 1000);
  const timeMax = new Date(now + 730 * 24 * 60 * 60 * 1000);

  try {
    const accessToken = await getAccessToken(connection);
    const calendars = (await listGoogleCalendars(accessToken, connection.calendarId)).filter((calendar) => !isExcludedGoogleCalendar(calendar));
    const events: Array<{ calendarId: string; event: GoogleEvent }> = [];

    for (const calendar of calendars) {
      let pageToken: string | undefined;
      do {
        const url = new URL(`${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(calendar.id)}/events`);
        url.searchParams.set("maxResults", "2500");
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("showDeleted", "true");
        url.searchParams.set("timeMin", timeMin.toISOString());
        url.searchParams.set("timeMax", timeMax.toISOString());
        url.searchParams.set("timeZone", GOOGLE_CALENDAR_TIME_ZONE);
        if (pageToken) {
          url.searchParams.set("pageToken", pageToken);
        }

        const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = (await response.json().catch(() => ({}))) as GoogleEventsResponse & { error?: { code?: number; message?: string } };

        if (!response.ok) {
          if (response.status === 401) {
            throw new GoogleCalendarError("Google 인증이 만료되었습니다. 캘린더를 다시 연결하세요.", "google_unauthorized", 401);
          }

          const providerMessage = data.error?.message ? `: ${data.error.message}` : "";
          throw new GoogleCalendarError(`Google Calendar 일정 조회에 실패했습니다${providerMessage}`, `google_events_${data.error?.code || response.status}`, 502);
        }

        for (const event of data.items ?? []) {
          events.push({ calendarId: calendar.id, event });
        }
        pageToken = data.nextPageToken;
      } while (pageToken);
    }

    const activeEvents = events.filter(({ event }) => event.id && event.status !== "cancelled");
    const googleEventIds = activeEvents.map(({ calendarId, event }) => externalGoogleEventId(calendarId, event.id as string));

    await prisma.$transaction(async (transaction) => {
      await transaction.calendarEvent.deleteMany({
        where: {
          syncStatus: "GOOGLE_SYNCED",
          OR: EXCLUDED_GOOGLE_CALENDAR_ID_PARTS.map((part) => ({ googleEventId: { contains: part } }))
        }
      });

      for (const { calendarId, event } of activeEvents) {
        const start = getGoogleDateTime(event.start);
        const end = getGoogleDateTime(event.end);
        if (!start || !end) {
          continue;
        }

        const title = event.summary?.trim() || "제목 없는 일정";
        const description = [event.description?.trim(), event.location ? `장소: ${event.location.trim()}` : ""].filter(Boolean).join("\n");
        const data = {
          title,
          category: categoryForEvent(title),
          startTime: start.date,
          endTime: end.date > start.date ? end.date : new Date(start.date.getTime() + 60 * 60 * 1000),
          isAllDay: start.isAllDay,
          description: description || null,
          syncStatus: "GOOGLE_SYNCED"
        };
        const googleEventId = externalGoogleEventId(calendarId, event.id as string);

        await transaction.calendarEvent.upsert({
          where: { googleEventId },
          update: data,
          create: { googleEventId, clientId: null, contractId: null, ...data }
        });
      }

      await transaction.calendarEvent.deleteMany({
        where: {
          syncStatus: "GOOGLE_SYNCED",
          googleEventId: googleEventIds.length ? { notIn: googleEventIds } : { not: null },
          startTime: { lt: timeMax },
          endTime: { gt: timeMin }
        }
      });

      await transaction.googleCalendarConnection.update({
        where: { id: CONNECTION_ID },
        data: { lastSyncedAt: new Date(), lastError: null }
      });
    });

    return { accountEmail: connection.accountEmail, calendarCount: calendars.length, syncedCount: activeEvents.length, lastSyncedAt: new Date() };
  } catch (error) {
    await prisma.googleCalendarConnection.update({
      where: { id: CONNECTION_ID },
      data: { lastError: safeSyncError(error) }
    }).catch(() => undefined);
    throw error;
  }
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } });
  const eventCount = await prisma.calendarEvent.count({ where: { syncStatus: "GOOGLE_SYNCED" } });

  return {
    configured: isGoogleCalendarConfigured(),
    targetEmail: getGoogleCalendarTargetEmail(),
    connected: Boolean(connection),
    accountEmail: connection?.accountEmail ?? null,
    lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
    lastError: connection?.lastError ?? null,
    eventCount
  };
}

export async function disconnectGoogleCalendar() {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: CONNECTION_ID } });

  if (connection) {
    try {
      const token = connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null;
      if (token) {
        await fetch(`${"https://oauth2.googleapis.com/revoke"}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => undefined);
      }
    } catch {
      // Local cleanup still proceeds if Google's revoke endpoint cannot be reached.
    }
  }

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({ where: { syncStatus: "GOOGLE_SYNCED", googleEventId: { not: null } } }),
    prisma.googleCalendarConnection.deleteMany({ where: { id: CONNECTION_ID } })
  ]);
}
