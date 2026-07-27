-- Ensure required extensions are available (Supabase projects usually already
-- have these, but this makes the migration set self-contained/reproducible).
create extension if not exists pgcrypto with schema extensions;
