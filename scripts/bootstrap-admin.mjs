import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const prisma = new PrismaClient();

async function hashPassword(password) {
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
  }

  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 });

  return ["scrypt", 16_384, 8, 1, salt, Buffer.from(key).toString("base64url")].join("$");
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "시스템 관리자";
const resetExistingPassword = process.env.RESET_ADMIN_PASSWORD === "YES";

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to bootstrap the first administrator.");
}

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: resetExistingPassword ? await hashPassword(password) : existing.passwordHash
      }
    });
    console.log(`Administrator is ready: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: await hashPassword(password)
      }
    });
    console.log(`Administrator created: ${email}`);
  }
} finally {
  await prisma.$disconnect();
}
