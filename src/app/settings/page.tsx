import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    return (
        <div className="space-y-8">
            <SettingsClient />
        </div>
    );
}
