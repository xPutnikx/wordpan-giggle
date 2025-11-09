-- Create user_word_pairs table for personal learning notebook
create table public.user_word_pairs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_word text not null,
  target_word text not null,
  mastered boolean default false not null,
  times_practiced integer default 0 not null,
  times_correct integer default 0 not null,
  times_wrong integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_word_pairs enable row level security;

-- Create policies for user_word_pairs table
-- Allow users to read their own word pairs
create policy "Users can view their own word pairs"
  on public.user_word_pairs
  for select
  using (auth.uid() = user_id);

-- Allow users to insert their own word pairs
create policy "Users can insert their own word pairs"
  on public.user_word_pairs
  for insert
  with check (auth.uid() = user_id);

-- Allow users to update their own word pairs
create policy "Users can update their own word pairs"
  on public.user_word_pairs
  for update
  using (auth.uid() = user_id);

-- Allow users to delete their own word pairs
create policy "Users can delete their own word pairs"
  on public.user_word_pairs
  for delete
  using (auth.uid() = user_id);

-- Create indexes for better query performance
create index user_word_pairs_user_id_idx on public.user_word_pairs(user_id);
create index user_word_pairs_mastered_idx on public.user_word_pairs(mastered);
create index user_word_pairs_created_at_idx on public.user_word_pairs(created_at);

-- Create function to update updated_at timestamp
create or replace function public.update_user_word_pairs_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_user_word_pairs_updated_at
  before update on public.user_word_pairs
  for each row execute procedure public.update_user_word_pairs_updated_at();

