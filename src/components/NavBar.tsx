'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useLocale } from '@/i18n/LocaleContext';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import { LogOut, ChevronDown, LayoutDashboard, MessageSquare, BarChart2 } from 'lucide-react';

import { en } from "@/i18n/messages/en";
import { nl } from "@/i18n/messages/nl";
import { fr } from "@/i18n/messages/fr";

const messages = { en, nl, fr };

export default function NavBar() {
  const { user, loading, signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const t = messages[locale as keyof typeof messages] || messages.en;

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) return null;
  if (!user) return null;

  const role = user.role?.toLowerCase();
  const isHR = role === 'hr_manager' || role === 'admin';
  const isActive = (path: string) => pathname === path;
  const isActivePrefix = (prefix: string) => pathname.startsWith(prefix);

  return (
    <nav className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-card-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href={isHR ? "/analytics" : "/survey"}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <Logo className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight text-foreground">
              {t.appName}
            </span>
          </Link>

          {/* Navigation Links - Only for HR */}
          {isHR && (
            <div className="hidden md:flex items-center gap-2">
              <NavLink
                href="/analytics"
                isActive={isActive('/analytics')}
                icon={<LayoutDashboard className="w-4 h-4" />}
              >
                {t.dashboard}
              </NavLink>
              <NavLink
                href="/manager/questions"
                isActive={isActivePrefix('/manager')}
                icon={<MessageSquare className="w-4 h-4" />}
              >
                {t.questionsAdmin}
              </NavLink>
              <NavLink
                href="/analytics"
                isActive={isActive('/analytics')}
                icon={<BarChart2 className="w-4 h-4" />}
              >
                Analytics
              </NavLink>
            </div>
          )}

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* Language selector - Simple clean style */}
            <div className="relative group">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'nl' | 'fr')}
                className="appearance-none bg-transparent text-sm font-medium text-foreground hover:text-primary focus:outline-none cursor-pointer pr-5 py-1 transition-colors"
              >
                <option value="en">EN</option>
                <option value="nl">NL</option>
                <option value="fr">FR</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none group-hover:text-primary transition-colors" />
            </div>

            <div className="h-4 w-px bg-card-border"></div>

            {/* User info */}
            <span className="text-sm text-muted hidden md:block truncate max-w-[200px]">
              {user.email}
            </span>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  isActive,
  icon,
  children
}: {
  href: string;
  isActive: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-muted hover:text-foreground hover:bg-background-secondary'
        }`}
    >
      {icon}
      {children}
    </Link>
  );
}
