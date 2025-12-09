/**
 * Environment variable validation utility.
 * This module validates required environment variables at build/startup time.
 * If any required variable is missing, the build will fail immediately.
 */

function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(
            `❌ Missing required environment variable: ${key}\n` +
            `Please add it to your .env file or Vercel environment settings.`
        );
    }
    return value;
}

function getOptionalEnv(key: string, fallback?: string): string | undefined {
    return process.env[key] || fallback;
}

/**
 * Environment configuration object.
 * Required variables will throw if missing.
 * Optional variables will return undefined or fallback value.
 */
export const env = {
    // Database (Required)
    DATABASE_URL: getRequiredEnv("DATABASE_URL"),

    // NextAuth (Required)
    NEXTAUTH_SECRET: getRequiredEnv("NEXTAUTH_SECRET"),
    NEXTAUTH_URL: getOptionalEnv("NEXTAUTH_URL", "http://localhost:3000"),
    NEXT_PUBLIC_APP_URL: getOptionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

    // AI Provider (At least one required for AI features)
    GROQ_API_KEY: getOptionalEnv("GROQ_API_KEY"),
    OPENROUTER_API_KEY: getOptionalEnv("OPENROUTER_API_KEY"),

    // Sentiment Analysis (Optional)
    HUGGINGFACE_API_KEY: getOptionalEnv("HUGGINGFACE_API_KEY"),

    // Derived values
    get AI_API_KEY(): string | undefined {
        return this.OPENROUTER_API_KEY || this.GROQ_API_KEY;
    },

    get AI_BASE_URL(): string {
        return this.OPENROUTER_API_KEY
            ? "https://openrouter.ai/api/v1"
            : "https://api.groq.com/openai/v1";
    },
};

// Validate AI configuration at startup
if (!env.AI_API_KEY) {
    console.warn(
        "⚠️ Warning: No AI API key configured (GROQ_API_KEY or OPENROUTER_API_KEY).\n" +
        "AI features (question generation, insights) will not work."
    );
}
