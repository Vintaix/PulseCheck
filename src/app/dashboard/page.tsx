import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateTeamInsights, generateActionRecommendations } from "@/lib/ai";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  // --- 1. AUTHENTICATION CHECK ---
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // --- 2. ROLE CHECK (The Fix) ---
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, name: true }
  });

  // FIX: Cast role to string to prevent TypeScript "No Overlap" error
  // This allows checking for "ADMIN" even if it's not in your strict Prisma Enum yet.
  const userRole = dbUser?.role as string | undefined;

  if (!dbUser || (userRole !== "HR_MANAGER" && userRole !== "ADMIN")) {
    redirect("/survey");
  }
  // ----------------------------------------

  const { weekNumber, year } = getCurrentWeekAndYear();

  // 3. Parallel Fetching
  const [survey, employeeCount, initialSentiment] = await Promise.all([
    prisma.survey.findUnique({
      where: { weekNumber_year: { weekNumber, year } }
    }),
    prisma.user.count({
      where: { role: "EMPLOYEE" },
    }),
    prisma.weeklySentiment.findUnique({
      where: { weekNumber_year: { weekNumber, year } }
    })
  ]);

  let currentSentiment = initialSentiment;

  // 4. Fetch History
  const historyRaw = await prisma.weeklySentiment.findMany({
    orderBy: { weekNumber: 'asc' },
    take: 6,
    select: { weekNumber: true, score: true }
  });

  const history = historyRaw.map(h => ({
    week: h.weekNumber,
    score: (h.score / 20)
  }));

  // 5. Calculate Churn Rate
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const activeUserCountGroup = await prisma.response.groupBy({
    by: ['userId'],
    where: { submittedAt: { gte: fourWeeksAgo } },
  });
  const activeUserCount = activeUserCountGroup.length;

  const churnCount = Math.max(0, employeeCount - activeUserCount);
  const churnRate = employeeCount ? Math.round((churnCount / employeeCount) * 100) : 0;

  // Early Return if no survey
  if (!survey) {
    return (
      <DashboardClient
        userName={dbUser.name || "Manager"}
        weekNumber={weekNumber}
        year={year}
        engagementScore={0}
        participationRate={0}
        riskCount={0}
        safeCount={0}
        churnRate={churnRate}
        openFeedback={[]}
        history={history}
        currentSummary={currentSentiment?.summary || "No analysis available yet."}
        actions={[]}
      />
    );
  }

  // 6. Fetch Survey Metrics
  const [engagementStats, respondents, userScores, openFeedbackRaw, actionCache] = await Promise.all([
    prisma.response.aggregate({
      where: { surveyId: survey.id, valueNumeric: { not: null } },
      _avg: { valueNumeric: true }
    }),
    prisma.response.groupBy({
      by: ['userId'],
      where: { surveyId: survey.id }
    }),
    prisma.response.findMany({
      where: { surveyId: survey.id, valueNumeric: { not: null } },
      select: { userId: true, valueNumeric: true }
    }),
    prisma.response.findMany({
      where: { surveyId: survey.id, valueText: { not: null } },
      select: { valueText: true }
    }),
    prisma.actionCache.findUnique({
      where: { surveyId_language: { surveyId: survey.id, language: 'nl' } }
    })
  ]);

  const participationRate = employeeCount ? Math.round((respondents.length / employeeCount) * 100) : 0;
  const engagementScore = engagementStats._avg.valueNumeric || 0;

  // 7. Calculate Risks
  const scoreMap = new Map<string, number[]>();
  userScores.forEach(r => {
    const scores = scoreMap.get(r.userId) || [];
    if (r.valueNumeric !== null) scores.push(r.valueNumeric);
    scoreMap.set(r.userId, scores);
  });

  let riskCount = 0;
  let safeCount = 0;

  for (const scores of scoreMap.values()) {
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 3.5) riskCount++;
      else safeCount++;
    }
  }

  const openFeedback = openFeedbackRaw
    .filter(r => r.valueText && r.valueText.trim().length > 0)
    .map(r => ({ userName: "Anonymous", text: r.valueText as string }));

  // 8. AI Generation Logic
  const needsInsight = !currentSentiment;
  const needsActions = !actionCache;
  let actions = actionCache ? JSON.parse(actionCache.actionsJson) : [];

  if ((needsInsight || needsActions) && respondents.length > 0) {
    const config = await prisma.aIConfig.findUnique({ where: { key: "question_generation" } });
    const aiConfig = config ? {
      questionPrompt: config.questionPrompt,
      focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
      tone: config.tone,
      language: config.language,
      insightsPrompt: config.insightsPrompt ?? undefined
    } : undefined;

    const fullResponses = await prisma.response.findMany({
      where: { surveyId: survey.id },
      include: { user: true, question: true }
    });

    const distinctUserIds = Array.from(new Set(fullResponses.map(r => r.userId)));

    // Data prep helpers
    const formatResponsesForAI = () => {
      return fullResponses.map(r => ({
        userName: "Employee", // Anonymized
        questionText: r.question.text,
        valueNumeric: r.valueNumeric ?? undefined,
        valueText: r.valueText ?? undefined,
      }));
    };

    if (needsInsight) {
      const teamResponses = distinctUserIds.map(userId => {
        const userRes = fullResponses.filter(r => r.userId === userId);
        return {
          employeeName: "Employee",
          responses: userRes.map(r => ({
            questionText: r.question.text,
            valueNumeric: r.valueNumeric || undefined,
            valueText: r.valueText || undefined
          }))
        };
      });

      try {
        const summary = await generateTeamInsights(teamResponses, weekNumber, year, 'nl');
        const newSentiment = await prisma.weeklySentiment.upsert({
          where: { weekNumber_year: { weekNumber, year } },
          update: {},
          create: {
            weekNumber,
            year,
            score: Math.round(engagementScore * 20),
            summary
          }
        });
        currentSentiment = newSentiment;
      } catch (err) {
        console.error("AI Insight Error:", err);
      }
    }

    if (needsActions) {
      const lowScoreEmployees = distinctUserIds.map(userId => {
        const userRes = fullResponses.filter(r => r.userId === userId);
        const scores = userRes.filter(r => r.valueNumeric !== null).map(r => r.valueNumeric!);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
        const feedback = userRes.find(r => r.valueText)?.valueText;
        return { name: "Employee", score: avg, feedback: feedback || undefined };
      }).filter(u => u.score < 2.5);

      const openFeedbackAi = fullResponses
        .filter(r => r.valueText)
        .map(r => ({ userName: "Employee", text: r.valueText! }));

      try {
        const generatedActions = await generateActionRecommendations(
          engagementScore,
          participationRate,
          formatResponsesForAI(),
          lowScoreEmployees,
          openFeedbackAi,
          weekNumber,
          year,
          aiConfig,
          'nl'
        );

        await prisma.actionCache.create({
          data: {
            surveyId: survey.id,
            language: 'nl',
            actionsJson: JSON.stringify(generatedActions)
          }
        });
        actions = generatedActions;
      } catch (err) {
        console.error("AI Action Error:", err);
      }
    }
  }

  return (
    <DashboardClient
      userName={dbUser.name || "Manager"}
      weekNumber={weekNumber}
      year={year}
      engagementScore={engagementScore}
      participationRate={participationRate}
      riskCount={riskCount}
      safeCount={safeCount}
      churnRate={churnRate}
      openFeedback={openFeedback}
      history={history}
      currentSummary={currentSentiment?.summary || "Waiting for AI analysis..."}
      actions={actions}
    />
  );
}