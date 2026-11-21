const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("[seed] Users exist, skip");
    return;
  }

  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (process.env.NODE_ENV === "production" && password.length < 8) {
    console.error("[seed] ADMIN_PASSWORD is required in production (min 8 chars)");
    process.exit(1);
  }

  if (password.length < 8) {
    const fallback = process.env.ADMIN_SECRET || "";
    if (fallback.length < 8) {
      console.warn("[seed] ADMIN_PASSWORD or ADMIN_SECRET required (min 8)");
      return;
    }
    console.warn("[seed] Using ADMIN_SECRET as password — set ADMIN_PASSWORD in production");
  }

  const effectivePassword =
    password.length >= 8 ? password : process.env.ADMIN_SECRET || "";

  await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(effectivePassword, 12),
      role: "admin",
    },
  });

  console.log("[seed] Admin user created:", username);
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
