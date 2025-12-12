import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export type AuthUser = {
    id: string;
    email: string;
    role: string | null;
    prismaUser: User | null;
};

/**
 * Retrieves the authenticated user from Supabase and their corresponding role from Prisma.
 * @returns Object containing user details and role, or null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return null;
    }

    // Fetch the role from the Prisma database using the email
    // The 'public.user' table (managed by Prisma) should be synced with Supabase users
    const prismaUser = await prisma.user.findUnique({
        where: { email: user.email },
    });

    return {
        id: user.id,
        email: user.email,
        role: prismaUser?.role || null, // Ensure role is fetched from DB
        prismaUser: prismaUser,
    };
}
