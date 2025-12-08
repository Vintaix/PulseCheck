"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("EMPLOYEE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const supabase = createClient();

    async function handleSignUp(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                    data: {
                        role: role,
                    },
                },
            });

            if (signUpError) {
                // Handle specific error messages
                if (signUpError.message.includes("already registered")) {
                    setError("This email is already registered. Please log in instead.");
                } else if (signUpError.message.includes("password")) {
                    setError("Password must be at least 6 characters long.");
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            setSuccess(true);
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
                <div className="paper-card p-8 max-w-md w-full text-center animate-fade-in">
                    {/* Success Icon */}
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
                        <svg className="w-8 h-8" style={{ color: "var(--primary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                        Check Your Email
                    </h1>

                    <p className="mb-6" style={{ color: "var(--muted)" }}>
                        We&apos;ve sent a confirmation link to <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
                        Please click the link to verify your account.
                    </p>

                    <div className="p-4 rounded-lg mb-6" style={{ background: "var(--background-secondary)", border: "1px solid var(--card-border)" }}>
                        <p className="text-sm" style={{ color: "var(--muted)" }}>
                            💡 Don&apos;t see the email? Check your spam folder or{" "}
                            <button
                                onClick={() => { setSuccess(false); setEmail(""); setPassword(""); }}
                                className="underline"
                                style={{ color: "var(--primary)" }}
                            >
                                try again
                            </button>
                        </p>
                    </div>

                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
                        style={{ background: "var(--primary)", color: "#FFFFFF" }}
                    >
                        Go to Login
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
            <div className="paper-card p-8 max-w-md w-full animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center logo-pulse" style={{ background: "var(--primary)" }}>
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                        Create Your Account
                    </h1>
                    <p style={{ color: "var(--muted)" }}>
                        Join PulseCheck to get started
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg animate-fade-in" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                        <p className="text-sm font-medium" style={{ color: "#DC2626" }}>
                            {error}
                        </p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSignUp} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium mb-2"
                            style={{ color: "var(--foreground)" }}
                        >
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 rounded-lg text-base"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium mb-2"
                            style={{ color: "var(--foreground)" }}
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="At least 6 characters"
                            className="w-full px-4 py-3 rounded-lg text-base"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="block text-sm font-medium mb-2"
                            style={{ color: "var(--foreground)" }}
                        >
                            I am a...
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg text-base appearance-none bg-white"
                            disabled={loading}
                            style={{
                                background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center no-repeat`,
                                backgroundSize: "1.5em 1.5em",
                                paddingRight: "2.5rem"
                            }}
                        >
                            <option value="EMPLOYEE">Team Member (Employee)</option>
                            <option value="HR_MANAGER">HR Manager / Admin</option>
                        </select>
                        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                            Choose your primary role in the organization.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        style={{
                            background: loading ? "var(--muted)" : "var(--primary)",
                            color: "#FFFFFF",
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Creating Account...
                            </>
                        ) : (
                            "Sign Up"
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 text-center" style={{ borderTop: "1px solid var(--card-border)" }}>
                    <p style={{ color: "var(--muted)" }}>
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
