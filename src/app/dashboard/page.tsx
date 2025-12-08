import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateTeamInsights, generateActionRecommendations } from "@/lib/ai";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) redirect("/login");
  if (role !== "HR_MANAGER") redirect("/survey");

  const { weekNumber, year } = getCurrentWeekAndYear();

  // GDPR: Do NOT fetch individual employee mapping to scores for the client
  // Just fetch aggregates
  const [survey, employees, initialSentiment] = await Promise.all([
    prisma.survey.findUnique({ where: { weekNumber_year: { weekNumber, year } } }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
    }),
    prisma.weeklySentiment.findUnique({
      where: { weekNumber_year: { weekNumber, year } }
    })
  ]);
  let currentSentiment = initialSentiment;

  const historyRaw = await prisma.weeklySentiment.findMany({
    orderBy: { weekNumber: 'asc' },
    take: 6,
    select: { weekNumber: true, score: true }
  });

  const history = historyRaw.map(h => ({
    week: h.weekNumber,
    score: (h.score / 20)
  }));

  // Calculate Churn Rate: Employees inactive for > 4 weeks
  // Find last response per user
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const activeUserIds = await prisma.response.findMany({
    where: { submittedAt: { gte: fourWeeksAgo } },
    select: { userId: true },
    distinct: ['userId']
  });

  const churnCount = employees.length - activeUserIds.length;
  const churnRate = employees.length ? Math.round((churnCount / employees.length) * 100) : 0;


  if (!survey) {
    return (
      <DashboardClient
        userName={session.user.name || "Manager"}
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

  const engagementStats = await prisma.response.aggregate({
    where: { surveyId: survey.id, valueNumeric: { not: null } },
    _avg: { valueNumeric: true }
  });

  const respondents = await prisma.response.groupBy({
    by: ['userId'],
    where: { surveyId: survey.id }
  });

  const participationRate = employees.length ? Math.round((respondents.length / employees.length) * 100) : 0;
  const engagementScore = engagementStats._avg.valueNumeric || 0;

  // Calculate Aggregates (Privacy Preserving)
  const userScores = await prisma.response.findMany({
    where: { surveyId: survey.id, valueNumeric: { not: null } },
    select: { userId: true, valueNumeric: true }
  });

  const scoreMap = new Map<string, number[]>();
  userScores.forEach(r => {
    const scores = scoreMap.get(r.userId) || [];
    if (r.valueNumeric !== null) scores.push(r.valueNumeric);
    scoreMap.set(r.userId, scores);
  });

  let riskCount = 0;
  let safeCount = 0;

  employees.forEach(u => {
    const scores = scoreMap.get(u.id) || [];
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 3.5) riskCount++; // Define risk threshold
      else safeCount++;
    }
  });

  const openFeedbackRaw = await prisma.response.findMany({
    where: { surveyId: survey.id, valueText: { not: null } },
    select: { valueText: true } // GDPR: Do NOT select user name
  });

  const openFeedback = openFeedbackRaw
    .filter(r => r.valueText && r.valueText.trim().length > 0)
    .map(r => ({ userName: "Anonymous", text: r.valueText as string })); // Force Anonymous

  // Fetch Actions
  let actionCache = await prisma.actionCache.findUnique({
    where: { surveyId_language: { surveyId: survey.id, language: 'nl' } } // Assuming NL default for now
  });

  // --- ON-THE-FLY GENERATION ---
  // If we have responses but no insights/actions (or cache was cleared), generate them now.
  const needsInsight = !currentSentiment;
  const needsActions = !actionCache;

  if ((needsInsight || needsActions) && respondents.length > 0) {
    // 1. Fetch Config
    const config = await prisma.aIConfig.findUnique({ where: { key: "question_generation" } });
    const aiConfig = config ? {
      questionPrompt: config.questionPrompt,
      focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
      tone: config.tone,
      language: config.language,
      insightsPrompt: config.insightsPrompt ?? undefined
    } : undefined;

    // 2. Fetch Full Response Data (Server-Side)
    const fullResponses = await prisma.response.findMany({
      where: { surveyId: survey.id },
      include: { user: true, question: true }
    });

    // 3. Prepare Data Structures
    // For Team Insights
    const distinctUserIds = Array.from(new Set(fullResponses.map(r => r.userId)));
    const teamResponses = distinctUserIds.map(userId => {
      const userRes = fullResponses.filter(r => r.userId === userId);
      return {
        employeeName: userRes[0]?.user.name || "Anonymous",
        responses: userRes.map(r => ({
          questionText: r.question.text,
          valueNumeric: r.valueNumeric || undefined,
          valueText: r.valueText || undefined
        }))
      };
    });

    // For Action Recommendations
    const allResponses = fullResponses.map(r => ({
      userName: r.user.name || "Anonymous",
      questionText: r.question.text,
      valueNumeric: r.valueNumeric ?? undefined,
      valueText: r.valueText ?? undefined,
    }));

    const lowScoreEmployees = distinctUserIds.map(userId => {
      const userRes = fullResponses.filter(r => r.userId === userId);
      const scores = userRes.filter(r => r.valueNumeric !== null).map(r => r.valueNumeric!);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
      const feedback = userRes.find(r => r.valueText)?.valueText;
      return { name: userRes[0]?.user.name || "Unknown", score: avg, feedback: feedback || undefined };
    }).filter(u => u.score < 2.5);

    const openFeedbackAi = fullResponses
      .filter(r => r.valueText)
      .map(r => ({ userName: r.user.name || "Anonymous", text: r.valueText! }));

    // 4. Generate & Save Missing Data
    if (needsInsight) {
      try {
        const summary = await generateTeamInsights(teamResponses, weekNumber, year, 'nl');
        const newSentiment = await prisma.weeklySentiment.create({
          data: {
            weekNumber,
            year,
            score: Math.round(engagementScore * 20),
            summary
          }
        });
        // Update local var for rendering
        currentSentiment = newSentiment;
      } catch (err) {
        console.error("Failed to generate on-the-fly insight:", err);
      }
    }

    if (needsActions) {
      try {
        // Generate for NL (default)
        const generatedActions = await generateActionRecommendations(
          engagementScore,
          participationRate,
          allResponses,
          lowScoreEmployees,
          openFeedbackAi,
          weekNumber,
          year,
          aiConfig,
          'nl'
        );

        actionCache = await prisma.actionCache.create({
          data: {
            surveyId: survey.id,
            language: 'nl',
            actionsJson: JSON.stringify(generatedActions)
          }
        });
      } catch (err) {
        console.error("Failed to generate on-the-fly actions:", err);
      }
    }
  }

  const actions = actionCache ? JSON.parse(actionCache.actionsJson) : [];

  return (
    <DashboardClient
      userName={session.user.name || "Manager"}
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