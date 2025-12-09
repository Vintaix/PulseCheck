"use client";
import { ReactNode } from "react";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ThemeProvider attribute="class" enableSystem={true}>
        {children}
      </ThemeProvider>
    </LocaleProvider>
  );
}
