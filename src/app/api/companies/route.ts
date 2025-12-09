import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: List all companies (for signup dropdown)
export async function GET() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ companies: data || [] });
}

// POST: Create a new company (called during HR Manager signup)
export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        const { name } = await req.json();

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Company name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("companies")
            .insert({ name: name.trim() })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "A company with this name already exists" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ company: data }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}
