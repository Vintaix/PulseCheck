import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "question_generation";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "HR_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let config = await prisma.aIConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (!config) {
      // Create default config with improved prompt for uniqueness
      config = await prisma.aIConfig.create({
        data: {
          key: CONFIG_KEY,
          questionPrompt: "Je bent een creatieve HR expert die UNIEKE, gevarieerde wekelijkse engagement vragen maakt voor een Vlaamse KMO.\n\nBELANGRIJK: Je moet ALTIJD volledig nieuwe, unieke vragen genereren. NOOIT dezelfde vragen herhalen!\n\nGenereer 3 VOLLEDIG UNIEKE vragen:\n- 2 vragen van type SCALE_1_5 (schaal 1-5): korte, duidelijke vragen\n- 1 vraag van type OPEN: een open vraag voor feedback\n\nDe vragen moeten:\n- VOLLEDIG UNIEK zijn (geen herhaling van eerdere vragen)\n- Relevant zijn voor een wekelijkse check-in\n- Kort en duidelijk zijn (max 15 woorden voor schaalvragen)\n- In het Nederlands zijn\n- Creatief en gevarieerd zijn\n- Verschillende aspecten van engagement verkennen\n- Specifiek en actiegericht zijn (niet generiek!)",
          tone: "professioneel",
          language: "Nederlands",
          insightsPrompt: "Genereer specifieke, uitvoerbare inzichten op basis van de enquête-antwoorden. Vermijd generiek advies. Focus op concrete stappen die de HR-manager kan ondernemen. Wees specifiek over patronen en trends in de data.",
        },
      });
    }

    return NextResponse.json({
      questionPrompt: config.questionPrompt,
      focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
      tone: config.tone,
      language: config.language,
      insightsPrompt: config.insightsPrompt || "",
    });
  } catch (error: any) {
    console.error("Error in AI config GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { questionPrompt, focusAreas, tone, language, insightsPrompt } = body;

  const config = await prisma.aIConfig.upsert({
    where: { key: CONFIG_KEY },
    update: {
      questionPrompt: questionPrompt || undefined,
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : undefined,
      tone: tone || undefined,
      language: language || undefined,
      insightsPrompt: insightsPrompt || undefined,
    },
    create: {
      key: CONFIG_KEY,
      questionPrompt: questionPrompt || "Je bent een HR expert die wekelijkse engagement vragen maakt voor een Vlaamse KMO. Genereer 3 vragen: 2 SCALE_1_5 vragen en 1 OPEN vraag. De vragen moeten relevant, kort en duidelijk zijn, en variëren per week.",
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : null,
      tone: tone || "professioneel",
      language: language || "Nederlands",
      insightsPrompt: insightsPrompt || null,
    },
  });

  return NextResponse.json({
    questionPrompt: config.questionPrompt,
    focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
    tone: config.tone,
    language: config.language,
    insightsPrompt: config.insightsPrompt || "",
  });
}
