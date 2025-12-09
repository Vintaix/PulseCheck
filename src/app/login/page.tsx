'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import Logo from '@/components/Logo';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Mail, Lock } from 'lucide-react';

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = messages[locale as keyof typeof messages] || messages.en;
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functie om te bepalen waar iemand heen moet
  const handleRedirect = (role: string | undefined) => {
    // Normaliseer de rol naar hoofdletters voor de check
    const upperRole = role?.toUpperCase();

    // Check voor alle management rollen
    const managementRoles = ['HR_MANAGER', 'ADMIN', 'MANAGER'];

    if (upperRole && managementRoles.includes(upperRole)) {
      console.log('Redirecting Manager to /dashboard');
      router.replace('/dashboard');
    } else {
      console.log('Redirecting User to /survey');
      router.replace('/survey');
    }
  };

  // Check if already logged in (Auto-login)
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Gebruiker is al ingelogd, haal rol op
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Auto-login profile fetch error:", error);
          // Bij error niet zomaar doorsturen, maar sessie check stoppen
          setCheckingSession(false);
          return;
        }

        handleRedirect(profile?.role);
      } else {
        setCheckingSession(false);
      }
    }
    checkAuth();
  }, [router, supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Inloggen
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      if (signInError.message.includes('Invalid login credentials')) {
        setError(t.invalidCredentials || 'Invalid email or password');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Please confirm your email address first. Check your inbox.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    // 2. Als login succesvol is, haal profiel op
    if (data.user) {
      console.log("Login successful, fetching profile for:", data.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch failed:", profileError);
        // Fallback: Als we geen profiel kunnen lezen, tonen we een error ipv naar survey te sturen
        setError("Login successful, but could not load profile data. Please contact support.");
        setLoading(false);
        return;
      }

      console.log("Profile found:", profile);
      handleRedirect(profile?.role);
    } else {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Link href="/" className="inline-block mb-6">
            <Logo className="w-12 h-12" />
          </Link>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-card-border focus:border-primary focus:ring-1 focus:ring-primary"
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

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 text-center border-t border-card-border">
            <p className="text-muted text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:text-primary-dark">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-8">
          &copy; {new Date().getFullYear()} {t.appName}
        </p>
      </div>
    </div>
  );
}