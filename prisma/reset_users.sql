-- =============================================================
-- RESET ALL USERS SCRIPT
-- =============================================================
-- WARNING: This will delete ALL users and their associated data!
-- Run this in your Supabase Dashboard > SQL Editor
-- =============================================================

-- Step 1: Delete all data from public tables that reference users
-- (Adjust table names based on your actual schema)

-- Delete insights
DELETE FROM public."Insight" WHERE "userId" IS NOT NULL;

-- Delete responses  
DELETE FROM public."Response";

-- Delete action caches (they reference surveys, not users directly)
DELETE FROM public."ActionCache";

-- Delete surveys
DELETE FROM public."Survey";

-- Delete questions
DELETE FROM public."Question";

-- Delete weekly sentiment
DELETE FROM public."WeeklySentiment";

-- Delete AI Config (optional - you may want to keep this)
-- DELETE FROM public."AIConfig";

-- Step 2: Delete all profiles
DELETE FROM public.profiles;

-- Step 3: Delete all departments (if created)
DELETE FROM public.departments WHERE true;

-- Step 4: Delete all companies
DELETE FROM public.companies WHERE true;

-- Step 5: Delete all users from auth.users
-- This requires being executed with service_role privileges
DELETE FROM auth.users;

-- =============================================================
-- VERIFICATION: Run these to confirm cleanup
-- =============================================================
-- SELECT COUNT(*) as remaining_users FROM auth.users;
-- SELECT COUNT(*) as remaining_profiles FROM public.profiles;
-- SELECT COUNT(*) as remaining_companies FROM public.companies;

-- =============================================================
-- DONE! All users have been reset.
-- =============================================================
