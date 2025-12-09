import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthUser = {
    id: string;
    email: string;
    role: "EMPLOYEE" | "HR_MANAGER";
    name: string;
    companyId: string | null;
    department: string;
};

/**
 * Get the current authenticated user from Supabase.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    // Get the profile with company info
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return null;
    }

    return {
        id: user.id,
        email: user.email || "",
        role: profile.role || "EMPLOYEE",
        name: profile.name || user.email?.split("@")[0] || "User",
        companyId: profile.company_id,
        department: profile.department || "General",
    };
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return user;
}

/**
 * Require HR Manager role. Redirects appropriately if not authorized.
 */
export async function requireHRManager(): Promise<AuthUser> {
    const user = await requireAuth();

    if (user.role !== "HR_MANAGER") {
        redirect("/survey"); // Employees go to survey
    }

    return user;
}

/**
 * Get session for client-side auth checks (use in client components).
 * This is a lighter version that just checks if logged in.
 */
export async function getSession() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}
