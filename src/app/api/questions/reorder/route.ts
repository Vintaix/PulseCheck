import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const authUser = await getAuthUser();
    const role = authUser?.role?.toLowerCase();
    if (role !== "hr_manager" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { questions } = body;

    if (!Array.isArray(questions)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    try {
        await prisma.$transaction(
            questions.map((q: any) =>
                prisma.question.update({
                    where: { id: q.id },
                    data: { order: q.order }
                })
            )
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reorder failed", error);
        return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
    }
}
