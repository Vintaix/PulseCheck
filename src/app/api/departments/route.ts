import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: List departments for a specific company
export async function GET(req: Request) {
    const supabase = await createClient();
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
        return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ departments: data || [] });
}

// POST: Create a new department (HR Managers only)
export async function POST(req: Request) {
    const supabase = await createClient();

    // Check if user is authenticated and is HR Manager
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "HR_MANAGER") {
        return NextResponse.json({ error: "Only HR Managers can create departments" }, { status: 403 });
    }

    try {
        const { name, company_id } = await req.json();

        // Ensure HR Manager can only create departments for their own company
        const targetCompanyId = company_id || profile.company_id;
        if (targetCompanyId !== profile.company_id) {
            return NextResponse.json({ error: "You can only create departments for your own company" }, { status: 403 });
        }

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Department name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("departments")
            .insert({
                name: name.trim(),
                company_id: targetCompanyId
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "A department with this name already exists in this company" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ department: data }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}
