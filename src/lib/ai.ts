import OpenAI from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
const baseURL = process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1';

// Default to a high-quality free/cheap model.
// If using Groq directly: llama-3.3-70b-versatile
// If using OpenRouter: meta-llama/llama-3.3-70b-instruct (often free/cheap)
const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    // OpenRouter specific headers
    defaultHeaders: process.env.OPENROUTER_API_KEY ? {
        'HTTP-Referer': 'https://pulsecheck.app',
        'X-Title': 'PulseCheck',
    } : undefined,
    dangerouslyAllowBrowser: true, // For client-side if needed, though this is server action mainly
});

async function getCompletion(prompt: string, jsonMode = false) {
    if (!apiKey) {
        console.error("❌ AI Config Error: Missing API Key. Ensure GROQ_API_KEY or OPENROUTER_API_KEY is set in Vercel Environment Variables.");
        throw new Error("AI API Key not configured");
    }

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: jsonMode ? { type: 'json_object' } : undefined,
            temperature: 0.8, // Slightly creative but focused
        });

        return response.choices[0].message.content || "";
    } catch (error) {
        console.error("AI Completion Error:", error);
        throw error;
    }
}

export async function generateWeeklyQuestions(
    weekNumber: number,
    year: number,
    config?: { questionPrompt?: string; focusAreas?: string[]; tone?: string; language?: string },
    recentQuestions: string[] = [],
    locale: 'nl' | 'en' | 'fr' = 'nl'
): Promise<Array<{ text: string; type: "SCALE_1_5" | "OPEN" }>> {

    const languageName = locale === 'nl' ? 'Dutch' : locale === 'fr' ? 'French' : 'English';

    const prompt = `
    You are an expert HR consultant designed to generate engaging, unique, and effectively worded employee survey questions in ${languageName}.
    
    ${config?.questionPrompt ? `EXTRA INSTRUCTIONS FROM USER: ${config.questionPrompt}` : ''}
    
    Current Context: Week ${weekNumber}, Year ${year}.

    Goal: Generate 3 survey questions for this week.
    - 2 Questions must be of type "SCALE_1_5"(Answered on a scale of 1 to 5).
    - 1 Question must be of type "OPEN"(Free text answer).

        Constraints:
    1. Language: ${languageName}.
    2. Uniqueness: DO NOT repeat any of the following recent questions: ${JSON.stringify(recentQuestions)}. valid questions must be distinct.
    3. Tone: ${config?.tone || 'Professional yet approachable'}.
    4. Focus Areas: ${config?.focusAreas?.join(', ') || 'General engagement, well-being, workload'}.
    5. Length: Keep questions concise(max 15 - 20 words).
    
    Output Format:
    Return ONLY a valid JSON object with a "questions" key containing an array of objects.
        Example:
    {
        "questions": [
            { "text": "...", "type": "SCALE_1_5" },
            { "text": "...", "type": "SCALE_1_5" },
            { "text": "...", "type": "OPEN" }
        ]
    }
    `;

    try {
        const result = await getCompletion(prompt, true);
        const parsed = JSON.parse(result);
        const questions = parsed.questions || [];

        // Retention Question Injection (Every week for now to build data fast, or randomized)
        // Check if we already have a similar question, if not ADD it.
        // We want this specific wording for our churn model to detect it easily.
        const retentionQuestion = locale === 'nl'
            ? "Zie je jezelf hier over een jaar nog werken?"
            : "Do you see yourself working here in a year?";

        // Replace the last SCALE_1_5 question or add if space? 
        // Let's just ensure it's in there replacing the last generated SCALE question to keep count at 3 usually.
        // Or simply append it? The UI should handle 4 questions fine.
        // Let's replace one to keep survey short, but maybe rotating it is better.
        // For this task, let's force it as the 3rd question (SCALE) if not present.

        // Actually, simplest strategy: 
        // 1. Scale
        // 2. Retention (Special Scale)
        // 3. Open

        if (questions.length >= 2) {
            questions[1] = {
                text: retentionQuestion,
                type: 'SCALE_1_5'
            };
        } else {
            questions.push({
                text: retentionQuestion,
                type: 'SCALE_1_5'
            });
        }

        return questions;
    } catch (e) {
        console.error("Failed to generate questions", e);
        // Fallback
        return [
            { text: locale === 'nl' ? "Hoe is je werkdruk deze week?" : "How was your workload this week?", type: "SCALE_1_5" },
            { text: locale === 'nl' ? "Ben je tevreden over de sfeer?" : "Are you happy with the atmosphere?", type: "SCALE_1_5" },
            { text: locale === 'nl' ? "Wat kan er beter volgende week?" : "What can be improved next week?", type: "OPEN" }
        ];
    }
}

