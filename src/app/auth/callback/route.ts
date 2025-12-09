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

        // Step 2: If missing, query the profiles table with retry mechanism
        if (!role) {
            for (let i = 0; i < 3; i++) {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (!profileError && profile) {
                    role = profile.role?.toLowerCase();
                    break;
                }

                // Wait 500ms before retrying, if not the last attempt
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // Role-based redirection (strict routing)
        if (role === "hr_manager") {
            return NextResponse.redirect(`${origin}/hr-dashboard`);
        } else if (role === "admin" || role === "manager") {
            return NextResponse.redirect(`${origin}/manager/dashboard`);
        } else {
            // Default/Fallback: employee or role not found -> survey
            return NextResponse.redirect(`${origin}/survey`);
        }
    }

    // No code provided - redirect to login
    return NextResponse.redirect(`${origin}/login?error=no_code`);
}
