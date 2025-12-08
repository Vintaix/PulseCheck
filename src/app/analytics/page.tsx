"use client";

import NavBar from "@/components/NavBar";
import { useLocale } from "@/i18n/LocaleContext";
import useSWR from "swr";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Line
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, MessageSquare, Zap, RefreshCw } from 'lucide-react';

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr } as const;

interface AnalyticsData {
    history: { name: string; score: number }[];
    totalResponses: number;
    participationRate: number;
    currentScore: number;
    keywords: { word: string; sentiment: 'positive' | 'neutral' | 'negative' }[] | null;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
};

export default function AnalyticsPage() {
    const { locale } = useLocale();
    const t = messages[locale as keyof typeof messages] || messages.en;

    const { data, error, isLoading, mutate } = useSWR<AnalyticsData>('/api/analytics/summary', fetcher);

    const getText = (key: string, fallback: string): string => {
        return (t as Record<string, string>)[key] || fallback;
    };

    // Calculate trend from real data
    const latestScore = data?.currentScore || 0;
    const previousScore = data?.history && data.history.length > 1
        ? data.history[data.history.length - 2]?.score || latestScore
        : latestScore;
    const trend = previousScore > 0 ? ((latestScore - previousScore) / previousScore * 100).toFixed(1) : "0.0";
    const isPositive = parseFloat(trend) > 0;
    const isNeutral = parseFloat(trend) === 0;

    // Default keywords if none from data
    const defaultKeywords = [
        { word: 'Teamwork', sentiment: 'positive' as const },
        { word: 'Workload', sentiment: 'neutral' as const },
        { word: 'Support', sentiment: 'positive' as const },
    ];

    const keywords = data?.keywords || defaultKeywords;

    // Empty state check
    const hasData = data && data.history.length > 0;

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Header */}
                <header className="mb-10 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm text-muted font-medium uppercase tracking-wide">Data Insights</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        {getText('analyticsTitle', 'Analytics & Trends')}
                    </h1>
                    <p className="text-muted text-lg">
                        {getText('analyticsDescription', "Deep dive into your team's engagement over time.")}
                    </p>
                </header>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                        <p className="text-muted">Loading analytics...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="text-center py-20 space-y-4">
                        <div className="inline-flex items-center justify-center p-4 bg-danger/10 rounded-2xl mb-2">
                            <BarChart3 className="w-7 h-7 text-danger" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Failed to load analytics</h3>
                        <p className="text-muted text-sm">There was an error loading analytics data.</p>
                        <button
                            onClick={() => mutate()}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && !hasData && (
                    <div className="text-center py-20 space-y-4">
                        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-2">
                            <BarChart3 className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">No data yet</h3>
                        <p className="text-muted text-sm">Analytics will appear here once surveys have been completed.</p>
                    </div>
                )}

                {/* Data View */}
                {!isLoading && !error && hasData && (
                    <>
                        {/* Summary Stats Cards - Paper Style */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-delay-1">
                            <div className="paper-card p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted">Current Score</span>
                                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-success' : isNeutral ? 'bg-gray-50 text-muted' : 'bg-red-50 text-danger'}`}>
                                        {isPositive ? <TrendingUp size={12} /> : isNeutral ? <Minus size={12} /> : <TrendingDown size={12} />}
                                        {isPositive ? '+' : ''}{trend}%
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-foreground">{latestScore.toFixed(1)}</span>
                                    <span className="text-muted text-lg font-medium">/ 5.0</span>
                                </div>
                            </div>

                            <div className="paper-card p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted">Participation</span>
                                    <Zap className="w-4 h-4 text-warning" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-foreground">{data?.participationRate || 0}</span>
                                    <span className="text-muted text-lg font-medium">%</span>
                                </div>
                            </div>

                            <div className="paper-card p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted">Responses</span>
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-foreground">{data?.totalResponses || 0}</span>
                                    <span className="text-muted text-lg font-medium">total</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Main Chart - Clean Paper Style */}
                            <div className="paper-card p-6 lg:col-span-2 animate-fade-in-delay-2">
                                <h2 className="font-semibold text-foreground mb-6">
                                    {getText('engagementHistory', 'Engagement History')}
                                </h2>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={data?.history || []}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#A1A1AA"
                                                tick={{ fontSize: 12, fill: '#71717A' }}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 5]}
                                                stroke="#A1A1AA"
                                                tick={{ fontSize: 12, fill: '#71717A' }}
                                                tickLine={false}
                                                axisLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: '8px',
                                                    border: '1px solid #E5E7EB',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                    fontFamily: 'inherit',
                                                    color: '#09090B'
                                                }}
                                                labelStyle={{ color: '#71717A', marginBottom: '4px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#7C3AED"
                                                strokeWidth={3}
                                                fill="url(#colorScore)"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#7C3AED"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#FFFFFF', strokeWidth: 2, stroke: '#7C3AED' }}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#7C3AED' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Sentiment Keywords - Light Tags */}
                            <div className="paper-card p-6 animate-fade-in-delay-3">
                                <h2 className="font-semibold text-foreground mb-4">
                                    {getText('sentimentKeywords', 'Sentiment Keywords')}
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {keywords.map((tag, i) => (
                                        <span
                                            key={i}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-default border ${tag.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' :
                                                tag.sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' :
                                                    'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
                                                }`}
                                        >
                                            {tag.word}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Key Insights */}
                            <div className="paper-card p-6 animate-fade-in-delay-3">
                                <h2 className="font-semibold text-foreground mb-4">
                                    {getText('keyInsights', 'Key Insights')}
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg shrink-0 ${isPositive ? 'bg-green-50 text-success' : isNeutral ? 'bg-gray-50 text-muted' : 'bg-red-50 text-danger'}`}>
                                            {isPositive ? <TrendingUp size={18} /> : isNeutral ? <Minus size={18} /> : <TrendingDown size={18} />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">
                                                {isPositive ? 'Positive Trend' : isNeutral ? 'Stable' : 'Needs Attention'}
                                            </h4>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                {isPositive
                                                    ? `Engagement is trending upwards (+${trend}%) compared to last week.`
                                                    : isNeutral
                                                        ? 'Engagement is stable compared to last week.'
                                                        : `Engagement has decreased (${trend}%) compared to last week.`
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-amber-50 rounded-lg text-warning shrink-0">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">Participation</h4>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                {data?.participationRate && data.participationRate >= 80
                                                    ? `Great participation rate at ${data.participationRate}%.`
                                                    : data?.participationRate && data.participationRate >= 50
                                                        ? `Participation rate is ${data.participationRate}%. Consider follow-ups for non-respondents.`
                                                        : `Low participation at ${data?.participationRate || 0}%. Try sending reminders.`
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-purple-50 rounded-lg text-primary shrink-0">
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">Total Responses</h4>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                {data?.totalResponses || 0} responses have been collected across all surveys.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

