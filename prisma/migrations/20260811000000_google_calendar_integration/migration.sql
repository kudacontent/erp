ALTER TABLE "CalendarEvent" ADD COLUMN "isAllDay" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);
