import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

    if (code) {
        const supabase = await createClient();

        // Exchange the code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error("Auth callback error:", exchangeError);
            return NextResponse.redirect(`${origin}/login?error=auth_failed`);
        }

        // Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("Failed to get user:", userError);
            return NextResponse.redirect(`${origin}/login?error=user_not_found`);
        }

        // IMMEDIATELY fetch the user's role
        // Step 1: Check user_metadata.role first
        let role = user.user_metadata?.role?.toLowerCase();

        // Step 2: If missing, query the profiles table
        if (!role) {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("Failed to fetch profile:", profileError);
                // Profile might not exist yet - default to survey
                return NextResponse.redirect(`${origin}/survey`);
            }

            role = profile?.role?.toLowerCase();
        }

        // Role-based redirection (strict routing)
        if (role === "admin" || role === "manager" || role === "hr_manager") {
            return NextResponse.redirect(`${origin}/manager/dashboard`);
        } else if (role === "employee") {
            return NextResponse.redirect(`${origin}/survey`);
        } else {
            // Fallback - no role or unrecognized role, default to survey
            console.warn("Unrecognized or missing role for user:", user.id, "role:", role);
            return NextResponse.redirect(`${origin}/survey`);
        }
    }

    // No code provided - redirect to login
    return NextResponse.redirect(`${origin}/login?error=no_code`);
}
