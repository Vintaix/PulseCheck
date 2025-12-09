import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "HR_MANAGER") {
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
                    user: { select: { name: true } },
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
                userName: r.user.name,
                questionText: r.question.text.slice(0, 50) + (r.question.text.length > 50 ? '...' : '')
            }))
        });
    } catch (error: any) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
