import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateCompanyInsight } from "@/lib/ai";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const langParam = (url.searchParams.get("lang") || "nl").toLowerCase();
  const locale = (["nl", "en", "fr"].includes(langParam) ? langParam : "nl") as "nl" | "en" | "fr";

  const { weekNumber, year } = getCurrentWeekAndYear();
  const survey = await prisma.survey.findUnique({
    where: { weekNumber_year: { weekNumber, year } },
  });

  if (!survey) {
    return NextResponse.json({ error: "No survey for this week" }, { status: 404 });
  }

  // Return cached company insight if available
  const cached = await prisma.insight.findFirst({
    where: { type: "COMPANY", surveyId: survey.id, language: locale },
  });
  if (cached) {
    return NextResponse.json({ insight: cached.content });
  }

  // Collect all responses grouped by employee
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
  });

  const teamResponses = await Promise.all(
    employees.map(async (employee) => {
      const responses = await prisma.response.findMany({
        where: {
          surveyId: survey.id,
          userId: employee.id,
        },
        include: { question: true },
      });
      return {
        employeeName: employee.name,
        responses: responses.map((r) => ({
          questionText: r.question.text,
          valueNumeric: r.valueNumeric ?? undefined,
          valueText: r.valueText ?? undefined,
        })),
      };
    })
  );

  const employeesWithResponses = teamResponses.filter((tr) => tr.responses.length > 0);
  if (employeesWithResponses.length === 0) {
    return NextResponse.json({ insight: "Nog geen antwoorden beschikbaar." });
  }

  try {
    const insight = await generateCompanyInsight(employeesWithResponses, weekNumber, year, locale);
    await prisma.insight.create({
      data: {
        type: "COMPANY",
        surveyId: survey.id,
        language: locale,
        content: (insight || "").trim(),
      },
    });
    return NextResponse.json({ insight: (insight || "").trim() });
  } catch (error: any) {
    console.error("Error generating company insight:", error);
    return NextResponse.json({ error: error.message || "Failed to generate insight" }, { status: 500 });
  }
}

