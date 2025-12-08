
"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type ChurnRisk = {
    entity: string;
    type: 'USER' | 'DEPARTMENT';
    riskScore: number;
    sentimentLabel: 'Critical' | 'High' | 'Medium' | 'Low' | 'Healthy';
    details: string;
};

type PredictionResponse = {
    userRisks: ChurnRisk[];
    departmentRisks: ChurnRisk[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF0000'];

export default function PredictionsPage() {
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'DEPARTMENT' | 'USER'>('DEPARTMENT');

    useEffect(() => {
        fetch('/api/predictions/churn')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch predictions", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center">Loading predictions...</div>;
    if (!data) return <div className="p-8 text-center">Failed to load data.</div>;

    const displayData = viewMode === 'DEPARTMENT' ? data.departmentRisks : data.userRisks;

    // Prepare chart data
    const riskDistribution = [
        { name: 'Healthy', value: displayData.filter(d => d.riskScore <= 20).length },
        { name: 'Low Risk', value: displayData.filter(d => d.riskScore > 20 && d.riskScore <= 40).length },
        { name: 'Medium Risk', value: displayData.filter(d => d.riskScore > 40 && d.riskScore <= 60).length },
        { name: 'High Risk', value: displayData.filter(d => d.riskScore > 60 && d.riskScore <= 80).length },
        { name: 'Critical', value: displayData.filter(d => d.riskScore > 80).length },
    ].filter(d => d.value > 0);

    return (
        <div className="p-8 space-y-8 bg-[#FAFAF9] min-h-screen text-[#1c1c1c] font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Churn Prediction Model</h1>
                    <p className="text-gray-600">AI-powered analysis of turnover risk based on survey sentiment & scores.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setViewMode('DEPARTMENT')}
                        className={`px-4 py-2 rounded-md transition-all ${viewMode === 'DEPARTMENT' ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100'}`}
                    >
                        Departments
                    </button>
                    <button
                        onClick={() => setViewMode('USER')}
                        className={`px-4 py-2 rounded-md transition-all ${viewMode === 'USER' ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100'}`}
                    >
                        Employees
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={riskDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {riskDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Highest Risk Entities</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={displayData.slice(0, 5)} // Top 5
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis type="category" dataKey="entity" width={100} />
                                <Tooltip />
                                <Bar dataKey="riskScore" fill="#FF8042" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold">Detailed Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-sm">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Risk Score</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Insight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-medium">{item.entity}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${item.riskScore > 80 ? 'bg-red-500' :
                                                        item.riskScore > 50 ? 'bg-orange-400' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${item.riskScore}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600">{item.riskScore}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.sentimentLabel === 'Critical' ? 'bg-red-100 text-red-700' :
                                            item.sentimentLabel === 'High' ? 'bg-orange-100 text-orange-700' :
                                                item.sentimentLabel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>
                                            {item.sentimentLabel}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {item.details}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
