import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // OPMERKING: We hashen hier geen wachtwoorden.
  // Omdat je Supabase Auth gebruikt, worden wachtwoorden beheerd in de 'auth.users' tabel van Supabase.
  // Dit script vult alleen de publieke 'profiles' (User) tabel.

  // 1. Maak HR Manager Profiel aan
  const hrManager = await prisma.user.upsert({
    where: { email: "hr@test.com" },
    update: {}, // Als hij al bestaat, verander niets
    create: {
      email: "hr@test.com",
      name: "HR Manager",
      role: "HR_MANAGER",
      // passwordHash is verwijderd omdat dit niet in je schema staat
    },
  });
  console.log("✅ HR Manager profile created:", hrManager.email);

  // 2. Maak Employee Profielen aan
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
    // Check of vraag al bestaat op basis van de tekst
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
  console.log("\n⚠️  BELANGRIJK:");
  console.log("Dit script heeft alleen de 'Profiles' aangemaakt in je database.");
  console.log("Om daadwerkelijk in te loggen, moeten deze gebruikers ook bestaan in Supabase Auth.");
  console.log("Je moet deze gebruikers dus nog handmatig registreren (Signup) in je app of via het Supabase dashboard met dezelfde e-mailadressen.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });