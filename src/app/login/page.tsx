'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import Logo from '@/components/Logo';
import { AlertCircle, ArrowRight, Mail, Lock } from 'lucide-react';

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { locale } = useLocale();
  const t = messages[locale as keyof typeof messages] || messages.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.user) {
    const role = (session.user as any).role;
    if (role === 'HR_MANAGER') router.replace('/dashboard');
    else router.replace('/survey');
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { redirect: false, email, password });
    setLoading(false);
    if (!res || res.error) {
      setError(t.invalidCredentials || 'Invalid credentials');
      return;
    }
    setTimeout(() => window.location.reload(), 200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block mb-6">
            <Logo className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.welcomeTo} {t.appName}
          </h1>
          <p className="text-muted text-sm">
            {t.loginSubtitle || 'Sign in to your account'}
          </p>
        </div>

        {/* Paper Card Form */}
        <div className="paper-card p-8 animate-fade-in-delay-1">
          <form onSubmit={onSubmit} className="space-y-4">

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t.signIn} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-8">
          &copy; {new Date().getFullYear()} {t.appName}
        </p>
      </div>
    </div>
  );
}
