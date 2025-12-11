// Import the singleton Prisma client to prevent connection pool exhaustion
import { prisma } from "./prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // This app uses Supabase Auth, not local password authentication.
        // The CredentialsProvider is kept for compatibility but auth is handled by Supabase.
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        // Note: Password verification is handled by Supabase Auth, not here.
        // This provider exists for NextAuth session compatibility only.
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // attach role
        // This also uses the local "prisma" variable
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "HR_MANAGER";
};