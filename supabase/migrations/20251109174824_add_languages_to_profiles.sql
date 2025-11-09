-- Add language columns to profiles table
alter table public.profiles
  add column native_language text,
  add column target_language text;

-- Add comment to explain these are ISO 639-1 language codes
comment on column public.profiles.native_language is 'ISO 639-1 language code for user native language (e.g., en, es, fr)';
comment on column public.profiles.target_language is 'ISO 639-1 language code for user target language (e.g., en, es, fr)';

