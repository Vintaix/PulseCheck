-- =====================================================
-- RLS POLICIES FOR PULSECHECK AUTHENTICATION
-- Run these SQL commands in Supabase SQL Editor
-- =====================================================

-- Enable Row Level Security on profiles table (if not already enabled)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to read their own profile
-- This is required so the app can fetch the user's role after login
CREATE POLICY "Enable read access for own profile"
ON "public"."profiles"
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Enable update access for own profile"
ON "public"."profiles"
FOR UPDATE
USING (auth.uid() = id);

-- Policy 3: Allow new users to insert their own profile (for signup)
CREATE POLICY "Enable insert access for own profile"
ON "public"."profiles"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- =====================================================
-- VERIFICATION QUERY
-- Run this to verify the policies were created:
-- =====================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'profiles';
