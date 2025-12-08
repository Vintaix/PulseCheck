# PulseCheck

Weekly employee engagement surveys for businesses. Built with Next.js 14, TypeScript, Prisma/PostgreSQL, NextAuth, and AI-powered insights.

## ✨ Features

- 🤖 **AI Question Generation**: Automatically generate weekly survey questions using Groq/OpenRouter AI
- 📊 **AI-Powered Insights**: Get automatic engagement analysis and actionable recommendations
- 👥 **Team Dashboard**: Monitor participation, engagement scores, and trends
- 🎨 **Modern UI**: Clean, minimal interface with EB Garamond typography
- 🌐 **Multilingual**: Full support for Dutch, English, and French
- 🔒 **GDPR-Compliant**: Anonymous feedback, aggregated results

## Quick Start

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (PostgreSQL)
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - `GROQ_API_KEY` or `OPENROUTER_API_KEY` (for AI features)

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma db push
```

4. Seed test data:
```bash
npm run seed
```

5. Start development server:
```bash
npm run dev
```

## Admin Panel

Access the admin panel at `/admin` (HR Manager role required):

- **Response Monitoring**: View recent responses in real-time
- **Question Management**: Add, edit, generate, and manage survey questions
- **AI Configuration**: Configure AI prompts for question generation and insights
- **Database Reset**: Clear all survey data (with confirmation)

## Test Accounts

After seeding:
- **HR Manager**: `hr@test.com` / `password123`
- **Employees**: `employee1@test.com`, `employee2@test.com`, `employee3@test.com` / `password123`

## Roles

- **EMPLOYEE**: Answer weekly survey at `/survey`
- **HR_MANAGER**: View dashboard, manage questions, configure AI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **AI**: Groq/OpenRouter with LLaMA models
- **Font**: DM Sans

## 🚀 Deploy to Vercel

### Required Environment Variables

Add these to your Vercel project settings (**Settings → Environment Variables**):

| Variable | Description | Required |
|----------|-------------|:--------:|
| `DATABASE_URL` | Supabase PostgreSQL connection string. Get from: **Supabase Dashboard → Settings → Database → Connection string** | ✅ |
| `NEXTAUTH_URL` | Your deployed app URL (e.g., `https://your-app.vercel.app`) | ✅ |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | ✅ |
| `GROQ_API_KEY` | Groq AI API key from [console.groq.com](https://console.groq.com/keys) | ✅* |
| `OPENROUTER_API_KEY` | OpenRouter API key (alternative to Groq) | ✅* |
| `HUGGINGFACE_API_KEY` | For sentiment analysis in churn prediction | Optional |

> **\*** At least one of `GROQ_API_KEY` or `OPENROUTER_API_KEY` is required for AI features.

### Deployment Steps

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables listed above
4. Deploy!

The app will automatically:
- Run database migrations via `postinstall` script
- Set up weekly cron job for question generation (Mondays 9:00 AM UTC)
