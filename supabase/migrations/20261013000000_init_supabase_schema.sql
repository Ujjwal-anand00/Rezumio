-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- Tables: profiles, original_resumes, resume_versions
-- Row Level Security (RLS) enabled on all user-owned tables
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ORIGINAL RESUMES TABLE
CREATE TABLE IF NOT EXISTS public.original_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'DOCX', 'pdf', 'docx')),
    protected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    original_resume_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. RESUME VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_resume_id UUID REFERENCES public.original_resumes(id) ON DELETE SET NULL,
    parent_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL DEFAULT '',
    company_name TEXT,
    job_description TEXT NOT NULL DEFAULT '',
    target_tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
    resume_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    professional_summary TEXT NOT NULL DEFAULT '',
    match_score NUMERIC,
    version_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR FAST RETRIEVAL & USER ISOLATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_original_resumes_user_id ON public.original_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON public.resume_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_created ON public.resume_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_versions_original_id ON public.resume_versions(original_resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_parent_id ON public.resume_versions(parent_version_id);

-- ==============================================================================
-- AUTOMATIC updated_at TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_original_resumes_updated_at ON public.original_resumes;
CREATE TRIGGER set_original_resumes_updated_at
    BEFORE UPDATE ON public.original_resumes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_resume_versions_updated_at ON public.resume_versions;
CREATE TRIGGER set_resume_versions_updated_at
    BEFORE UPDATE ON public.resume_versions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON auth.users SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user-level access isolation: auth.uid()
-- ==============================================================================

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. ORIGINAL RESUMES RLS
ALTER TABLE public.original_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own original resumes" ON public.original_resumes;
CREATE POLICY "Users can select own original resumes"
    ON public.original_resumes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own original resumes" ON public.original_resumes;
CREATE POLICY "Users can insert own original resumes"
    ON public.original_resumes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own original resumes" ON public.original_resumes;
CREATE POLICY "Users can update own original resumes"
    ON public.original_resumes FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own original resumes" ON public.original_resumes;
CREATE POLICY "Users can delete own original resumes"
    ON public.original_resumes FOR DELETE
    USING (auth.uid() = user_id);

-- 3. RESUME VERSIONS RLS
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own resume versions" ON public.resume_versions;
CREATE POLICY "Users can select own resume versions"
    ON public.resume_versions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resume versions" ON public.resume_versions;
CREATE POLICY "Users can insert own resume versions"
    ON public.resume_versions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resume versions" ON public.resume_versions;
CREATE POLICY "Users can update own resume versions"
    ON public.resume_versions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resume versions" ON public.resume_versions;
CREATE POLICY "Users can delete own resume versions"
    ON public.resume_versions FOR DELETE
    USING (auth.uid() = user_id);
