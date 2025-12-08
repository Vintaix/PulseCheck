"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAISettings() {
    try {
        const config = await prisma.aIConfig.findFirst();
        if (config) {
            return {
                systemPrompt: config.questionPrompt,
                focusAreas: config.focusAreas ? JSON.parse(config.focusAreas) : [],
                temperature: 1.2 // Not in DB currently, default to 1.2
            };
        }
        return {
            systemPrompt: "Je bent een empathische en inzichtelijke HR-coach...",
            focusAreas: [],
            temperature: 1.2
        };
    } catch (error) {
        console.error("Failed to fetch AI settings:", error);
        return {
            systemPrompt: "Je bent een empathische en inzichtelijke HR-coach...",
            focusAreas: [],
            temperature: 1.2
        };
    }
}

export async function saveAISettings(settings: { systemPrompt: string; focusAreas: string[] }) {
    try {
        // Check if config exists
        const existing = await prisma.aIConfig.findFirst();

        if (existing) {
            await prisma.aIConfig.update({
                where: { id: existing.id },
                data: {
                    questionPrompt: settings.systemPrompt,
                    focusAreas: JSON.stringify(settings.focusAreas),
                    // Tone and language could be added to settings UI later
                }
            });
        } else {
            await prisma.aIConfig.create({
                data: {
                    key: "default", // Unique key
                    questionPrompt: settings.systemPrompt,
                    focusAreas: JSON.stringify(settings.focusAreas),
                }
            });
        }

        revalidatePath("/settings");
        revalidatePath("/admin/ai-config");
        return { success: true };
    } catch (error) {
        console.error("Failed to save settings:", error);
        return { success: false, error: "Failed to save settings" };
    }
}

export async function getPendingQuestions() {
    // Fetch active questions
    const questions = await prisma.question.findMany({
        where: { isActive: true },
        orderBy: { id: "desc" } // Or some other order
    });
    return questions;
}

export async function deleteQuestion(questionId: string) {
    try {
        // Check if question has responses
        const responseCount = await prisma.response.count({
            where: { questionId }
        });

        if (responseCount > 0) {
            // Soft delete (deactivate) if it has responses
            await prisma.question.update({
                where: { id: questionId },
                data: { isActive: false }
            });
        } else {
            // Hard delete if no responses
            await prisma.question.delete({ where: { id: questionId } });
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete question:", error);
        return { success: false, error: "Failed to delete question" };
    }
}

export async function forceRefreshAI() {
    try {
        // 1. Get current week/year to identify relevant cache
        const latestSurvey = await prisma.survey.findFirst({
            orderBy: { id: "desc" }
        });

        if (latestSurvey) {
            // Delete cached insights for this survey
            await prisma.insight.deleteMany({
                where: { surveyId: latestSurvey.id }
            });

            // Delete cached actions for this survey
            await prisma.actionCache.deleteMany({
                where: { surveyId: latestSurvey.id }
            });
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to refresh AI:", error);
        return { success: false, error: "Failed to refresh AI" };
    }
}

export async function testLLMConnection() {
    try {
        const { generateWeeklyQuestions } = await import("@/lib/ai");
        // Use a dummy call that doesn't save to DB, just tests API
        // We can't easily test without calling a real function, so we'll just try to generate 
        // a very small prompt or rely on the fact that if this throws, connection is bad.
        await generateWeeklyQuestions(1, 2024, { questionPrompt: "Test" }, [], 'nl');

        return { success: true, message: "Connection successful" };
    } catch (error: any) {
        console.error("LLM Connection Test Failed:", error);
        return { success: false, error: error.message || "Connection failed" };
    }
}

export async function forceGenerateQuestions() {
    try {
        const { getCurrentWeekAndYear } = await import("@/lib/week");
        const { weekNumber, year } = getCurrentWeekAndYear();

        // 1. Check if survey exists
        const survey = await prisma.survey.findUnique({
            where: { weekNumber_year: { weekNumber, year } }
        });

        if (!survey) {
            return { success: false, error: "No survey found for this week." };
        }

        // 2. Check for responses
        const responseCount = await prisma.response.count({
            where: { surveyId: survey.id }
        });

        if (responseCount > 0) {
            return { success: false, error: "Cannot regenerate: Responses already exist for this week." };
        }

        // 3. Archive existing active questions (soft delete) to avoid FK constraints
        await prisma.question.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });

        // 4. Generate new questions
        const { generateWeeklyQuestions } = await import("@/lib/ai");
        const { getAISettings } = await import("./actions"); // Self-import to get settings
        const settings = await getAISettings();

        const newQuestionsData = await generateWeeklyQuestions(weekNumber, year, {
            questionPrompt: settings.systemPrompt,
            focusAreas: settings.focusAreas,
            // Tone/Language not currently in settings but could be added
        }, [], 'nl');

        // 5. Save new questions
        for (const q of newQuestionsData) {
            await prisma.question.create({
                data: {
                    text: q.text,
                    type: q.type,
                    isActive: true
                }
            });
        }

        revalidatePath("/settings");
        revalidatePath("/survey"); // Also update survey page
        return { success: true };
    } catch (error: any) {
        console.error("Failed to regenerate questions:", error);
        return { success: false, error: error.message || "Failed to regenerate questions" };
    }
}
