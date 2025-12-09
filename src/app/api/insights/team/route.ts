import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateTeamInsights } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with company info
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile.company_id) {
    return NextResponse.json({ error: "No company assigned" }, { status: 400 });
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

  // Return cached team insight if available
  const cached = await prisma.insight.findFirst({
    where: { type: "TEAM", surveyId: survey.id, language: locale },
  });
  if (cached) {
    return NextResponse.json({ insight: cached.content });
  }

  // Get employees filtered by company
  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
      companyId: profile.company_id  // Multi-tenant filtering
    },
  });

  const teamResponses = await Promise.all(
    employees.map(async (employee) => {
      const responses = await prisma.response.findMany({
        where: {
          surveyId: survey.id,
          userId: employee.id,
        },
        include: {
          question: true,
        },
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

  // Filter employees die hebben geantwoord
  const employeesWithResponses = teamResponses.filter((tr) => tr.responses.length > 0);

  if (employeesWithResponses.length === 0) {
    return NextResponse.json({ insight: "Nog geen team antwoorden voor deze week." });
  }

  try {
    const insight = await generateTeamInsights(employeesWithResponses, weekNumber, year, locale);
    // Cache it
    await prisma.insight.create({
      data: {
        type: "TEAM",
        surveyId: survey.id,
        language: locale,
        content: (insight || "").trim(),
      },
    });
    return NextResponse.json({ insight: (insight || "").trim() });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate insight";
    console.error("Error generating team insight:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
