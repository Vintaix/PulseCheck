'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { ArrowRight, Users, BarChart3, Brain, Shield } from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'HR_MANAGER') {
          router.replace('/dashboard');
        } else {
          router.replace('/survey');
        }
      } else {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-card-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold text-foreground">PulseCheck</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              Sign Up <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-24">
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block mb-6">
              <Logo className="w-16 h-16 mx-auto logo-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Keep Your Team's Pulse<br />
              <span className="text-primary">Strong & Healthy</span>
            </h1>
            <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
              AI-powered employee engagement surveys that help HR managers understand team sentiment,
              predict churn risks, and take action before it's too late.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-background-secondary text-foreground rounded-xl text-base font-medium hover:bg-card-border transition-colors"
              >
                I have an account
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-delay-1">
            <div className="paper-card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Team Surveys</h3>
              <p className="text-sm text-muted">Weekly pulse surveys to measure engagement and satisfaction</p>
            </div>

            <div className="paper-card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI Insights</h3>
              <p className="text-sm text-muted">Smart analysis that turns feedback into actionable insights</p>
            </div>

            <div className="paper-card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Churn Prediction</h3>
              <p className="text-sm text-muted">Identify at-risk employees before they leave</p>
            </div>

            <div className="paper-card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Company Isolation</h3>
              <p className="text-sm text-muted">Multi-tenant with strict data separation per company</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to check your team's pulse?
            </h2>
            <p className="text-muted mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg"
            >
              Sign Up Now <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-card-border">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-sm text-muted">
              &copy; {new Date().getFullYear()} PulseCheck. Built with ❤️ for better workplaces.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
