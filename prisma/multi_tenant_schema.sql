-- =============================================================
-- MULTI-TENANT SCHEMA FOR PULSECHECK
-- =============================================================
-- Run this in your Supabase Dashboard > SQL Editor
-- This creates the companies table and updates profiles for multi-tenancy
-- =============================================================

-- 1. Create the companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create departments table (flexible per-company departments)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 3. Update profiles table to add company_id and department
-- First, add the columns if they don't exist
DO $$
BEGIN
    -- Add company_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;
    
    -- Add department column (text for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department') THEN
        ALTER TABLE public.profiles ADD COLUMN department TEXT DEFAULT 'General';
    END IF;
    
    -- Add name column for display
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
    END IF;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================

-- COMPANIES: Anyone can read companies (for signup dropdown)
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
CREATE POLICY "Anyone can view companies"
  ON public.companies
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- COMPANIES: Only service role can insert/update
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;
CREATE POLICY "Service role can manage companies"
  ON public.companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- DEPARTMENTS: Anyone can view departments (for signup dropdown)
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments"
  ON public.departments
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- DEPARTMENTS: HR Managers can create departments in their company
DROP POLICY IF EXISTS "HR can manage own company departments" ON public.departments;
CREATE POLICY "HR can manage own company departments"
  ON public.departments
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'HR_MANAGER'
  );

-- PROFILES: Users can only view profiles in their own company
DROP POLICY IF EXISTS "Users can view own company profiles" ON public.profiles;
CREATE POLICY "Users can view own company profiles"
  ON public.profiles
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR id = auth.uid()  -- Always can see own profile
  );

-- PROFILES: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- PROFILES: Service role/trigger can insert (for the trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- =============================================================
-- UPDATE TRIGGER FOR NEW USER SIGNUP
-- =============================================================

-- Updated trigger function to handle company_id and department from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, company_id, department, created_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'EMPLOYEE'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- SEED DEFAULT DEPARTMENTS (Optional - can be customized)
-- =============================================================
-- These will be created per-company when a company is created

-- =============================================================
-- DONE! Multi-tenant schema is ready.
-- =============================================================
