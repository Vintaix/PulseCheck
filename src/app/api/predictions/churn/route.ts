import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { calculateChurnRisk, ChurnRisk } from '@/lib/churn';

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile with company info
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, company_id")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.role !== "HR_MANAGER" && profile.role?.toLowerCase() !== "hr_manager" && profile.role?.toLowerCase() !== "admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!profile.company_id) {
            return NextResponse.json({ error: "No company assigned" }, { status: 400 });
        }

        // Fetch Users and their *recent* responses - FILTERED BY COMPANY
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const users = await prisma.user.findMany({
            where: {
                role: 'EMPLOYEE',
                companyId: profile.company_id  // Multi-tenant filtering
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
                    entityName: user.name || "Anonymous",
                    numericScores,
                    numericDetails,
                    textResponses
                }, 'USER');
                userRisks.push(risk);
            }

            // Aggregate for Department
            const dept = user.department || 'General';
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
