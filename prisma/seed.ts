import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Hash voor wachtwoord "password123"
  const passwordHash = await bcrypt.hash("password123", 10);

  // Maak HR Manager aan
  const hrManager = await prisma.user.upsert({
    where: { email: "hr@test.com" },
    update: {},
    create: {
      email: "hr@test.com",
      name: "HR Manager",
      passwordHash,
      role: "HR_MANAGER",
    },
  });
  console.log("✅ HR Manager created:", hrManager.email);

  // Maak Employees aan
  const employees = [
    { email: "employee1@test.com", name: "Jan Janssen" },
    { email: "employee2@test.com", name: "Marie Verstraete" },
    { email: "employee3@test.com", name: "Pieter De Vries" },
  ];

  for (const emp of employees) {
    const employee = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        name: emp.name,
        passwordHash,
        role: "EMPLOYEE",
      },
    });
    console.log("✅ Employee created:", employee.email);
  }

  // Maak voorbeeld vragen aan
  const questions = [
    {
      text: "Hoe tevreden ben je met je werk deze week?",
      type: "SCALE_1_5" as const,
      isActive: true,
    },
    {
      text: "Hoe gemotiveerd voel je je deze week?",
      type: "SCALE_1_5" as const,
      isActive: true,
    },
    {
      text: "Heb je nog feedback of opmerkingen voor deze week?",
      type: "OPEN" as const,
      isActive: true,
    },
  ];

  for (const q of questions) {
    // Check if question already exists
    const existing = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!existing) {
      const question = await prisma.question.create({
        data: {
          text: q.text,
          type: q.type,
          isActive: q.isActive,
        },
      });
      console.log("✅ Question created:", question.text);
    } else {
      console.log("⏭️  Question already exists:", q.text);
    }
  }

  console.log("🎉 Seed completed!");
  console.log("\n📝 Test accounts:");
  console.log("HR Manager: hr@test.com / password123");
  console.log("Employees: employee1@test.com, employee2@test.com, employee3@test.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

