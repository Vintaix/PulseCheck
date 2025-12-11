import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Maak HR Manager Profiel aan
  const hrManager = await prisma.user.upsert({
    where: { email: "hr@test.com" },
    update: {},
    create: {
      // Omdat er geen @default(uuid()) in je schema staat, moeten we hier een ID meegeven:
      id: "11111111-1111-1111-1111-111111111111",
      email: "hr@test.com",
      name: "HR Manager",
      role: "HR_MANAGER",
    },
  });
  console.log("✅ HR Manager profile created:", hrManager.email);

  // 2. Maak Employee Profielen aan
  const employees = [
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: "employee1@test.com",
      name: "Jan Janssen"
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      email: "employee2@test.com",
      name: "Marie Verstraete"
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      email: "employee3@test.com",
      name: "Pieter De Vries"
    },
  ];

  for (const emp of employees) {
    const employee = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        id: emp.id, // Hier geven we de ID mee
        email: emp.email,
        name: emp.name,
        role: "EMPLOYEE",
      },
    });
    console.log("✅ Employee profile created:", employee.email);
  }

  // 3. Maak voorbeeld vragen aan
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
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });