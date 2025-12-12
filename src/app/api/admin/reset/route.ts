import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const authUser = await getAuthUser();
    const secretKey = req.headers.get("x-admin-key");
    const ADMIN_PASSWORD = "PulseAdmin2024!"; // Matching the login page secret

    // Allow if session is HR_MANAGER OR if the secret key matches
    const role = authUser?.role?.toLowerCase();
    const isAuthorized =
        (role === "hr_manager" || role === "admin") ||
        (secretKey === ADMIN_PASSWORD);

    if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Delete in order to respect foreign key constraints
        await prisma.$transaction([
            prisma.response.deleteMany(),
            prisma.actionCache.deleteMany(),
            prisma.insight.deleteMany(),
            prisma.weeklySentiment.deleteMany(),
            prisma.survey.deleteMany(),
            prisma.question.deleteMany(),
            // Keep users and AI config
        ]);

        return NextResponse.json({
            success: true,
            message: "Database reset successful. Survey data, responses, and insights have been cleared."
        });
    } catch (error: any) {
        console.error("Error resetting database:", error);
        return NextResponse.json({ error: error.message || "Failed to reset database" }, { status: 500 });
    }
}
