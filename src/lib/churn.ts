
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/nlptown/bert-base-multilingual-uncased-sentiment";
// Remove static key const
// const HF_API_KEY = process.env.HUGGINGFACE_API_KEY; 

type SentimentResult = {
    label: string; // "1 star" to "5 stars"
    score: number;
}[];

async function getSentiment(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 3; // Neutral default

    try {
        const apiKey = process.env.HUGGINGFACE_API_KEY;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const response = await fetch(HF_API_URL, {
            headers,
            method: "POST",
            body: JSON.stringify({ inputs: text }),
        });

        if (!response.ok) {
            // Handle rate limits or errors gracefully
            console.warn("HF API Error", await response.text());
            return 3; // Neutral
        }

        const result = (await response.json()) as SentimentResult[];
        // Result is approx [[{label: '5 stars', score: 0.8}, ...]]
        // We want to map stars to 1-5 scale.
        // The API returns a list of probabilities for each label. We usually take the top one.
        // Actually, for this model, it returns a list of objects in the first array element.

        // Let's assume simplest: get the label with highest score.
        // But often the output is just a flat array of objects if input is single string? 
        // Let's safe-guard.
        const best = (result as any)?.[0]?.[0] || (result as any)?.[0];
        if (!best) return 3;

        const label = best.label; // "1 star", "2 stars"...
        const stars = parseInt(label.split(' ')[0]);
        return isNaN(stars) ? 3 : stars;

    } catch (e) {
        console.error("Sentiment check failed", e);
        return 3;
    }
}

export type ChurnRisk = {
    entity: string; // User Name or Department Name
    type: 'USER' | 'DEPARTMENT';
    riskScore: number; // 0-100 (High is bad)
    sentimentLabel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Healthy';
    details: string; // "Low engagement scores", "Negative text feedback"
};

export async function calculateChurnRisk(
    data: {
        entityName: string;
        numericScores: number[];
        textResponses: string[];
        // We need question text to identify retention questions, but currently we only receive scores.
        // To fix this without breaking API signature too much, let's assume `numericScores` might need context 
        // OR we can't do it purely on `numericScores` array. 
        // We need an array of { question: string, score: number }.
        // BUT, looking at the call site in `route.ts`, we passed raw arrays.
        // We need to update the function signature.
        numericDetails: { questionText: string, score: number }[];
    },
    type: 'USER' | 'DEPARTMENT'
): Promise<ChurnRisk> {

    // Retention Keywords
    const retentionKeywords = ["working here in a year", "jaar nog werken", "looking for new job", "ander werk zoeken"];
    const isRetentionQuestion = (text: string) => retentionKeywords.some(k => text.toLowerCase().includes(k));

    let totalWeightedScore = 0;
    let totalMaxScore = 0;

    // 1. Calculate Numeric Score with Weights
    for (const item of data.numericDetails) {
        const weight = isRetentionQuestion(item.questionText) ? 3.0 : 1.0;
        totalWeightedScore += item.score * weight;
        totalMaxScore += 5 * weight;
    }

    // Normalized Numeric Score (0-1) where 1 is BEST (5/5)
    const numericNormalized = totalMaxScore > 0 ? totalWeightedScore / totalMaxScore : 0.6; // Default to neutral/slightly pos if no data

    // 2. Text Sentiment (Standard Weight 1.0 per comment for now)
    let sentimentSum = 0;
    for (const text of data.textResponses) {
        sentimentSum += await getSentiment(text);
    }
    // Text Normalized (0-1)
    const sentimentNormalized = data.textResponses.length > 0 ? (sentimentSum / (data.textResponses.length * 5)) : 0.6;


    // Combine
    // If we have specific retention data (numeric), give it huge influence.
    const hasRetentionData = data.numericDetails.some(d => isRetentionQuestion(d.questionText));

    // Weight between Numeric and Text
    // If we have Retention Q, Numeric > Text
    const numericWeight = hasRetentionData ? 0.7 : 0.5;
    const textWeight = 1 - numericWeight;

    const finalGoodness = (numericNormalized * numericWeight) + (sentimentNormalized * textWeight); // 0..1

    // Risk Score: 1.0 Goodness = 0 Risk. 0.0 Goodness = 100 Risk.
    const riskScore = Math.max(0, Math.min(100, Math.round((1 - finalGoodness) * 100)));

    let label: ChurnRisk['sentimentLabel'] = 'Healthy';
    if (riskScore > 80) label = 'Critical';
    else if (riskScore > 60) label = 'High';
    else if (riskScore > 40) label = 'Medium';
    else if (riskScore > 20) label = 'Low';

    const factorCount = data.numericDetails.length + data.textResponses.length;

    return {
        entity: data.entityName,
        type,
        riskScore,
        sentimentLabel: label,
        details: `Based on ${factorCount} factors. ${hasRetentionData ? "Includes weighted retention indicators." : ""}`
    };
}
