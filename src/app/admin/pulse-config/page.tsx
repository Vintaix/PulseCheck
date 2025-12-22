"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { Calendar, Check, AlertCircle } from "lucide-react";

type Frequency = "weekly" | "biweekly" | "monthly";

export default function PulseConfigPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [frequency, setFrequency] = useState<Frequency>("weekly");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    useEffect(() => {
        if (!loading && (!user || (user.role?.toLowerCase() !== "hr_manager" && user.role?.toLowerCase() !== "admin"))) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        fetch("/api/admin/pulse-config")
            .then(res => res.json())
            .then(data => {
                if (data.frequency) {
                    setFrequency(data.frequency);
                }
                setLoadingConfig(false);
            })
            .catch(() => setLoadingConfig(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            const res = await fetch("/api/admin/pulse-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frequency })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading || loadingConfig) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const frequencyOptions: { value: Frequency; label: string; description: string }[] = [
        { value: "weekly", label: "Weekly", description: "Employees receive pulse questions every week" },
        { value: "biweekly", label: "Bi-weekly", description: "Employees receive pulse questions every 2 weeks" },
        { value: "monthly", label: "Monthly", description: "Employees receive pulse questions once a month" }
    ];

    return (
        <div className="min-h-screen bg-background py-12">
            <div className="max-w-2xl mx-auto px-6">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">Pulse Frequency</h1>
                    </div>
                    <p className="text-muted">
                        Configure how often your employees receive pulse survey questions.
                    </p>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
                    <div className="space-y-4">
                        {frequencyOptions.map((option) => (
                            <label
                                key={option.value}
                                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${frequency === option.value
                                        ? "border-primary bg-primary/5"
                                        : "border-card-border hover:border-primary/30"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="frequency"
                                    value={option.value}
                                    checked={frequency === option.value}
                                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                                    className="mt-1 w-4 h-4 text-primary"
                                />
                                <div>
                                    <span className="font-medium text-foreground">{option.label}</span>
                                    <p className="text-sm text-muted mt-1">{option.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {saved && (
                        <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                            <Check className="w-4 h-4" />
                            <span className="text-sm">Frequency saved successfully!</span>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-6 w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? "Saving..." : "Save Frequency"}
                    </button>
                </div>

                <p className="mt-4 text-sm text-muted text-center">
                    Note: Changes will take effect from the next scheduled pulse.
                </p>
            </div>
        </div>
    );
}
