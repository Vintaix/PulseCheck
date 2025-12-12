import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { getAuthUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = authUser.role;
  if (role !== "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = authUser.id;

  const activeQuestions = await prisma.question.findMany({ where: { isActive: true }, orderBy: { text: "asc" } });
  const { weekNumber, year } = getCurrentWeekAndYear();
  const survey = await prisma.survey.findUnique({ where: { weekNumber_year: { weekNumber, year } } });

  let alreadyAnswered = false;
  if (survey) {
    const count = await prisma.response.count({ where: { surveyId: survey.id, userId, questionId: { in: activeQuestions.map((q) => q.id) } } });
    alreadyAnswered = count > 0;
  }

  return NextResponse.json({ questions: activeQuestions, alreadyAnswered });
}


