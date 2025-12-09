import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "HR_MANAGER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Get last 8 weeks of survey data for prediction
        const surveys = await prisma.survey.findMany({
            orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
            take: 8,
            include: {
                responses: {
                    where: { valueNumeric: { not: null } }
                }
            }
        });

        if (surveys.length < 2) {
            return NextResponse.json({
                hasPrediction: false,
                message: "Not enough data for prediction. Need at least 2 weeks of data."
            });
        }

        // Calculate historical scores
        const history = surveys.map(survey => {
            const numericResponses = survey.responses.filter(r => r.valueNumeric !== null);
            const avgScore = numericResponses.length > 0
                ? numericResponses.reduce((sum, r) => sum + (r.valueNumeric || 0), 0) / numericResponses.length
                : 0;
            return {
                weekNumber: survey.weekNumber,
                year: survey.year,
                score: avgScore,
                responseCount: numericResponses.length
            };
        }).reverse();

        // Simple prediction algorithm using weighted moving average with trend
        const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // More recent weeks weighted higher
        const recentScores = history.slice(-Math.min(5, history.length)).map(h => h.score);

        let weightedSum = 0;
        let weightSum = 0;
        for (let i = 0; i < recentScores.length; i++) {
            const weight = weights[i] || 0.2;
            weightedSum += recentScores[i] * weight;
            weightSum += weight;
        }
        const movingAverage = weightedSum / weightSum;

        // Calculate trend (difference between last 2 weeks)
        const lastScore = recentScores[recentScores.length - 1] || 0;
        const prevScore = recentScores[recentScores.length - 2] || lastScore;
        const trend = lastScore - prevScore;

        // Predict next week's score with trend momentum
        let predictedScore = movingAverage + (trend * 0.5);
        // Clamp between 1 and 5
        predictedScore = Math.max(1, Math.min(5, predictedScore));

        // Calculate confidence based on data consistency
        const scores = recentScores;
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);

        // Lower variance = higher confidence
        let confidence: 'high' | 'medium' | 'low';
        if (standardDeviation < 0.3 && surveys.length >= 4) {
            confidence = 'high';
        } else if (standardDeviation < 0.6 || surveys.length >= 3) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }

        // Identify key factors
        const factors: string[] = [];
        if (trend > 0.2) {
            factors.push("Recent upward momentum is positive");
        } else if (trend < -0.2) {
            factors.push("Recent downward trend may continue");
        }

        if (history.length > 0 && history[history.length - 1].responseCount < 5) {
            factors.push("Low response count may affect accuracy");
        }

        if (standardDeviation > 0.5) {
            factors.push("High variability in recent scores");
        }

        if (predictedScore >= 4) {
            factors.push("Team engagement is strong");
        } else if (predictedScore < 3) {
            factors.push("Consider proactive engagement measures");
        }

        // Get current week info
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const currentWeek = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

        return NextResponse.json({
            hasPrediction: true,
            predictedScore: Math.round(predictedScore * 10) / 10,
            confidence,
            trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
            trendValue: Math.round(trend * 100) / 100,
            factors: factors.slice(0, 3), // Top 3 factors
            forWeek: currentWeek + 1,
            basedOnWeeks: history.length
        });
    } catch (error: any) {
        console.error("Error generating prediction:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate prediction" },
            { status: 500 }
        );
    }
}
