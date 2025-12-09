'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { useLocale } from '@/i18n/LocaleContext';
import { CheckCircle, Send, AlertTriangle } from 'lucide-react';

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

type Question = { id: string; text: string; type: 'SCALE_1_5' | 'OPEN' };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SurveyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { locale } = useLocale();
  const t = messages[locale as keyof typeof messages] || messages.en;

  const role = user?.role?.toLowerCase();
  const isEmployee = role === 'employee' || !role; // Default to employee if no role

  useEffect(() => {
    if (!loading && user && !isEmployee) router.replace('/manager');
  }, [loading, user, isEmployee, router]);

  const { data: initData } = useSWR(!loading && user ? '/api/survey/init' : null, fetcher);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const questions: Question[] = useMemo(() => initData?.questions || [], [initData?.questions]);
  const alreadyAnswered: boolean = Boolean(initData?.alreadyAnswered);

  const canSubmit = useMemo(() => {
    if (!questions?.length) return false;
    return questions.every((q: Question) => {
      if (q.type === 'SCALE_1_5') return ['1', '2', '3', '4', '5'].includes(answers[q.id]);
      return (answers[q.id]?.trim()?.length || 0) > 0;
    });
  }, [questions, answers]);

  const onSubmit = async () => {
    setSubmitting(true);
    const payload = questions.map((q) => ({ questionId: q.id, value: answers[q.id] }));
    const res = await fetch('/api/survey/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) window.location.reload();
    setSubmitting(false);
  };

  if (alreadyAnswered) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="max-w-xl mx-auto px-6 py-20">
          <div className="paper-card p-12 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              {t.thankYou}
            </h1>
            <p className="text-muted text-lg">
              {t.responseRecorded}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <span className="text-sm font-semibold text-primary mb-2 block tracking-wide uppercase">
            Weekly Check-in
          </span>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t.weeklyPulseCheck}
          </h1>
          <p className="text-muted text-lg">
            {t.surveyDescription}
          </p>
        </div>

        {/* Progress Bar */}
        {questions.length > 0 && (
          <div className="mb-8 animate-fade-in-delay-1">
            <div className="flex justify-between text-xs font-semibold text-muted mb-2 uppercase tracking-wide">
              <span>Your Progress</span>
              <span>{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Question List */}
        <div className="space-y-6">
          {questions?.map((q: Question, index) => (
            <div
              key={q.id}
              className={`paper-card p-6 transition-all animate-fade-in ${answers[q.id] ? 'border-primary/30 ring-1 ring-primary/10' : ''
                }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4 mb-6">
                <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${answers[q.id] ? 'bg-primary text-white' : 'bg-background-secondary text-muted'
                  }`}>
                  {answers[q.id] ? <CheckCircle size={14} /> : index + 1}
                </span>
                <p className="text-lg font-medium text-foreground">{q.text}</p>
              </div>

              {q.type === 'SCALE_1_5' ? (
                <div className="flex gap-4 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`w-12 h-12 rounded-xl font-semibold text-lg transition-all ${answers[q.id] === String(n)
                        ? 'bg-primary text-white shadow-md transform scale-110'
                        : 'bg-background-secondary text-foreground hover:bg-background-secondary/80 hover:scale-105'
                        }`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={4}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder={t.typeAnswer}
                  className="w-full p-4 rounded-xl text-foreground text-lg resize-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex items-center justify-between animate-fade-in-delay-2">
          <a
            href="mailto:help@pulsecheck.io"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <AlertTriangle size={14} />
            {t.reportBug}
          </a>

          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {t.submit} <Send size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
