import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@paynest.com";
  const password = await bcrypt.hash("Admin@2026", 10);

  const existing = await prisma.user.findFirst({ where: { email, role: "super_admin" } });
  if (existing) {
    console.log("Super admin already exists — skipping.");
    return;
  }

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password,
      role: "super_admin",
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log("Super admin created: admin@paynest.com / Admin@2026");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
