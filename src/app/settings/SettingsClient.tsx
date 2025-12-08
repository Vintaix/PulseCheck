"use client";

import { Settings } from "lucide-react";
import NavBar from "@/components/NavBar";

export default function SettingsClient() {
    return (
        <div className="min-h-screen bg-[var(--background)] font-serif text-[var(--foreground)]">
            <NavBar />
            <div className="max-w-3xl mx-auto px-6 py-12">
                <header className="mb-10 border-b border-gray-200 pb-6">
                    <h1 className="text-3xl font-serif font-medium text-gray-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" strokeWidth={1.5} />
                        Settings
                    </h1>
                    <p className="text-gray-500 mt-2 font-serif text-lg">
                        Manage your application preferences and configuration.
                    </p>
                </header>

                <section className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <h2 className="text-xl font-medium text-gray-900 mb-6 font-serif">General Settings</h2>

                    <div className="bg-gray-50 rounded-lg p-8 border border-gray-100 text-center">
                        <p className="text-gray-500 mb-4 font-serif">Global application settings will appear here.</p>
                        <p className="text-sm font-serif text-gray-400">
                            Looking for AI Configuration? Visit the <a href="/admin/ai-config" className="text-primary hover:text-primary-dark underline underline-offset-2 transition-colors">AI Config</a> page.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
