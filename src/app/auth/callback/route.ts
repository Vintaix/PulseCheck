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

        // Fetch the user's profile to get their role
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Failed to fetch profile:", profileError);
            // Profile might not exist yet if trigger hasn't run
            // Default to survey for employees
            return NextResponse.redirect(`${origin}/survey`);
        }

        // Role-based redirection
        if (profile?.role === "HR_MANAGER") {
            return NextResponse.redirect(`${origin}/manager/dashboard`);
        } else if (profile?.role === "EMPLOYEE") {
            return NextResponse.redirect(`${origin}/survey`);
        } else {
            // Fallback - no role found
            console.warn("No role found for user:", user.id);
            return NextResponse.redirect(`${origin}/login?error=no_role`);
        }
    }

    // No code provided - redirect to login
    return NextResponse.redirect(`${origin}/login?error=no_code`);
}
