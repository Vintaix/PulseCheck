import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;
  if (role !== "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { weekNumber, year } = getCurrentWeekAndYear();

  let survey = await prisma.survey.findUnique({ where: { weekNumber_year: { weekNumber, year } } });
  if (!survey) {
    survey = await prisma.survey.create({ data: { weekNumber, year } });
  }

  const answers = body as Array<{ questionId: string; value: string }>;

  const createInputs = answers.map((a) => {
    return {
      userId,
      questionId: a.questionId,
      surveyId: survey!.id,
      valueNumeric: isFinite(Number(a.value)) ? Number(a.value) : null,
      valueText: isFinite(Number(a.value)) ? null : String(a.value),
    };
  });

  try {
    await prisma.$transaction(
      createInputs.map((data) =>
        prisma.response.create({ data })
      )
    );

    // Invalidate Cache to force regeneration
    await prisma.weeklySentiment.deleteMany({
      where: { weekNumber, year }
    });
    // Invalidate all languages for this survey
    await prisma.actionCache.deleteMany({
      where: { surveyId: survey!.id }
    });

  } catch (_e: unknown) {
    // unique constraint may throw if user resubmits
    return NextResponse.json({ error: "Already submitted or invalid data" }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}


