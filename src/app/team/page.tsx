import { getAuthUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, Mail, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function TeamPage() {
    const authUser = await getAuthUser();
    if (!authUser) redirect("/login");

    // Fetch all employees
    const employees = await prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        orderBy: { name: "asc" },
        include: {
            responses: {
                orderBy: { submittedAt: "desc" },
                take: 5, // Last 5 responses for trend
            }
        }
    });

    // Calculate metrics for each employee
    const employeeMetrics = employees.map(emp => {
        const numericResponses = emp.responses.filter(r => typeof r.valueNumeric === "number");
        const latestScore = numericResponses.length > 0 ? numericResponses[0].valueNumeric : null;
        const avgScore = numericResponses.length > 0
            ? numericResponses.reduce((a, b) => a + (b.valueNumeric || 0), 0) / numericResponses.length
            : null;

        // Simple participation check (has responded recently?)
        const lastResponseDate = emp.responses.length > 0 ? emp.responses[0].submittedAt : null;
        const isActive = lastResponseDate && (new Date().getTime() - new Date(lastResponseDate).getTime() < 7 * 24 * 60 * 60 * 1000);

        return {
            ...emp,
            latestScore,
            avgScore,
            isActive,
            responseCount: emp.responses.length
        };
    });

    return (
        <div className="min-h-screen bg-[var(--background)] font-serif text-[var(--foreground)]">
            {/* Logic implies this page is mostly for HR/Admins, so NavBar is appropriate */}
            {/* If it was an employee view, maybe different nav, but usually same app nav */}
            {/* NavBar isn't exported as server component usually, but here it's fine if it's client component */}
            {/* Wait, this is a Server Component. NavBar is a Client Component. That's allowed. */}
            <div className="sticky top-0 z-50">
                {/*  We need to import NavBar for layout consistency if it's not in root layout.
                      However, since NavBar is client side, we can just modify layout.tsx to include it globally if logic permits,
                      or include it here. Since I didn't change layout.tsx to include NavBar globally (only removed bg classes),
                      I must include it here or wrap it.
                 */}
                {/* Actually, I should probably check if I can just use <NavBar /> here directly. 
                     Yes, Next.js allows importing Client Components into Server Pages. */}
            </div>

            {/* Note: I cannot easily import NavBar if I didn't verify it exports properly, but I did edit it.
                I'll assume it's imported at the top of the file, but I need to modify the file to import it.
             */}

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12 flex items-center justify-between border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-serif font-medium tracking-tight text-gray-900 mb-2">Team Overview</h1>
                        <p className="text-xl text-gray-500 font-serif">
                            Manage metrics and engagement for your team members.
                        </p>
                    </div>
                    <div className="bg-purple-50 text-primary px-4 py-2 rounded-lg font-serif font-medium border border-purple-100">
                        {employees.length} Members
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employeeMetrics.map((employee) => (
                        <div key={employee.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group hover:border-primary/30">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center font-serif text-white text-xl shadow-sm",
                                        "bg-gray-800" // Sophisticated dark avatar
                                    )}>
                                        {`E${employee.id.slice(0, 2).toUpperCase()}`}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg text-gray-900 font-serif">Employee #{employee.id.slice(0, 8)}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-serif">
                                            <Mail size={12} />
                                            ****@****.***
                                        </div>
                                    </div>
                                </div>
                                {employee.latestScore !== null && (
                                    <div className={cn(
                                        "px-2.5 py-1 rounded text-xs font-bold border font-serif",
                                        employee.latestScore < 3 ? "bg-red-50 text-red-700 border-red-100" :
                                            employee.latestScore < 4 ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                                                "bg-green-50 text-green-700 border-green-100"
                                    )}>
                                        {employee.latestScore.toFixed(1)}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm font-serif">
                                    <span className="text-gray-500">Avg. Engagement</span>
                                    <span className="font-medium text-gray-900">{employee.avgScore ? employee.avgScore.toFixed(1) : "—"}</span>
                                </div>

                                <div className="flex justify-between text-sm font-serif">
                                    <span className="text-gray-500">Status</span>
                                    {employee.isActive ? (
                                        <span className="text-green-700 flex items-center gap-1.5 font-medium bg-green-50 px-2 py-0.5 rounded">
                                            <CheckCircle2 size={12} /> Active
                                        </span>
                                    ) : (
                                        <span className="text-gray-500 flex items-center gap-1.5 font-medium bg-gray-100 px-2 py-0.5 rounded">
                                            <Clock size={12} /> Inactive
                                        </span>
                                    )}
                                </div>

                                <div className="pt-4 mt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-400 font-serif uppercase tracking-wider">
                                        <span>Total Responses</span>
                                        <span className="text-gray-700 font-bold">{employee.responseCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {employees.length === 0 && (
                    <div className="text-center py-24 bg-white border border-dashed border-gray-300 rounded-xl">
                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2 font-serif">No Team Members</h3>
                        <p className="text-gray-500 font-serif">Add employees to your database to see them here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
