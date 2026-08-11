import { NextResponse } from "next/server";
import { createClientSchema } from "@/lib/client-schema";
import { prisma } from "@/lib/prisma";
import { getClientsForList } from "@/lib/clients-service";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const clients = await getClientsForList();

  return NextResponse.json({ ok: true, clients });
});

export const POST = withAuth(async (request, _context, user) => {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        message: "Database is not configured."
      },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const businessCardImageUrl = data.businessCardImageUrl?.startsWith("/api/uploads/business-cards/")
    ? data.businessCardImageUrl
    : null;
  const client = await prisma.$transaction(async (transaction) => {
    const created = await transaction.client.create({
      data: {
        name: data.name,
        clientType: data.clientType,
        businessNumber: data.businessNumber || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        website: data.website || null,
        memo: data.memo || null,
        contacts: {
          create: {
            name: data.contactName,
            position: data.contactPosition || null,
            department: data.contactDepartment || null,
            phone: data.contactPhone || null,
            email: data.contactEmail || null,
            businessCardImageUrl,
            ocrRawText: data.ocrRawText || null,
            ocrConfidence: data.ocrConfidence ?? null
          }
        }
      },
      include: {
        contacts: true
      }
    });

    if (businessCardImageUrl) {
      await transaction.attachment.create({
        data: {
          entityType: "CLIENT_CONTACT",
          entityId: created.contacts[0]?.id || created.id,
          fileName: data.businessCardFileName || "business-card",
          fileUrl: businessCardImageUrl,
          mimeType: data.businessCardMimeType || "image/*",
          fileSize: null,
          uploadedBy: user.id
        }
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, client });
}, { roles: ["CEO", "ADMIN", "OPERATIONS"], write: true });
