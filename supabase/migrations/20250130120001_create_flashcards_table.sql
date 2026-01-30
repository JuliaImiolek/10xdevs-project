-- ---------------------------------------------------------------------------
-- migration: 20250130120001_create_flashcards_table
-- purpose: create flashcards table (user-owned cards; optionally linked to a generation).
-- affected: public.flashcards
-- notes: user_id references auth.users(id); generation_id references generations(id).
--        rls restricts access to own rows. trigger updates updated_at on row update.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- flashcards: user-owned cards; optionally linked to a generation
-- ---------------------------------------------------------------------------
create table if not exists public.flashcards (
  id bigserial primary key,
  front varchar(200) not null,
  back varchar(500) not null,
  source varchar not null check (source in ('AI-FULL', 'AI-EDITED', 'MANUAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generation_id bigint references public.generations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade
);

comment on table public.flashcards is 'user-owned flashcard rows; source indicates origin (ai full, ai edited, or manual)';
comment on column public.flashcards.generation_id is 'optional link to the generation that produced this card; set null if generation is deleted';

-- trigger: keep updated_at in sync on row update
create or replace function public.set_flashcards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_flashcards_updated_at() is 'sets updated_at to now() on flashcards update';

create trigger flashcards_updated_at
  before update on public.flashcards
  for each row
  execute function public.set_flashcards_updated_at();

-- indexes for lookups by user and by generation
create index if not exists idx_flashcards_user_id on public.flashcards (user_id);
create index if not exists idx_flashcards_generation_id on public.flashcards (generation_id);

-- ---------------------------------------------------------------------------
-- row level security (rls)
-- ---------------------------------------------------------------------------
alter table public.flashcards enable row level security;

-- authenticated: select own rows
create policy "flashcards_authenticated_select"
  on public.flashcards for select to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_select" on public.flashcards is 'authenticated users can select only their own flashcards';

-- authenticated: insert own rows
create policy "flashcards_authenticated_insert"
  on public.flashcards for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "flashcards_authenticated_insert" on public.flashcards is 'authenticated users can insert only flashcards with their own user_id';

-- authenticated: update own rows
create policy "flashcards_authenticated_update"
  on public.flashcards for update to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_update" on public.flashcards is 'authenticated users can update only their own flashcards';

-- authenticated: delete own rows
create policy "flashcards_authenticated_delete"
  on public.flashcards for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_delete" on public.flashcards is 'authenticated users can delete only their own flashcards';

-- anon: no select
create policy "flashcards_anon_select"
  on public.flashcards for select to anon
  using (false);
comment on policy "flashcards_anon_select" on public.flashcards is 'anonymous users cannot select flashcards';

-- anon: no insert
create policy "flashcards_anon_insert"
  on public.flashcards for insert to anon
  with check (false);
comment on policy "flashcards_anon_insert" on public.flashcards is 'anonymous users cannot insert flashcards';

-- anon: no update
create policy "flashcards_anon_update"
  on public.flashcards for update to anon
  using (false);
comment on policy "flashcards_anon_update" on public.flashcards is 'anonymous users cannot update flashcards';

-- anon: no delete
create policy "flashcards_anon_delete"
  on public.flashcards for delete to anon
  using (false);
comment on policy "flashcards_anon_delete" on public.flashcards is 'anonymous users cannot delete flashcards';
