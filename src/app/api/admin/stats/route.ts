import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
    const authUser = await getAuthUser();
    const role = authUser?.role?.toLowerCase();

    if (role !== "hr_manager" && role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const [totalResponses, totalQuestions, totalUsers, recentResponses] = await Promise.all([
            prisma.response.count(),
            prisma.question.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.response.findMany({
                take: 10,
                orderBy: { submittedAt: 'desc' },
                include: {
                    user: { select: { id: true } },
                    question: { select: { text: true } }
                }
            })
        ]);

        return NextResponse.json({
            totalResponses,
            totalQuestions,
            totalUsers,
            recentResponses: recentResponses.map(r => ({
                submittedAt: r.submittedAt.toISOString(),
                userName: `Employee #${r.user.id.slice(0, 8)}`,
                questionText: r.question.text.slice(0, 50) + (r.question.text.length > 50 ? '...' : '')
            }))
        });
    } catch (error: any) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
