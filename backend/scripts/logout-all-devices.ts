import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { revokedSessionValue } from "../src/lib/sessionRevocation.js";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });
  const result = await prisma.user.updateMany({
    data: { refreshToken: revokedSessionValue() },
  });
  console.log(
    `Logged out all devices for ${result.count} user(s): ${users.map((user) => user.username).join(", ")}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
