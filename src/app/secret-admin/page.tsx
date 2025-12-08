"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, AlertCircle, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

// Hardcoded admin credentials - you are the only one who knows this!
const ADMIN_EMAIL = "admin@pulsecheck.io";
const ADMIN_PASSWORD = "PulseAdmin2024!";

export default function SecretAdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Simple hardcoded check
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            // Store admin session in localStorage
            localStorage.setItem("pulsecheck_admin", "authenticated");
            localStorage.setItem("pulsecheck_admin_time", Date.now().toString());
            router.push("/secret-admin/dashboard");
        } else {
            setError("Invalid credentials");
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center mb-4">
                        <Logo className="w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                        Admin Access
                    </h1>
                    <p className="text-muted text-sm">
                        Restricted area. Authorized personnel only.
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card p-8 animate-fade-in-delay-1">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@pulsecheck.io"
                                className="w-full px-4 py-3 bg-background-secondary border border-card-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full px-4 py-3 bg-background-secondary border border-card-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 transition-all glow-hover"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Access Admin Panel
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Security notice */}
                <p className="text-center text-xs text-muted mt-6 animate-fade-in-delay-2">
                    🔒 This area is monitored. Unauthorized access attempts are logged.
                </p>
            </div>
        </div>
    );
}
