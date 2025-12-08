import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role as string;
  if (role !== "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as any).id as string;

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


