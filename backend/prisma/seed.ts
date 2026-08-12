import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@pnsenterprises.com";
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!password) {
    throw new Error(
      "Set ADMIN_SEED_PASSWORD in backend/.env before seeding (min 12 characters)."
    );
  }

  if (password.length < 12) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, name: "Admin", role: "ADMIN" },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
