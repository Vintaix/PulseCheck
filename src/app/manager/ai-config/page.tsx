"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Sparkles, Check, X, ArrowLeft } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useLocale } from "@/i18n/LocaleContext";
import Link from "next/link";

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('Failed to load config');
        throw error;
    }
    return res.json();
};

export default function AIConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    // Move all hooks to top level, unconditional
    const { locale } = useLocale();
    const t = messages[locale as keyof typeof messages] || messages.en;

    const { data: config, error: configError, mutate } = useSWR<{
        questionPrompt: string;
        focusAreas: string[];
        tone: string;
        language: string;
        insightsPrompt?: string;
    }>("/api/ai-config", fetcher, { revalidateOnFocus: false });

    const [questionPrompt, setQuestionPrompt] = useState("");
    const [focusAreas, setFocusAreas] = useState<string[]>([]);
    const [newFocusArea, setNewFocusArea] = useState("");
    const [tone, setTone] = useState("professioneel");
    const [language, setLanguage] = useState("Nederlands");
    const [insightsPrompt, setInsightsPrompt] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role === "HR_MANAGER" || profile?.role === "ADMIN") {
                // Auth success
            } else {
                router.replace("/survey");
            }
            setLoading(false);
        };
        checkAuth();
    }, [router]);

    useEffect(() => {
        if (config) {
            setQuestionPrompt(config.questionPrompt || "");
            setFocusAreas(config.focusAreas || []);
            setTone(config.tone || "professioneel");
            setLanguage(config.language || "Nederlands");
            setInsightsPrompt(config.insightsPrompt || "");
        }
    }, [config]);

    const addFocusArea = () => {
        if (newFocusArea.trim() && !focusAreas.includes(newFocusArea.trim())) {
            setFocusAreas([...focusAreas, newFocusArea.trim()]);
            setNewFocusArea("");
        }
    };

    const removeFocusArea = (area: string) => {
        setFocusAreas(focusAreas.filter((a) => a !== area));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/ai-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionPrompt,
                    focusAreas,
                    tone,
                    language,
                    insightsPrompt,
                }),
            });
            if (res.ok) {
                setSaved(true);
                mutate();
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error("Error saving config:", error);
        } finally {
            setSaving(false);
        }
    };

    const toneOptions = [
        { value: "professioneel", label: { nl: "Professioneel", en: "Professional", fr: "Professionnel" } },
        { value: "vriendelijk", label: { nl: "Vriendelijk", en: "Friendly", fr: "Amical" } },
        { value: "formeel", label: { nl: "Formeel", en: "Formal", fr: "Formel" } },
        { value: "informeel", label: { nl: "Informeel", en: "Informal", fr: "Informel" } },
        { value: "ondersteunend", label: { nl: "Ondersteunend", en: "Supportive", fr: "Bienveillant" } },
    ];

    const languageOptions = [
        { value: "Nederlands", label: "Nederlands" },
        { value: "Engels", label: "English" },
        { value: "Frans", label: "Français" },
    ];

    if (loading) return null; // Or meaningful loading spinner

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className="max-w-3xl mx-auto px-6 py-10">
                {/* Back Link */}
                <Link
                    href="/manager"
                    className="inline-flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Manager
                </Link>

                {/* Header */}
                <header className="mb-10 text-center animate-fade-in">
                    <div className="inline-flex items-center justify-center p-4 bg-primary/20 rounded-2xl mb-4">
                        <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">{t.aiConfig}</h1>
                    <p className="text-muted">{t.customizeAI}</p>
                </header>

                {configError ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="inline-flex items-center justify-center p-4 bg-danger/10 rounded-2xl mb-2">
                            <X className="w-7 h-7 text-danger" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Failed to load configuration</h3>
                        <p className="text-muted text-sm">There was an error loading the AI configuration. Please try again.</p>
                        <button
                            onClick={() => mutate()}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : !config ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Question Generation Section */}
                        <div className="glass-card p-6 animate-fade-in-delay-1">
                            <h2 className="font-semibold text-foreground mb-1">{t.questionGenerationTitle || "Question Generation AI"}</h2>
                            <p className="text-sm text-muted mb-4">{t.questionGenerationDesc || "Configure how the AI generates weekly survey questions."}</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">{t.systemPrompt}</label>
                                    <textarea
                                        value={questionPrompt}
                                        onChange={(e) => setQuestionPrompt(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-background-secondary border border-card-border rounded-xl text-foreground text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                                        placeholder={t.enterPrompt}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Insights AI Section */}
                        <div className="glass-card p-6 animate-fade-in-delay-2">
                            <h2 className="font-semibold text-foreground mb-1">{t.insightsAITitle || "Insights AI"}</h2>
                            <p className="text-sm text-muted mb-4">{t.insightsAIDesc || "Configure how the AI generates insights from survey responses."}</p>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">{t.insightsPrompt || "Insights System Prompt"}</label>
                                <textarea
                                    value={insightsPrompt}
                                    onChange={(e) => setInsightsPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-background-secondary border border-card-border rounded-xl text-foreground text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                                    placeholder={t.insightsPromptPlaceholder || "E.g., Generate actionable, specific insights..."}
                                />
                            </div>
                        </div>

                        {/* Focus Areas */}
                        <div className="glass-card p-6 animate-fade-in-delay-3">
                            <h2 className="font-semibold text-foreground mb-1">{t.focusAreas}</h2>
                            <p className="text-sm text-muted mb-4">{t.focusAreasDesc}</p>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newFocusArea}
                                    onChange={(e) => setNewFocusArea(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && addFocusArea()}
                                    placeholder={t.addFocusArea}
                                    className="flex-1 px-4 py-3 bg-background-secondary border border-card-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-primary"
                                />
                                <button
                                    onClick={addFocusArea}
                                    className="px-5 py-3 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-colors"
                                >
                                    {t.add}
                                </button>
                            </div>

                            {focusAreas.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {focusAreas.map((area, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-primary/20 text-primary rounded-xl text-sm font-medium"
                                        >
                                            {area}
                                            <button
                                                onClick={() => removeFocusArea(area)}
                                                className="hover:opacity-70 transition-opacity"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted italic text-sm">{t.noFocusAreas}</p>
                            )}
                        </div>

                        {/* Tone and Language */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card p-6">
                                <h2 className="font-medium text-foreground mb-4">{t.tone}</h2>
                                <div className="flex flex-wrap gap-2">
                                    {toneOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTone(opt.value)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tone === opt.value
                                                ? "bg-primary text-white border-primary"
                                                : "bg-transparent text-foreground border-card-border hover:border-primary/50"
                                                }`}
                                        >
                                            {opt.label[locale as keyof typeof opt.label] || opt.label.en}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h2 className="font-medium text-foreground mb-4">{t.language}</h2>
                                <div className="flex flex-wrap gap-2">
                                    {languageOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setLanguage(opt.value)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${language === opt.value
                                                ? "bg-primary text-white border-primary"
                                                : "bg-transparent text-foreground border-card-border hover:border-primary/50"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="sticky bottom-6 z-10 glass-card p-4 flex items-center justify-between">
                            <div>
                                {saved && (
                                    <div className="flex items-center gap-2 text-success">
                                        <Check className="w-5 h-5" />
                                        <span className="font-medium">{t.configSaved}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 transition-all min-w-[140px] glow-hover"
                            >
                                {saving ? t.saving : t.saveChanges}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
