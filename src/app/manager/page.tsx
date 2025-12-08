"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useLocale } from "@/i18n/LocaleContext";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

export default function ManagerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { locale } = useLocale();
    const t = messages[locale as keyof typeof messages] || messages.en;

    const isHR = (session?.user as any)?.role === "HR_MANAGER";

    useEffect(() => {
        if (status === "authenticated" && !isHR) router.replace("/survey");
    }, [status, isHR, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <header className="mb-12 animate-fade-in text-center md:text-left">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Manager Portal
                    </h1>
                    <p className="text-muted text-lg">
                        Manage your team&apos;s survey configurations and questions.
                    </p>
                </header>

                {/* Management Cards - Paper Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        href="/manager/questions"
                        className="group paper-card p-8 hover:shadow-paper-hover transition-all border-l-4 border-l-transparent hover:border-l-primary animate-fade-in-delay-1"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <MessageSquare className="w-6 h-6 text-primary" />
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                            {t.questionsAdmin}
                        </h3>
                        <p className="text-muted leading-relaxed">
                            {t.manageQuestions}
                        </p>
                    </Link>

                    <Link
                        href="/manager/ai-config"
                        className="group paper-card p-8 hover:shadow-paper-hover transition-all border-l-4 border-l-transparent hover:border-l-primary animate-fade-in-delay-2"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="p-3 bg-pink-50 rounded-xl">
                                <Sparkles className="w-6 h-6 text-pink-600" />
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                            {t.aiConfig}
                        </h3>
                        <p className="text-muted leading-relaxed">
                            {t.configureAI}
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
