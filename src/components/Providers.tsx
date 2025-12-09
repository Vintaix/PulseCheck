"use client";
import { ReactNode } from "react";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { ThemeProvider } from "next-themes";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <ThemeProvider attribute="class" enableSystem={true}>
          {children}
        </ThemeProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
