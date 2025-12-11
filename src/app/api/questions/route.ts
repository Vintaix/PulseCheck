import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const questions = await prisma.question.findMany({ orderBy: [{ order: "asc" }, { text: "asc" }] });
  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role?.toLowerCase();
  if (role !== "hr_manager" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { text, type, isActive } = body || {};
  if (!text || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (isActive) {
    const countActive = await prisma.question.count({ where: { isActive: true } });
    if (countActive >= 3) return NextResponse.json({ error: "Max 3 actieve vragen" }, { status: 400 });
  }
  const q = await prisma.question.create({ data: { text, type, isActive: Boolean(isActive) } });
  return NextResponse.json(q, { status: 201 });
}
