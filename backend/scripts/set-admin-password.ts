import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const email = process.env.ADMIN_EMAIL ?? "admin@pnsenterprises.com";
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!password || password.length < 8) {
    console.error("Set ADMIN_PASSWORD (min 8 characters) before running this script.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, refreshToken: null },
  });

  console.log(`Password updated for ${email}. Existing sessions were invalidated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
