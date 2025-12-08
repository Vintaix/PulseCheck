'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import NavBar from '@/components/NavBar';
import { useLocale } from '@/i18n/LocaleContext';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Heart,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Eye
} from "lucide-react";

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

interface ActionPoint {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface DashboardClientProps {
  userName: string;
  weekNumber: number;
  year: number;
  engagementScore: number;
  participationRate: number;
  riskCount: number;
  safeCount: number;
  churnRate: number;
  openFeedback: any[];
  history?: { week: number; score: number }[];
  currentSummary: string;
  actions: ActionPoint[];
}

export default function DashboardClient({
  userName,
  weekNumber,
  year,
  engagementScore,
  participationRate,
  riskCount,
  churnRate,
  history = [],
  currentSummary,
  actions,
}: DashboardClientProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [isGenerating, setIsGenerating] = useState(false);
  const [insightLang, setInsightLang] = useState<'nl' | 'en' | 'fr'>(locale as any || 'en');
  const [translatedSummary, setTranslatedSummary] = useState(currentSummary);
  const [translatedActions, setTranslatedActions] = useState(actions);
  const [isTranslating, setIsTranslating] = useState(false);
  const t = messages[locale as keyof typeof messages] || messages.en;

  // Translation function
  const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (targetLang === 'en' || !text) return text;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: targetLang }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translatedText || text;
    } catch {
      return text;
    }
  }, []);

  // Effect to translate when language changes
  useEffect(() => {
    const doTranslation = async () => {
      if (insightLang === 'en') {
        setTranslatedSummary(currentSummary);
        setTranslatedActions(actions);
        return;
      }

      setIsTranslating(true);
      try {
        // Translate summary
        const translatedSum = await translateText(currentSummary, insightLang);
        setTranslatedSummary(translatedSum);

        // Translate actions
        const translatedActs = await Promise.all(
          actions.map(async (action) => ({
            ...action,
            title: await translateText(action.title, insightLang),
            description: await translateText(action.description, insightLang),
          }))
        );
        setTranslatedActions(translatedActs);
      } catch (error) {
        console.error('Translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    };

    doTranslation();
  }, [insightLang, currentSummary, actions, translateText]);

  // Fetch prediction data
  const { data: prediction } = useSWR<{
    hasPrediction: boolean;
    predictedScore?: number;
    confidence?: 'high' | 'medium' | 'low';
    trend?: 'up' | 'down' | 'stable';
    factors?: string[];
    forWeek?: number;
  }>('/api/predictions/weekly', (url: string) => fetch(url).then(r => r.json()));

  const handleGenerateNextWeek = async () => {
    if (!confirm(t.confirmGenerate)) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/cron/weekly?force=true');
      if (!res.ok) throw new Error('Generation failed');
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Priority order for sorting actions
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const lastScore = history.length > 0 ? history[history.length - 1]?.score : 0;
  const prevScore = history.length > 1 ? history[history.length - 2]?.score : lastScore;
  const scoreTrend = lastScore - prevScore;

  // Mood color helper
  const getMoodColor = (score: number) => {
    if (score >= 4) return 'text-success';
    if (score >= 3) return 'text-warning';
    return 'text-danger';
  };

  const getMoodBg = (score: number) => {
    if (score >= 4) return 'bg-success/10';
    if (score >= 3) return 'bg-warning/10';
    return 'bg-danger/10';
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {t.greeting?.replace('{name}', userName) || `Hello, ${userName}`}
            </h1>
            <p className="text-muted">
              {t.week} {weekNumber}, {year}
            </p>
          </div>
          <button
            onClick={handleGenerateNextWeek}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-background-secondary border border-card-border hover:border-primary text-foreground rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isGenerating ? "animate-spin" : "text-muted"} />
            {isGenerating ? t.generating : t.generateQuestions}
          </button>
        </header>

        {/* Clean Mood Pulse Banner */}
        <div className="paper-card p-6 mb-8 animate-fade-in-delay-1 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${getMoodBg(engagementScore)}`}>
              <Heart className={`w-8 h-8 ${getMoodColor(engagementScore)} heart-initial-pulse`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted uppercase tracking-wide">Team Pulse</span>
                {scoreTrend > 0 && <span className="text-xs text-success font-medium flex items-center"><ArrowUp className="w-3 h-3 mr-0.5" /> +{scoreTrend.toFixed(1)}</span>}
                {scoreTrend < 0 && <span className="text-xs text-danger font-medium flex items-center"><ArrowDown className="w-3 h-3 mr-0.5" /> {scoreTrend.toFixed(1)}</span>}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold tracking-tight ${getMoodColor(engagementScore)}`}>
                  {engagementScore.toFixed(1)}
                </span>
                <span className="text-muted text-lg font-medium">/ 5.0</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block text-right pr-4 border-r border-card-border mr-8 last:border-0 last:mr-0">
            <span className="text-xs text-muted block mb-1">Prediction</span>
            <p className="text-sm font-medium text-foreground">
              {scoreTrend >= 0 ? "📈 Trending Up" : "📉 Needs Attention"}
            </p>
          </div>
        </div>

        {/* Stats Grid - Cleaner Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-delay-2">
          <StatCard
            label={t.engagement}
            value={engagementScore.toFixed(1)}
            suffix="/5"
            icon={<Activity className="w-5 h-5" />}
            color="primary"
          />
          <StatCard
            label={t.participation}
            value={`${participationRate}`}
            suffix="%"
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label={t.churn}
            value={`${churnRate}`}
            suffix="%"
            icon={<TrendingUp className="w-5 h-5" />}
            color="orange"
          />
          <StatCard
            label={t.badAnswers}
            value={`${riskCount}`}
            suffix=""
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Insights - Clean Paper Look */}
            <div className="paper-card p-6 animate-fade-in-delay-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-semibold text-foreground">{t.aiInsight}</h2>
                </div>

                <div className="flex gap-1 bg-background-secondary p-1 rounded-lg">
                  {(['nl', 'en', 'fr'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setInsightLang(lang)}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${insightLang === lang
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted hover:text-foreground'
                        }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-foreground leading-relaxed text-lg">
                {isTranslating ? (
                  <span className="flex items-center gap-2 text-muted">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Translating...
                  </span>
                ) : translatedSummary}
              </p>
            </div>

            {/* Actions */}
            {translatedActions.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-foreground px-1">{t.actionsTitle}</h2>
                <div className="space-y-3">
                  {[...translatedActions]
                    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
                    .slice(0, 3)
                    .map((action, i) => (
                      <div
                        key={i}
                        className="paper-card p-5 hover:shadow-paper-hover transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="font-semibold text-foreground">
                            {isTranslating ? '...' : action.title}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${action.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                            action.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-green-50 text-green-700 border-green-100'
                            }`}>
                            {action.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-muted leading-relaxed">
                          {isTranslating ? 'Translating...' : action.description}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Engagement Trend */}
            <div className="paper-card p-6">
              <h3 className="text-sm font-medium text-muted mb-6">{t.engagementTrend || 'Engagement Trend'}</h3>
              <div className="flex items-end justify-between h-32 gap-2">
                {history.length === 0 ? (
                  <div className="w-full text-center text-muted italic text-sm">No data</div>
                ) : history.map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                    <div
                      className="w-full bg-background-secondary rounded-t-lg transition-colors group-hover:bg-primary/20"
                      style={{ height: `${(h.score / 5) * 100}%` }}
                    />
                    <span className="text-[10px] text-muted font-medium">W{h.week}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="paper-card p-2">
              <QuickLink href="/manager/questions" label={t.questionsAdmin} icon={<MessageSquare size={16} />} />
              <QuickLink href="/manager/ai-config" label={t.aiConfig} icon={<Sparkles size={16} />} />
              <QuickLink href="/dashboard/predictions" label="Churn Prediction" icon={<Zap size={16} />} />
              <QuickLink href="/analytics" label="Analytics" icon={<Activity size={16} />} />
            </div>

            {/* AI Prediction Card */}
            {prediction?.hasPrediction && (
              <div className="paper-card p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">Week {prediction.forWeek} Prediction</h3>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${prediction.predictedScore && prediction.predictedScore >= 4 ? 'text-success' :
                      prediction.predictedScore && prediction.predictedScore >= 3 ? 'text-warning' : 'text-danger'
                      }`}>
                      {prediction.predictedScore?.toFixed(1)}
                    </span>
                    <span className="text-muted text-sm">/ 5.0</span>
                  </div>

                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${prediction.trend === 'up' ? 'bg-green-50 text-success' :
                    prediction.trend === 'down' ? 'bg-red-50 text-danger' : 'bg-gray-50 text-muted'
                    }`}>
                    {prediction.trend === 'up' ? <TrendingUp size={12} /> :
                      prediction.trend === 'down' ? <ArrowDown size={12} /> : <Minus size={12} />}
                    {prediction.trend === 'up' ? 'Up' : prediction.trend === 'down' ? 'Down' : 'Stable'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Confidence</span>
                  <span className={`font-medium ${prediction.confidence === 'high' ? 'text-success' :
                    prediction.confidence === 'medium' ? 'text-warning' : 'text-muted'
                    }`}>
                    {prediction.confidence?.charAt(0).toUpperCase()}{prediction.confidence?.slice(1)}
                  </span>
                </div>

                {prediction.factors && prediction.factors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <p className="text-xs text-muted leading-relaxed">
                      {prediction.factors[0]}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-3 rounded-lg text-sm text-foreground hover:bg-background-secondary transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted group-hover:text-primary transition-colors">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted/50 group-hover:text-foreground transition-colors" />
    </a>
  );
}

function StatCard({ label, value, suffix, icon, color }: {
  label: string; value: string; suffix: string; icon: React.ReactNode; color: 'primary' | 'blue' | 'orange' | 'red';
}) {
  const colors = {
    primary: 'text-primary bg-primary/5',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="paper-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-md ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-xs text-muted font-medium">{suffix}</span>}
      </div>
    </div>
  );
}
