import "dotenv/config";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

async function upsertUser(input: {
  username: string;
  email: string;
  name: string;
  role: Role;
  password?: string;
  resetPassword: boolean;
}) {
  const username = input.username.toLowerCase();
  const existing =
    (await prisma.user.findUnique({ where: { username } })) ??
    (await prisma.user.findUnique({ where: { email: input.email } }));

  if (existing) {
    const data: {
      username: string;
      email: string;
      name: string;
      role: Role;
      passwordHash?: string;
    } = {
      username,
      email: input.email,
      name: input.name,
      role: input.role,
    };
    if (input.resetPassword && input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(`Updated user: ${username} (${input.role})`);
    return;
  }

  if (!input.password) {
    throw new Error(`Cannot create ${username}: password is required`);
  }

  await prisma.user.create({
    data: {
      username,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
  });
  console.log(`Seeded user: ${username} (${input.role})`);
}

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    throw new Error("Set ADMIN_SEED_PASSWORD in backend/.env before seeding (min 8 characters).");
  }
  if (adminPassword.length < 8) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 8 characters.");
  }

  await upsertUser({
    username: "admin",
    email: process.env.ADMIN_SEED_EMAIL ?? "admin@pnsenterprises.com",
    name: "Admin",
    role: "ADMIN",
    password: adminPassword,
    resetPassword: false,
  });

  const garvitPassword = process.env.GARVIT_SEED_PASSWORD;
  if (!garvitPassword) {
    throw new Error("Set GARVIT_SEED_PASSWORD in backend/.env before seeding (min 8 characters).");
  }
  if (garvitPassword.length < 8) {
    throw new Error("GARVIT_SEED_PASSWORD must be at least 8 characters.");
  }

  await upsertUser({
    username: "garvit",
    email: "garvit@pnsenterprises.com",
    name: "Garvit",
    role: "STAFF",
    password: garvitPassword,
    resetPassword: false,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
