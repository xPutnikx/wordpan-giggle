-- Add translation support columns to words table
alter table public.words
  add column base_word text,
  add column language text default 'en',
  add column translation_of uuid references public.words(id) on delete cascade;

-- Update existing words to have base_word = word and language = 'en'
update public.words
set base_word = word,
    language = 'en'
where base_word is null;

-- Add comment to explain the structure
comment on column public.words.base_word is 'The core/base word in English';
comment on column public.words.language is 'ISO 639-1 language code for this word (e.g., en, es, fr)';
comment on column public.words.translation_of is 'Reference to the base word if this is a translation';

