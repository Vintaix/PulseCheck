import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateWeeklyQuestions } from "@/lib/ai";

export const maxDuration = 60; // Allow 60s for AI thinking

export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { weekNumber, year } = getCurrentWeekAndYear();

  try {
    const config = await prisma.aIConfig.findUnique({
      where: { key: "question_generation" },
    });

    const aiConfig = config
      ? {
        questionPrompt: config.questionPrompt,
        focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : undefined,
        tone: config.tone,
        language: config.language,
      }
      : undefined;

    const locale = aiConfig?.language === 'Engels' ? 'en' : aiConfig?.language === 'Frans' ? 'fr' : 'nl';

    const recentQuestions = await prisma.question.findMany({
      orderBy: { id: "desc" },
      take: 20,
      select: { text: true },
    });
    const recentQuestionTexts = recentQuestions.map((q) => q.text);

    // Ensure survey exists
    let survey = await prisma.survey.findUnique({
      where: { weekNumber_year: { weekNumber, year } },
    });
    if (!survey) {
      survey = await prisma.survey.create({ data: { weekNumber, year } });
    }

    // Deactiveer oude vragen
    await prisma.question.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Clear caches
    const allLanguages = ["nl", "en", "fr"];
    for (const lang of allLanguages) {
      await prisma.insight.deleteMany({ where: { surveyId: survey.id, language: lang } });
      await prisma.actionCache.deleteMany({ where: { surveyId: survey.id, language: lang } });
    }

    const generatedQuestions = await generateWeeklyQuestions(
      weekNumber,
      year,
      aiConfig,
      recentQuestionTexts,
      locale
    );

    const createdQuestions = await Promise.all(
      generatedQuestions.map((q: any) =>
        prisma.question.create({
          data: {
            text: q.text,
            type: q.type,
            isActive: true,
          },
        })
      )
    );

    return NextResponse.json({ questions: createdQuestions }, { status: 201 });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
