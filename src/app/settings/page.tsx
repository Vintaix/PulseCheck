import { getAuthUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
    const authUser = await getAuthUser();
    if (!authUser) redirect("/login");

    return (
        <div className="space-y-8">
            <SettingsClient />
        </div>
    );
}
