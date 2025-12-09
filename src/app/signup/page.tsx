"use client";

import { useState, FormEvent, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Logo from "@/components/Logo";
import { ArrowRight, Building2, Users, ChevronDown, Plus } from "lucide-react";

type Step = "role" | "company" | "department" | "credentials" | "success";
type Role = "EMPLOYEE" | "HR_MANAGER";

interface Company {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
}

export default function SignUpPage() {
    const [step, setStep] = useState<Step>("role");
    const [role, setRole] = useState<Role>("EMPLOYEE");

    // Company selection
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [newCompanyName, setNewCompanyName] = useState("");
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);

    // Department selection (for employees)
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [customDepartment, setCustomDepartment] = useState("");

    // Credentials
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    const supabase = createClient();

    // Fetch companies on mount
    useEffect(() => {
        async function fetchCompanies() {
            setLoadingCompanies(true);
            const { data, error } = await supabase
                .from("companies")
                .select("id, name")
                .order("name");

            if (!error && data) {
                setCompanies(data);
            }
            setLoadingCompanies(false);
        }
        fetchCompanies();
    }, [supabase]);

    // Fetch departments when company is selected
    useEffect(() => {
        if (!selectedCompanyId || role !== "EMPLOYEE") return;

        async function fetchDepartments() {
            const { data, error } = await supabase
                .from("departments")
                .select("id, name")
                .eq("company_id", selectedCompanyId)
                .order("name");

            if (!error && data) {
                setDepartments(data);
            }
        }
        fetchDepartments();
    }, [selectedCompanyId, role, supabase]);

    // Handle role selection
    function handleRoleSelect(selectedRole: Role) {
        setRole(selectedRole);
        setStep("company");
    }

    // Handle company selection/creation
    async function handleCompanyStep() {
        setError(null);

        if (role === "HR_MANAGER" && isCreatingCompany) {
            // Create new company
            if (!newCompanyName.trim()) {
                setError("Please enter a company name");
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("companies")
                .insert({ name: newCompanyName.trim() })
                .select()
                .single();

            if (error) {
                if (error.code === "23505") {
                    setError("A company with this name already exists");
                } else {
                    setError(error.message);
                }
                setLoading(false);
                return;
            }

            setSelectedCompanyId(data.id);
            setLoading(false);

            // HR Managers skip department selection
            setStep("credentials");
        } else {
            // Select existing company
            if (!selectedCompanyId) {
                setError("Please select a company");
                return;
            }

            if (role === "HR_MANAGER") {
                setStep("credentials");
            } else {
                setStep("department");
            }
        }
    }

    // Handle department selection
    function handleDepartmentStep() {
        const dept = selectedDepartment || customDepartment.trim();
        if (!dept) {
            setError("Please select or enter a department");
            return;
        }
        setSelectedDepartment(dept);
        setStep("credentials");
    }

    // Handle final signup
    async function handleSignUp(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const finalDepartment = role === "HR_MANAGER" ? "Management" : (selectedDepartment || customDepartment.trim() || "General");

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`,
                    data: {
                        role: role,
                        name: name.trim(),
                        company_id: selectedCompanyId,
                        department: finalDepartment,
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    setError("This email is already registered. Please log in instead.");
                } else if (signUpError.message.includes("password")) {
                    setError("Password must be at least 6 characters long.");
                } else {
                    setError(signUpError.message);
                }
                setLoading(false);
                return;
            }

            // If HR Manager created a new company, also create default departments
            if (role === "HR_MANAGER" && isCreatingCompany && selectedCompanyId) {
                const defaultDepartments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"];
                await supabase.from("departments").insert(
                    defaultDepartments.map(name => ({ company_id: selectedCompanyId, name }))
                );
            }

            setStep("success");
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Success state
    if (step === "success") {
        return (
            <main className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="paper-card p-8 max-w-md w-full text-center animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-semibold mb-3 text-foreground">
                        Check Your Email
                    </h1>

                    <p className="mb-6 text-muted">
                        We&apos;ve sent a confirmation link to <strong className="text-foreground">{email}</strong>.
                        Please click the link to verify your account.
                    </p>

                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="paper-card p-8 max-w-md w-full animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Logo className="w-12 h-12 mx-auto mb-4 logo-pulse" />
                    </Link>
                    <h1 className="text-2xl font-semibold mb-2 text-foreground">
                        {step === "role" && "Create Your Account"}
                        {step === "company" && (role === "HR_MANAGER" ? "Set Up Your Company" : "Select Your Company")}
                        {step === "department" && "Select Your Department"}
                        {step === "credentials" && "Almost There!"}
                    </h1>
                    <p className="text-muted">
                        {step === "role" && "Choose your role to get started"}
                        {step === "company" && (role === "HR_MANAGER" ? "Create a new company or join an existing one" : "Find your company to join")}
                        {step === "department" && "Select the department you work in"}
                        {step === "credentials" && "Enter your details to complete registration"}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 animate-fade-in">
                        <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                )}

                {/* Step: Role Selection */}
                {step === "role" && (
                    <div className="space-y-4">
                        <button
                            onClick={() => handleRoleSelect("HR_MANAGER")}
                            className="w-full p-6 rounded-xl border-2 border-card-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Building2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">HR Manager / Admin</h3>
                                    <p className="text-sm text-muted">Set up your company and manage employee surveys</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleRoleSelect("EMPLOYEE")}
                            className="w-full p-6 rounded-xl border-2 border-card-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Team Member</h3>
                                    <p className="text-sm text-muted">Join your company and participate in surveys</p>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Step: Company Selection */}
                {step === "company" && (
                    <div className="space-y-4">
                        {role === "HR_MANAGER" && (
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setIsCreatingCompany(false)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${!isCreatingCompany ? "bg-primary text-white" : "bg-background-secondary text-muted"
                                        }`}
                                >
                                    Join Existing
                                </button>
                                <button
                                    onClick={() => setIsCreatingCompany(true)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${isCreatingCompany ? "bg-primary text-white" : "bg-background-secondary text-muted"
                                        }`}
                                >
                                    Create New
                                </button>
                            </div>
                        )}

                        {(role === "EMPLOYEE" || !isCreatingCompany) && (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Select Company
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCompanyId}
                                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg text-base appearance-none bg-white border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                                        disabled={loadingCompanies}
                                    >
                                        <option value="">
                                            {loadingCompanies ? "Loading companies..." : "Select your company"}
                                        </option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                                </div>
                                {companies.length === 0 && !loadingCompanies && (
                                    <p className="mt-2 text-sm text-muted">
                                        No companies found.{" "}
                                        {role === "HR_MANAGER" ? (
                                            <button onClick={() => setIsCreatingCompany(true)} className="text-primary font-medium">
                                                Create one
                                            </button>
                                        ) : (
                                            "Please ask your HR Manager to create one first."
                                        )}
                                    </p>
                                )}
                            </div>
                        )}

                        {role === "HR_MANAGER" && isCreatingCompany && (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Company Name
                                </label>
                                <div className="relative">
                                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                                    <input
                                        type="text"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        placeholder="Enter your company name"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg text-base border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep("role")}
                                className="px-4 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCompanyStep}
                                disabled={loading}
                                className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Creating..." : "Continue"} <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Department Selection (Employees only) */}
                {step === "department" && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Select Department
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => {
                                        setSelectedDepartment(e.target.value);
                                        setCustomDepartment("");
                                    }}
                                    className="w-full px-4 py-3 rounded-lg text-base appearance-none bg-white border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Select your department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </option>
                                    ))}
                                    <option value="__custom__">Other (Enter manually)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                            </div>
                        </div>

                        {selectedDepartment === "__custom__" && (
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Enter Department Name
                                </label>
                                <input
                                    type="text"
                                    value={customDepartment}
                                    onChange={(e) => setCustomDepartment(e.target.value)}
                                    placeholder="e.g., Product Design"
                                    className="w-full px-4 py-3 rounded-lg text-base border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep("company")}
                                className="px-4 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleDepartmentStep}
                                className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Credentials */}
                {step === "credentials" && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-3 rounded-lg text-base border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-lg text-base border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="At least 6 characters"
                                className="w-full px-4 py-3 rounded-lg text-base border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        {/* Summary */}
                        <div className="p-4 rounded-lg bg-background-secondary border border-card-border">
                            <p className="text-sm text-muted">
                                <strong className="text-foreground">Role:</strong> {role === "HR_MANAGER" ? "HR Manager" : "Team Member"}
                            </p>
                            <p className="text-sm text-muted">
                                <strong className="text-foreground">Company:</strong> {companies.find(c => c.id === selectedCompanyId)?.name || newCompanyName}
                            </p>
                            {role === "EMPLOYEE" && (
                                <p className="text-sm text-muted">
                                    <strong className="text-foreground">Department:</strong> {selectedDepartment === "__custom__" ? customDepartment : selectedDepartment}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setStep(role === "HR_MANAGER" ? "company" : "department")}
                                className="px-4 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Sign Up <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Footer */}
                <div className="mt-6 pt-6 text-center border-t border-card-border">
                    <p className="text-muted">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary hover:text-primary-dark">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
