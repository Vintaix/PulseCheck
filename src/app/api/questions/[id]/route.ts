import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = params.id;
  const body = await req.json();
  const { text, type, isActive } = body || {};

  if (typeof isActive === "boolean" && isActive) {
    const countActive = await prisma.question.count({ where: { isActive: true, NOT: { id } } });
    if (countActive >= 3) return NextResponse.json({ error: "Max 3 actieve vragen" }, { status: 400 });
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...(text !== undefined ? { text } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    // First, check if question exists
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if question has responses
    const responseCount = await prisma.response.count({
      where: { questionId: id },
    });

    // Delete responses first if they exist
    if (responseCount > 0) {
      await prisma.response.deleteMany({
        where: { questionId: id },
      });
    }

    // Delete the question
    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedResponses: responseCount });
  } catch (error: any) {
    console.error("Error deleting question:", error);

    // Handle Prisma errors
    if (error.code === "P2003" || error.code === "P2025") {
      // Foreign key constraint or record not found
      try {
        // Try to delete responses first
        await prisma.response.deleteMany({
          where: { questionId: id },
        });
        // Then try to delete question again
        await prisma.question.delete({
          where: { id },
        });
        return NextResponse.json({ success: true });
      } catch (retryError: any) {
        console.error("Retry error:", retryError);
        return NextResponse.json(
          { error: "Kon vraag niet verwijderen. Mogelijk zijn er nog responses gekoppeld." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      error: error.message || "Failed to delete question",
      details: process.env.NODE_ENV === "development" ? error.toString() : undefined
    }, { status: 500 });
  }
}


