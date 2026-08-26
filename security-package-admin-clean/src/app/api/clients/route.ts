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

export const POST = withAuth(async (request) => {
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

  const client = await prisma.client.create({
    data: {
      name: data.name,
      clientType: data.clientType,
      businessNumber: data.businessNumber || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      memo: data.memo || null,
      contacts: {
        create: {
          name: data.contactName,
          position: data.contactPosition || null,
          phone: data.contactPhone || null,
          email: data.contactEmail || null
        }
      }
    },
    include: {
      contacts: true
    }
  });

  return NextResponse.json({ ok: true, client });
}, { roles: ["CEO", "ADMIN", "OPERATIONS"], write: true });
