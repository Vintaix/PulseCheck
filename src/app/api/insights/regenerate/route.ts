import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { weekNumber, year } = getCurrentWeekAndYear();
  const survey = await prisma.survey.findUnique({
    where: { weekNumber_year: { weekNumber, year } },
  });

  if (!survey) {
    return NextResponse.json({ error: "No survey for this week" }, { status: 404 });
  }

  // Delete all cached insights for this survey
  await prisma.insight.deleteMany({
    where: { surveyId: survey.id },
  });

  // Delete cached actions
  await prisma.actionCache.deleteMany({
    where: { surveyId: survey.id },
  });

  return NextResponse.json({ success: true, message: "Insights cache cleared. New insights will be generated on next request." });
}

