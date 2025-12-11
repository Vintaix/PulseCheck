import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/week";
import { generateActionRecommendations } from "@/lib/ai";

export const dynamic = "force-dynamic";

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

  // Return cached actions if available
  const cached = await prisma.actionCache.findUnique({
    where: { surveyId_language: { surveyId: survey.id, language: locale } },
  });
  if (cached) {
    try {
      const actions = JSON.parse(cached.actionsJson);
      return NextResponse.json({ actions });
    } catch {
      // fall through to regenerate if cache is corrupted
    }
  }

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
  });

  const responses = await prisma.response.findMany({
    where: { surveyId: survey.id },
    include: { user: true, question: true },
  });

  // Calculate engagement score
  const numericValues = responses
    .map((r) => r.valueNumeric)
    .filter((v) => typeof v === "number") as number[];
  const engagementScore = numericValues.length
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    : 0;

  // Calculate participation rate
  const respondents = new Set(responses.map((r) => r.userId));
  const participationRate = employees.length
    ? Math.round((respondents.size / employees.length) * 100)
    : 0;

  // Prepare ALL responses for AI analysis (with full context)
  const allResponses = responses.map((r) => ({
    userName: r.user.name || "Anonymous",
    questionText: r.question.text,
    valueNumeric: r.valueNumeric ?? undefined,
    valueText: r.valueText ?? undefined,
  }));

  // Find low score employees
  const userIdToScores = new Map<string, number[]>();
  const userIdToFeedback = new Map<string, string[]>();

  for (const r of responses) {
    if (typeof r.valueNumeric === "number") {
      const arr = userIdToScores.get(r.userId) || [];
      arr.push(r.valueNumeric);
      userIdToScores.set(r.userId, arr);
    }
    if (r.valueText && r.valueText.trim().length > 0) {
      const arr = userIdToFeedback.get(r.userId) || [];
      arr.push(r.valueText);
      userIdToFeedback.set(r.userId, arr);
    }
  }

  const lowScoreEmployees = employees
    .map((u) => {
      const scores = userIdToScores.get(u.id) || [];
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const feedback = userIdToFeedback.get(u.id)?.join("; ") || undefined;
      return { name: u.name || "Anonymous", score: avg, feedback };
    })
    .filter((e) => e.score !== null && e.score < 2.5)
    .map((e) => ({ name: e.name, score: e.score!, feedback: e.feedback }));

  // Get open feedback
  const openFeedback = responses
    .filter((r) => r.valueText && r.valueText.trim().length > 0)
    .map((r) => ({ userName: r.user.name || "Anonymous", text: r.valueText as string }));

  // Only generate AI recommendations if there are actual responses
  if (responses.length === 0) {
    return NextResponse.json({
      actions: [],
      message: "No survey responses yet. Actions will be generated once employees submit their responses."
    });
  }

  // Only generate if there's meaningful data (at least some numeric responses or feedback)
  const hasNumericResponses = numericValues.length > 0;
  const hasFeedback = openFeedback.length > 0;

  if (!hasNumericResponses && !hasFeedback) {
    return NextResponse.json({
      actions: [],
      message: "Insufficient data. Waiting for more survey responses."
    });
  }

  try {
    const config = await prisma.aIConfig.findUnique({ where: { key: "question_generation" } });
    const aiConfig = config ? {
      insightsPrompt: config.insightsPrompt ?? undefined
    } : undefined;

    const actionsFull = await generateActionRecommendations(
      engagementScore,
      participationRate,
      allResponses,
      lowScoreEmployees,
      openFeedback,
      weekNumber,
      year,
      aiConfig,
      locale
    );
    // Enforce exactly 3 direct actions, prefer 1 per priority (high/medium/low)
    const byPriority: Record<"high" | "medium" | "low", any[]> = { high: [], medium: [], low: [] };
    for (const a of actionsFull) {
      if (a.priority === "high" || a.priority === "medium" || a.priority === "low") {
        byPriority[a.priority].push(a);
      }
    }
    const selected: any[] = [];
    (["high", "medium", "low"] as const).forEach((p) => {
      if (byPriority[p].length > 0 && selected.length < 3) selected.push(byPriority[p][0]);
    });
    // If fewer than 3 (some priorities missing), fill from remaining in order
    if (selected.length < 3) {
      const remaining = [...byPriority.high.slice(1), ...byPriority.medium.slice(1), ...byPriority.low.slice(1), ...actionsFull];
      for (const a of remaining) {
        if (selected.length >= 3) break;
        if (!selected.includes(a)) selected.push(a);
      }
    }
    const actions = selected.slice(0, 3);

    // Cache result
    await prisma.actionCache.upsert({
      where: { surveyId_language: { surveyId: survey.id, language: locale } },
      update: { actionsJson: JSON.stringify(actions) },
      create: { surveyId: survey.id, language: locale, actionsJson: JSON.stringify(actions) },
    });

    return NextResponse.json({ actions });
  } catch (error: any) {
    console.error("Error generating action recommendations:", error);
    // Return empty actions instead of error if AI fails
    return NextResponse.json({
      actions: [],
      error: error.message || "Failed to generate actions",
      message: "AI action generation temporarily unavailable. Please try again later."
    });
  }
}

