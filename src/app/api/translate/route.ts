import { NextResponse } from "next/server";
import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY;
const client = apiKey ? new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
}) : null;

export async function POST(req: Request) {
    try {
        const { text, targetLanguage } = await req.json();

        if (!text || !targetLanguage) {
            return NextResponse.json({ error: "Missing text or targetLanguage" }, { status: 400 });
        }

        if (!client) {
            return NextResponse.json({ error: "Translation service not configured" }, { status: 500 });
        }

        // Map language codes to full names
        const languageNames: Record<string, string> = {
            'nl': 'Dutch',
            'en': 'English',
            'fr': 'French'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        // If target is English and text is already in English, return as-is
        if (targetLanguage === 'en') {
            return NextResponse.json({ translatedText: text });
        }

        const prompt = `Translate the following text to ${targetLangName}. 
Keep the same tone and formatting. Only output the translated text, nothing else.

Text to translate:
${text}`;

        const response = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3, // Lower temperature for more accurate translations
        });

        const translatedText = response.choices[0].message.content || text;

        return NextResponse.json({ translatedText: translatedText.trim() });
    } catch (error: any) {
        console.error("Translation error:", error);
        return NextResponse.json({ error: error.message || "Translation failed" }, { status: 500 });
    }
}