export async function generateActionRecommendations(
    engagementScore: number,
    participationRate: number,
    allResponses: Array<{ userName: string; questionText: string; valueNumeric?: number; valueText?: string }>,
    lowScoreEmployees: Array<{ name: string; score: number; feedback?: string }>,
    openFeedback: Array<{ userName: string; text: string }>,
    weekNumber: number,
    year: number,
    config?: { insightsPrompt?: string },
    locale: 'nl' | 'en' | 'fr' = 'nl'
): Promise<Array<{ title: string; description: string; priority: "high" | "medium" | "low"; category: string }>> {

    const languageName = locale === 'nl' ? 'Dutch' : locale === 'fr' ? 'French' : 'English';

    // Aggregate anonymous data for the prompt to protect privacy while giving context
    const lowScorersContext = lowScoreEmployees.map(e => `(Anonymous) Score: ${e.score}, Feedback: ${e.feedback || 'None'} `).join('\n');
    const feedbackContext = openFeedback.map(f => `"${f.text}"`).join('\n');

    const prompt = `
    You are a senior HR strategist.Analyze the following employee survey data for Week ${weekNumber}, ${year}.

    ${config?.insightsPrompt ? `EXTRA INSTRUCTIONS FROM USER: ${config.insightsPrompt}` : ''}
    
    Metrics:
    - Engagement Score: ${engagementScore}/5
        - Participation Rate: ${participationRate}%

            Qualitative Data(Anonymized):
    - Low Score Signals:
    ${lowScorersContext}

    - Open Feedback:
    ${feedbackContext}

    Task:
    Generate 4 - 6 concrete, actionable recommendations for the HR manager.
    - Actions must be specific to the feedback provided.
    - Prioritize "high" for urgent issues(low scores, alarming feedback).
    - Language: ${languageName}.
    
    Output Format:
    JSON object with key "actions":
    {
        "actions": [
            {
                "title": "Action Title",
                "description": "Detailed description of what to do and why.",
                "priority": "high" | "medium" | "low",
                "category": "Category Name (e.g. Well-being, Management)"
            }
        ]
    }
    `;

    try {
        const result = await getCompletion(prompt, true);
        const parsed = JSON.parse(result);
        return parsed.actions || [];
    } catch (e) {
        console.error("Failed to generate actions", e);
        return [];
    }
}

export async function generateCompanyInsight(
    teamResponses: Array<{ employeeName: string; responses: Array<{ questionText: string; valueNumeric?: number; valueText?: string }> }>,
    weekNumber: number,
    year: number,
    locale: 'nl' | 'en' | 'fr' = 'nl'
): Promise<string> {
    const languageName = locale === 'nl' ? 'Dutch' : locale === 'fr' ? 'French' : 'English';
    const flattenedResponses = teamResponses.flatMap(tr => tr.responses.map(r => `${r.questionText}: ${r.valueNumeric || r.valueText} `));

    const prompt = `
    Analyze these survey responses for Week ${weekNumber}, ${year}.

    Responses:
    ${flattenedResponses.join('\n')}
    
    Provide a concise, strategic executive summary(3 - 5 sentences) of the company sentiment.Identify key themes, strengths, and risks.
        Language: ${languageName}.
    Output: Plain text only.
    `;

    return await getCompletion(prompt);
}

// Keeping this for compatibility, but it might be deprecated if we only use company insights
export async function generateTeamInsights(
    teamResponses: any[],
    weekNumber: number,
    year: number,
    locale: 'nl' | 'en' | 'fr' = 'nl'
): Promise<string> {
    return generateCompanyInsight(teamResponses, weekNumber, year, locale);
}

export async function generateEmployeeInsights(
    employeeName: string,
    responses: Array<{ questionText: string; valueNumeric?: number; valueText?: string }>,
    weekNumber: number,
    year: number,
    locale: 'nl' | 'en' | 'fr' = 'nl'
): Promise<string> {
    const languageName = locale === 'nl' ? 'Dutch' : locale === 'fr' ? 'French' : 'English';
    const respText = responses.map(r => `${r.questionText}: ${r.valueNumeric || r.valueText} `).join('\n');

    const prompt = `
    Analyze the survey responses for this employee(Week ${weekNumber}, ${year}).

        Responses:
    ${respText}
    
    Provide a short, specific insight about this employee's engagement state. Mention if they seem at risk or doing well.
    Language: ${languageName}.
    Output: Plain text only.
    `;

    return await getCompletion(prompt);
}
