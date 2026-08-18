import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!password || password.length < 8) {
    console.error("Set ADMIN_PASSWORD (min 8 characters) before running this script.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`No user found for username ${username}`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, refreshToken: null },
  });

  console.log(`Password updated for ${username}. Existing sessions were invalidated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
