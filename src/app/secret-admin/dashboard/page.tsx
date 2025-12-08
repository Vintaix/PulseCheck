"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Logo from "@/components/Logo";
import {
    MessageSquare,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Trash2,
    Sparkles,
    LogOut,
    Activity
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SecretAdminDashboard() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetConfirm, setResetConfirm] = useState("");
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    const { data: stats } = useSWR<{
        totalResponses: number;
        totalQuestions: number;
        totalUsers: number;
        recentResponses: Array<{ submittedAt: string; userName: string; questionText: string }>;
    }>("/api/admin/stats", fetcher);

    useEffect(() => {
        // Check localStorage for admin auth
        const adminAuth = localStorage.getItem("pulsecheck_admin");
        const adminTime = localStorage.getItem("pulsecheck_admin_time");

        if (adminAuth === "authenticated" && adminTime) {
            // Session valid for 24 hours
            const elapsed = Date.now() - parseInt(adminTime);
            if (elapsed < 24 * 60 * 60 * 1000) {
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem("pulsecheck_admin");
                localStorage.removeItem("pulsecheck_admin_time");
                router.push("/secret-admin");
            }
        } else {
            router.push("/secret-admin");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("pulsecheck_admin");
        localStorage.removeItem("pulsecheck_admin_time");
        router.push("/secret-admin");
    };

    const handleDatabaseReset = async () => {
        if (resetConfirm !== "RESET") {
            setResetError('Type "RESET" to confirm');
            return;
        }

        setResetting(true);
        setResetError(null);

        try {
            const res = await fetch("/api/admin/reset", {
                method: "POST",
                headers: {
                    "x-admin-key": "PulseAdmin2024!"
                }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Reset failed");
            }
            setResetSuccess(true);
            setResetConfirm("");
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            setResetError(error.message);
        } finally {
            setResetting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <nav className="border-b border-card-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Logo className="w-8 h-8" />
                            <span className="font-semibold text-lg text-foreground">
                                Admin Panel
                            </span>
                            <span className="px-2 py-1 bg-danger/20 text-danger text-xs font-medium rounded-lg">
                                SECRET
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-card-bg hover:bg-danger/20 border border-card-border rounded-lg transition-all hover:border-danger/50"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <header className="mb-10 animate-fade-in">
                    <h1 className="text-2xl font-semibold text-foreground mb-1">
                        System Overview
                    </h1>
                    <p className="text-muted">
                        Monitor responses, view stats, and manage the database.
                    </p>
                </header>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 animate-fade-in-delay-1">
                    <StatCard
                        label="Total Responses"
                        value={stats?.totalResponses ?? "—"}
                        icon={<MessageSquare className="w-5 h-5" />}
                        color="primary"
                    />
                    <StatCard
                        label="Active Questions"
                        value={stats?.totalQuestions ?? "—"}
                        icon={<Sparkles className="w-5 h-5" />}
                        color="purple"
                    />
                    <StatCard
                        label="Total Users"
                        value={stats?.totalUsers ?? "—"}
                        icon={<Users className="w-5 h-5" />}
                        color="blue"
                    />
                    <StatCard
                        label="System Status"
                        value="Online"
                        icon={<Activity className="w-5 h-5" />}
                        color="green"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Responses */}
                    <div className="lg:col-span-2 glass-card p-6 animate-fade-in-delay-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-foreground">Recent Responses</h2>
                            <Clock className="w-4 h-4 text-muted" />
                        </div>
                        {stats?.recentResponses && stats.recentResponses.length > 0 ? (
                            <div className="space-y-3">
                                {stats.recentResponses.slice(0, 8).map((response, i) => (
                                    <div key={i} className="flex items-start gap-3 py-3 border-b border-card-border last:border-0">
                                        <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground truncate">{response.questionText}</p>
                                            <p className="text-xs text-muted">
                                                {new Date(response.submittedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted italic py-8 text-center">No recent responses</p>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* System Status */}
                        <div className="glass-card p-6 animate-fade-in-delay-2">
                            <h2 className="font-semibold text-foreground mb-4">System Status</h2>
                            <div className="space-y-3">
                                <StatusRow label="Database" status="connected" />
                                <StatusRow label="AI Service" status="active" />
                                <StatusRow label="Scheduler" status="active" />
                            </div>
                        </div>

                        {/* Database Reset */}
                        <div className="glass-card p-6 border-danger/30 animate-fade-in-delay-3">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-danger" />
                                <h2 className="font-semibold text-danger">Danger Zone</h2>
                            </div>
                            <p className="text-sm text-muted mb-4">
                                This will permanently delete all survey data, responses, and AI insights. This action cannot be undone.
                            </p>

                            {resetSuccess ? (
                                <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-xl">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">Database reset successful. Reloading...</span>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={resetConfirm}
                                        onChange={(e) => setResetConfirm(e.target.value)}
                                        placeholder='Type "RESET" to confirm'
                                        className="w-full px-3 py-2.5 bg-background-secondary border border-card-border rounded-xl text-sm mb-3 focus:outline-none focus:border-danger text-foreground placeholder-muted"
                                    />
                                    {resetError && (
                                        <p className="text-xs text-danger mb-3">{resetError}</p>
                                    )}
                                    <button
                                        onClick={handleDatabaseReset}
                                        disabled={resetting || resetConfirm !== "RESET"}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-danger text-white rounded-xl font-medium hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {resetting ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4" />
                                                Reset Database
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'primary' | 'purple' | 'blue' | 'green';
}) {
    const colorClasses = {
        primary: 'text-primary bg-primary/10',
        purple: 'text-primary-light bg-primary-light/10',
        blue: 'text-blue-400 bg-blue-400/10',
        green: 'text-success bg-success/10',
    };

    return (
        <div className="glass-card p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
                <span className="text-sm text-muted">{label}</span>
            </div>
            <span className="text-2xl font-semibold text-foreground">{value}</span>
        </div>
    );
}

function StatusRow({ label, status }: { label: string; status: 'connected' | 'active' | 'error' }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{label}</span>
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status === 'error' ? 'bg-danger' : 'bg-success'}`}></div>
                <span className={`text-xs capitalize ${status === 'error' ? 'text-danger' : 'text-success'}`}>
                    {status}
                </span>
            </div>
        </div>
    );
}
