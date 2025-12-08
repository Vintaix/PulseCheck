export const maxDuration = 60; // Allow 60s for AI thinking

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateWeeklyQuestions, generateTeamInsights, generateActionRecommendations } from "@/lib/ai";

export async function GET(request: Request) {
  // 1. Security: Check for Manual Override
  const { searchParams } = new URL(request.url);
  const isManualForce = searchParams.get('force') === 'true';

  const { weekNumber, year } = getCurrentWeekAndYear();
  const nextWeek = weekNumber === 52 ? 1 : weekNumber + 1;
  const nextWeekYear = weekNumber === 52 ? year + 1 : year;

  try {
    const config = await prisma.aIConfig.findUnique({ where: { key: "question_generation" } });

    // Parse config
    const aiConfig = config ? {
      questionPrompt: config.questionPrompt,
      focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
      tone: config.tone,
      language: config.language,
      insightsPrompt: config.insightsPrompt ?? undefined
    } : undefined;

    // Fetch current week's survey with responses
    const currentSurvey = await prisma.survey.findUnique({
      where: { weekNumber_year: { weekNumber, year } },
      include: {
        responses: {
          include: { user: true, question: true }
        }
      }
    });

    if (currentSurvey && currentSurvey.responses.length > 0) {
      // 1. Calculate basic stats
      const responses = currentSurvey.responses;
      const distinctUsers = new Set(responses.map(r => r.userId));
      const employeeCount = await prisma.user.count({ where: { role: "EMPLOYEE" } });
      const participationRate = employeeCount > 0 ? Math.round((distinctUsers.size / employeeCount) * 100) : 0;

      const numericValues = responses.filter(r => r.valueNumeric !== null).map(r => r.valueNumeric!);
      const engagementScore = numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        : 0;

      // 2. Prepare data for AI
      const teamResponses = Array.from(distinctUsers).map(userId => {
        const userResponses = responses.filter(r => r.userId === userId);
        const user = userResponses[0]?.user;
        return {
          employeeName: user?.name || "Anonymous",
          responses: userResponses.map(r => ({
            questionText: r.question.text,
            valueNumeric: r.valueNumeric || undefined,
            valueText: r.valueText || undefined
          }))
        };
      });

      const allResponses = responses.map(r => ({
        userName: r.user.name || "Anonymous",
        questionText: r.question.text,
        valueNumeric: r.valueNumeric || undefined,
        valueText: r.valueText || undefined
      }));

      const lowScoreEmployees = Array.from(distinctUsers).map(userId => {
        const userResponses = responses.filter(r => r.userId === userId);
        const scores = userResponses.filter(r => r.valueNumeric !== null).map(r => r.valueNumeric!);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
        const feedback = userResponses.find(r => r.valueText)?.valueText;
        return { name: userResponses[0]?.user.name || "Unknown", score: avg, feedback: feedback || undefined };
      }).filter(u => u.score < 2.5);

      const openFeedback = responses
        .filter(r => r.valueText)
        .map(r => ({ userName: r.user.name || "Anonymous", text: r.valueText! }));

      // 3. Generate Team Insight (Summary)
      const teamInsightText = await generateTeamInsights(teamResponses, weekNumber, year, 'nl'); // Default NL

      // Store Sentiment/Insight
      await prisma.weeklySentiment.upsert({
        where: { weekNumber_year: { weekNumber, year } },
        update: { score: Math.round(engagementScore * 20), summary: teamInsightText },
        create: {
          weekNumber,
          year,
          score: Math.round(engagementScore * 20),
          summary: teamInsightText
        }
      });

      // 4. Generate Action Recommendations
      // We generate for NL by default
      const actions = await generateActionRecommendations(
        engagementScore,
        participationRate,
        allResponses,
        lowScoreEmployees,
        openFeedback,
        weekNumber,
        year,
        aiConfig,
        'nl' // Default to Dutch for now
      );

      // Store Actions in Cache
      await prisma.actionCache.upsert({
        where: { surveyId_language: { surveyId: currentSurvey.id, language: 'nl' } },
        update: { actionsJson: JSON.stringify(actions) },
        create: {
          surveyId: currentSurvey.id,
          language: 'nl',
          actionsJson: JSON.stringify(actions)
        }
      });
    }

    // --- TASK B: Generate Next Week's Questions ---
    const existingQuestions = await prisma.question.findMany({
      where: { isActive: true }
    });

    if (!isManualForce && existingQuestions.length > 0) {
      return NextResponse.json({ message: "Questions already exist. Use force=true to overwrite." });
    }

    const recentQuestions = await prisma.question.findMany({
      orderBy: { id: 'desc' }, take: 20, select: { text: true }
    });

    const newQuestions = await generateWeeklyQuestions(
      nextWeek,
      nextWeekYear,
      aiConfig,
      recentQuestions.map(q => q.text),
      'nl' // Default logic
    );

    // Deactivate old, Create new
    await prisma.$transaction([
      prisma.question.updateMany({ data: { isActive: false } }),
      prisma.question.createMany({
        data: newQuestions.map(q => ({
          text: q.text,
          type: q.type,
          isActive: true
        }))
      }),
      prisma.survey.upsert({
        where: { weekNumber_year: { weekNumber: nextWeek, year: nextWeekYear } },
        update: {},
        create: { weekNumber: nextWeek, year: nextWeekYear }
      })
    ]);

    return NextResponse.json({
      success: true,
      generatedWeek: `${nextWeek}/${nextWeekYear}`,
      action: isManualForce ? "Manual Overwrite" : "Auto Generation"
    });

  } catch (error: any) {
    console.error("Weekly Routine Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}