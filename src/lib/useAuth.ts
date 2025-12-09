"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

export type AuthUser = {
    id: string;
    email: string;
    role: "EMPLOYEE" | "HR_MANAGER";
    name: string;
    companyId: string | null;
    department: string;
};

interface UseAuthReturn {
    user: AuthUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchUser = useCallback(async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setUser(null);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", authUser.id)
                .single();

            if (profile) {
                setUser({
                    id: authUser.id,
                    email: authUser.email || "",
                    role: profile.role || "EMPLOYEE",
                    name: profile.name || authUser.email?.split("@")[0] || "User",
                    companyId: profile.company_id,
                    department: profile.department || "General",
                });
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchUser();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchUser();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUser, supabase.auth]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        window.location.href = "/login";
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    return { user, loading, signOut, refreshUser };
}
