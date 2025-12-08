"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Sparkles, Trash2, Edit2, Check, Plus, AlertCircle, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useLocale } from "@/i18n/LocaleContext";
import Link from "next/link";

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QuestionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { locale } = useLocale();
    const t = messages[locale as keyof typeof messages] || messages.en;

    const isHR = (session?.user as any)?.role === "HR_MANAGER";

    const [isRegenerating, setIsRegenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Manual Question State
    const [newQuestionText, setNewQuestionText] = useState("");
    const [newQuestionType, setNewQuestionType] = useState<"SCALE_1_5" | "OPEN">("SCALE_1_5");
    const [isCreating, setIsCreating] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [editType, setEditType] = useState<string>("");

    const { data: questions, mutate: mutateQuestions } = useSWR<Array<{ id: string; text: string; type: string; isActive: boolean }>>("/api/questions", fetcher);

    const showStatus = (type: 'success' | 'error', text: string) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage(null), 5000);
    };

    useEffect(() => {
        if (status === "authenticated" && !isHR) router.replace("/survey");
    }, [status, isHR, router]);

    const handleCreateQuestion = async () => {
        if (!newQuestionText.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: newQuestionText,
                    type: newQuestionType,
                    isActive: true
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                showStatus('error', data.error || t.failedTo + " create");
                return;
            }

            setNewQuestionText("");
            showStatus('success', t.questionCreated);
            mutateQuestions();
        } catch (error) {
            console.error("Error creating question:", error);
            showStatus('error', t.failedTo + " create");
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch(`/api/questions/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentActive }),
            });

            if (!res.ok) {
                const data = await res.json();
                showStatus('error', data.error || t.failedTo + " update");
                return;
            }
            mutateQuestions();
        } catch (_error) {
            showStatus('error', t.failedTo + " update");
        }
    };

    const startEditing = (q: { id: string, text: string, type: string }) => {
        setEditingId(q.id);
        setEditText(q.text);
        setEditType(q.type);
    };

    const saveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/questions/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: editText, type: editType }),
            });

            if (!res.ok) {
                const data = await res.json();
                showStatus('error', data.error || t.failedTo + " update");
                return;
            }

            showStatus('success', t.questionUpdated);
            setEditingId(null);
            mutateQuestions();
        } catch (_error) {
            showStatus('error', t.failedTo + " update");
        }
    };

    const handleReorder = async (index: number, direction: 'up' | 'down') => {
        if (!questions) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= questions.length) return;

        const newQuestions = [...questions];
        const temp = newQuestions[newIndex];
        newQuestions[newIndex] = newQuestions[index];
        newQuestions[index] = temp;

        mutateQuestions(newQuestions, false);

        try {
            const payload = newQuestions.map((q, i) => ({ id: q.id, order: i }));
            await fetch('/api/questions/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: payload })
            });
            mutateQuestions();
        } catch {
            showStatus('error', t.errorGenerating);
            mutateQuestions();
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className="max-w-4xl mx-auto px-6 py-10">

                {/* Breadcrumb Back Link */}
                <Link
                    href="/manager"
                    className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Manager
                </Link>

                {/* Header */}
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1">{t.questionsAdmin}</h1>
                        <p className="text-muted text-lg">{t.questionsDescription}</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (!confirm(t.confirmGenerate)) return;
                            setIsRegenerating(true);
                            setStatusMessage(null);
                            try {
                                const res = await fetch("/api/questions/generate", { method: "POST" });
                                const data = await res.json();
                                if (!res.ok) {
                                    showStatus('error', data?.error || t.errorGenerating);
                                    return;
                                }
                                showStatus('success', t.questionsGenerated);
                                mutateQuestions();
                            } catch (e: any) {
                                showStatus('error', e?.message || t.errorGenerating);
                            } finally {
                                setIsRegenerating(false);
                            }
                        }}
                        disabled={isRegenerating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isRegenerating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        {t.generateNewQuestions}
                    </button>
                </header>

                {/* Status Message */}
                {statusMessage && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in border ${statusMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {statusMessage.type === 'error' && <AlertCircle size={18} />}
                        {statusMessage.type === 'success' && <Check size={18} />}
                        <span className="font-medium">{statusMessage.text}</span>
                    </div>
                )}

                {/* Add Question Form - Paper Style */}
                <div className="paper-card p-6 mb-8 animate-fade-in-delay-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <Plus size={16} />
                        </div>
                        <h2 className="font-semibold text-foreground">{t.addCustomQuestion}</h2>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            placeholder={t.typeQuestion}
                            className="flex-1 px-4 py-3 bg-white border border-card-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                        <select
                            value={newQuestionType}
                            onChange={(e) => setNewQuestionType(e.target.value as any)}
                            className="w-full md:w-44 px-4 py-3 bg-white border border-card-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        >
                            <option value="SCALE_1_5">{t.scale_1_5}</option>
                            <option value="OPEN">{t.openQuestion}</option>
                        </select>
                        <button
                            onClick={handleCreateQuestion}
                            disabled={!newQuestionText.trim() || isCreating}
                            className="px-6 py-3 bg-foreground text-white rounded-xl font-semibold hover:bg-foreground/90 disabled:opacity-50 transition-all"
                        >
                            {isCreating ? t.adding : t.add}
                        </button>
                    </div>
                </div>

                {/* Questions List - Paper Style */}
                <div className="space-y-3 animate-fade-in-delay-2">
                    {!questions ? (
                        <div className="text-center py-16">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-16 paper-card bg-background-secondary border-dashed">
                            <p className="text-muted">{t.noQuestions}</p>
                        </div>
                    ) : (
                        questions.map((q, index) => (
                            <div
                                key={q.id}
                                className={`paper-card p-5 transition-all group ${q.isActive
                                    ? 'bg-white hover:border-primary/50'
                                    : 'bg-background-secondary/50 opacity-75'
                                    }`}
                            >
                                {editingId === q.id ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-primary rounded-xl focus:outline-none text-foreground shadow-sm"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={editType}
                                                onChange={(e) => setEditType(e.target.value)}
                                                className="px-3 py-2 bg-white border border-card-border rounded-lg text-sm text-foreground"
                                            >
                                                <option value="SCALE_1_5">{t.scale_1_5}</option>
                                                <option value="OPEN">{t.openQuestion}</option>
                                            </select>
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => saveEdit(q.id)}
                                                className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                {t.save}
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-4 py-2 text-muted hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                {t.cancel}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${q.type === 'SCALE_1_5'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                    {q.type === 'SCALE_1_5' ? 'Scale 1-5' : 'Open Text'}
                                                </span>
                                                {!q.isActive && (
                                                    <span className="text-xs text-muted font-medium bg-gray-100 px-2 py-0.5 rounded-md">Inactive</span>
                                                )}
                                            </div>
                                            <p className={`text-lg text-foreground font-medium ${!q.isActive ? 'line-through text-muted' : ''}`}>
                                                {q.text}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            {/* Reorder buttons */}
                                            <div className="flex flex-col mr-2">
                                                <button
                                                    onClick={() => handleReorder(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 text-muted hover:text-primary disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleReorder(index, 'down')}
                                                    disabled={index === questions.length - 1}
                                                    className="p-1 text-muted hover:text-primary disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>

                                            {/* Toggle */}
                                            <label className="relative inline-flex items-center cursor-pointer mr-3">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={q.isActive}
                                                    onChange={() => handleToggleActive(q.id, q.isActive)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                                            </label>

                                            {/* Edit */}
                                            <button
                                                onClick={() => startEditing(q)}
                                                className="p-2 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={async () => {
                                                    if (!confirm(t.deleteConfirm)) return;
                                                    try {
                                                        const res = await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
                                                        if (res.ok) {
                                                            showStatus('success', t.questionDeleted);
                                                            mutateQuestions();
                                                        } else {
                                                            const data = await res.json();
                                                            showStatus('error', data?.error || t.failedTo + " delete");
                                                        }
                                                    } catch {
                                                        showStatus('error', t.failedTo + " delete");
                                                    }
                                                }}
                                                className="p-2 text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
