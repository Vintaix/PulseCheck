import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET() {
    const authUser = await getAuthUser();
    const role = authUser?.role?.toLowerCase();

    if (role !== "hr_manager" && role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const config = await prisma.aIConfig.findUnique({
            where: { key: "question_generation" }
        });

        return NextResponse.json({
            frequency: config?.pulseFrequency || "weekly"
        });
    } catch (error: any) {
        console.error("Error fetching pulse config:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const authUser = await getAuthUser();
    const role = authUser?.role?.toLowerCase();

    if (role !== "hr_manager" && role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const frequency = body.frequency;

        if (!["weekly", "biweekly", "monthly"].includes(frequency)) {
            return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
        }

        await prisma.aIConfig.upsert({
            where: { key: "question_generation" },
            update: { pulseFrequency: frequency },
            create: {
                key: "question_generation",
                pulseFrequency: frequency
            }
        });

        return NextResponse.json({ success: true, frequency });
    } catch (error: any) {
        console.error("Error updating pulse config:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
