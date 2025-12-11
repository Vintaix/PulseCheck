import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role?.toLowerCase();

    if (role !== "hr_manager" && role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Get last 8 weeks of survey data for history
        const surveys = await prisma.survey.findMany({
            orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
            take: 8,
            include: {
                responses: {
                    where: {
                        valueNumeric: { not: null }
                    }
                }
            }
        });

        // Calculate engagement history
        const history = surveys.map(survey => {
            const numericResponses = survey.responses.filter(r => r.valueNumeric !== null);
            const avgScore = numericResponses.length > 0
                ? numericResponses.reduce((sum, r) => sum + (r.valueNumeric || 0), 0) / numericResponses.length
                : 0;
            return {
                name: `W${survey.weekNumber}`,
                score: Math.round(avgScore * 10) / 10,
                weekNumber: survey.weekNumber,
                year: survey.year
            };
        }).reverse();

        // Get total responses
        const totalResponses = await prisma.response.count();

        // Get unique users who responded
        const uniqueRespondents = await prisma.response.findMany({
            select: { userId: true },
            distinct: ['userId']
        });

        // Get total employees
        const totalEmployees = await prisma.user.count({
            where: { role: 'EMPLOYEE' }
        });

        // Calculate participation rate
        const participationRate = totalEmployees > 0
            ? Math.round((uniqueRespondents.length / totalEmployees) * 100)
            : 0;

        // Get current/latest score
        const latestSurvey = history.length > 0 ? history[history.length - 1] : null;
        const currentScore = latestSurvey?.score || 0;

        // Get open feedback for sentiment keywords (basic word extraction)
        const openResponses = await prisma.response.findMany({
            where: {
                valueText: { not: null }
            },
            select: {
                valueText: true
            },
            take: 50,
            orderBy: { submittedAt: 'desc' }
        });

        // Extract simple keywords from open responses
        const allText = openResponses
            .map(r => r.valueText || '')
            .join(' ')
            .toLowerCase();

        // Simple word frequency for keywords (stopwords removed)
        const stopwords = ['de', 'het', 'en', 'van', 'in', 'een', 'is', 'dat', 'op', 'te', 'voor', 'met', 'zijn', 'er', 'naar', 'ook', 'aan', 'om', 'als', 'kan', 'dit', 'maar', 'bij', 'wordt', 'door', 'nog', 'of', 'wel', 'niet', 'meer', 'al', 'ze', 'je', 'ik', 'we', 'the', 'and', 'to', 'a', 'of', 'is', 'in', 'it', 'that', 'for', 'on'];
        const words = allText.split(/\s+/).filter(w => w.length > 3 && !stopwords.includes(w));
        const wordFreq: Record<string, number> = {};
        words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });

        // Get top 7 keywords
        const topKeywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([word]) => ({
                word: word.charAt(0).toUpperCase() + word.slice(1),
                sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
            }));

        return NextResponse.json({
            history,
            totalResponses,
            participationRate,
            currentScore,
            keywords: topKeywords.length > 0 ? topKeywords : null
        });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
