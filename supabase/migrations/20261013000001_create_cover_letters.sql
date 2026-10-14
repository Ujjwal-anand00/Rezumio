-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA MIGRATION: cover_letters
-- Table: cover_letters with Row Level Security (RLS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Cover Letter',
    candidate_name TEXT,
    job_title TEXT,
    company_name TEXT,
    cover_letter_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON public.cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_created ON public.cover_letters(user_id, created_at DESC);

-- Updated at trigger
DROP TRIGGER IF EXISTS set_cover_letters_updated_at ON public.cover_letters;
CREATE TRIGGER set_cover_letters_updated_at
    BEFORE UPDATE ON public.cover_letters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own cover letters" ON public.cover_letters;
CREATE POLICY "Users can select own cover letters"
    ON public.cover_letters FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cover letters" ON public.cover_letters;
CREATE POLICY "Users can insert own cover letters"
    ON public.cover_letters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cover letters" ON public.cover_letters;
CREATE POLICY "Users can update own cover letters"
    ON public.cover_letters FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cover letters" ON public.cover_letters;
CREATE POLICY "Users can delete own cover letters"
    ON public.cover_letters FOR DELETE
    USING (auth.uid() = user_id);
