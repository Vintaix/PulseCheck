
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming prisma is exported from here
import { calculateChurnRisk, ChurnRisk } from '@/lib/churn';

export async function GET(_request: Request) {
    try {
        // 1. Fetch Users and their *recent* responses
        // Limit to last 4 weeks for relevance?
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const users = await prisma.user.findMany({
            where: {
                role: 'EMPLOYEE'
            },
            include: {
                responses: {
                    where: {
                        submittedAt: {
                            gte: fourWeeksAgo
                        }
                    },
                    include: {
                        question: true
                    }
                }
            }
        });

        const userRisks: ChurnRisk[] = [];

        // Group by Department
        const departmentData: Record<string, { numericDetails: { questionText: string, score: number }[], text: string[] }> = {};

        for (const user of users) {
            const numericDetails: { questionText: string, score: number }[] = [];
            const textResponses: string[] = [];

            for (const r of user.responses) {
                if (r.question.type === 'SCALE_1_5' && r.valueNumeric !== null) {
                    numericDetails.push({
                        questionText: r.question.text,
                        score: r.valueNumeric
                    });
                } else if (r.question.type === 'OPEN' && r.valueText) {
                    textResponses.push(r.valueText);
                }
            }

            // Calculate Individual Risk
            if (numericDetails.length > 0 || textResponses.length > 0) {
                const numericScores = numericDetails.map(n => n.score);
                const risk = await calculateChurnRisk({
                    entityName: user.name,
                    numericScores, // Keep for backward compat if logic uses it (it creates it from details now?)
                    // Wait, logic now IGNORES numericScores arg in my previous edit? 
                    // Let's look at churn.ts again.
                    // I removed numericScores usage? No, I added numericDetails but kept numericScores in signature?
                    // Let's check signature in churn.ts.
                    // It has both. I should provide both or remove simple one.
                    // The error said `numericDetails` is missing.
                    numericDetails,
                    textResponses
                }, 'USER');
                userRisks.push(risk);
            }

            // Aggregate for Department
            // user.department might trigger lint if schema update not recognized, but it's valid code.
            const dept = (user as any).department || 'General';
            if (!departmentData[dept]) {
                departmentData[dept] = { numericDetails: [], text: [] };
            }
            departmentData[dept].numericDetails.push(...numericDetails);
            departmentData[dept].text.push(...textResponses);
        }

        // Calculate Department Risks
        const departmentRisks: ChurnRisk[] = [];
        for (const [dept, data] of Object.entries(departmentData)) {
            if (data.numericDetails.length > 0 || data.text.length > 0) {
                const numericScores = data.numericDetails.map(n => n.score);
                const risk = await calculateChurnRisk({
                    entityName: dept,
                    numericScores,
                    numericDetails: data.numericDetails,
                    textResponses: data.text
                }, 'DEPARTMENT');
                departmentRisks.push(risk);
            }
        }

        return NextResponse.json({
            userRisks: userRisks.sort((a, b) => b.riskScore - a.riskScore),
            departmentRisks: departmentRisks.sort((a, b) => b.riskScore - a.riskScore)
        });

    } catch (error) {
        console.error("Error generating churn predictions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
