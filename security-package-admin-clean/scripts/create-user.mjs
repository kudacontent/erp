import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const prisma = new PrismaClient();
const validRoles = new Set(["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING", "HR", "EMPLOYEE", "AUDITOR"]);

async function hashPassword(password) {
  if (password.length < 12) {
    throw new Error("USER_PASSWORD must be at least 12 characters long.");
  }

  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 });

  return ["scrypt", 16_384, 8, 1, salt, Buffer.from(key).toString("base64url")].join("$");
}

const email = process.env.USER_EMAIL?.trim().toLowerCase();
const name = process.env.USER_NAME?.trim();
const password = process.env.USER_PASSWORD;
const role = process.env.USER_ROLE?.trim().toUpperCase();

if (!email || !name || !password || !role || !validRoles.has(role)) {
  throw new Error("USER_EMAIL, USER_NAME, USER_PASSWORD and USER_ROLE are required. Check USER_ROLE values.");
}

try {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, status: "ACTIVE", passwordHash },
    create: { email, name, role, status: "ACTIVE", passwordHash }
  });

  console.log(`User is ready: ${user.email} (${user.role})`);
} finally {
  await prisma.$disconnect();
}
