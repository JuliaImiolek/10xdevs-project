-- ---------------------------------------------------------------------------
-- migration: 20250130120000_create_generations_table
-- purpose: create generations table (one record per ai generation run).
-- affected: public.generations
-- notes: user_id references auth.users(id). rls restricts access to own rows.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- generations: one record per ai generation run (owned by user)
-- ---------------------------------------------------------------------------
create table if not exists public.generations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar not null,
  generated_count integer not null,
  accepted_unedited_count integer,
  accepted_edited_count integer not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 10000),
  generation_duration integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.generations is 'tracks each ai flashcard generation run for a user';
comment on column public.generations.source_text_length is 'length of source text; must be between 1000 and 10000 characters';

-- trigger: keep generations.updated_at in sync on row update
create or replace function public.set_generations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger generations_updated_at
  before update on public.generations
  for each row
  execute function public.set_generations_updated_at();

-- index for lookups by user
create index if not exists idx_generations_user_id on public.generations (user_id);

-- ---------------------------------------------------------------------------
-- row level security (rls)
-- ---------------------------------------------------------------------------
alter table public.generations enable row level security;

-- authenticated: select own rows
create policy "generations_authenticated_select"
  on public.generations for select to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_select" on public.generations is 'authenticated users can select only their own generation rows';

-- authenticated: insert own rows (enforce user_id = auth.uid())
create policy "generations_authenticated_insert"
  on public.generations for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "generations_authenticated_insert" on public.generations is 'authenticated users can insert only rows with their own user_id';

-- authenticated: update own rows
create policy "generations_authenticated_update"
  on public.generations for update to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_update" on public.generations is 'authenticated users can update only their own generation rows';

-- authenticated: delete own rows
create policy "generations_authenticated_delete"
  on public.generations for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_delete" on public.generations is 'authenticated users can delete only their own generation rows';

-- anon: no select
create policy "generations_anon_select"
  on public.generations for select to anon
  using (false);
comment on policy "generations_anon_select" on public.generations is 'anonymous users cannot select any generations';

-- anon: no insert
create policy "generations_anon_insert"
  on public.generations for insert to anon
  with check (false);
comment on policy "generations_anon_insert" on public.generations is 'anonymous users cannot insert generations';

-- anon: no update
create policy "generations_anon_update"
  on public.generations for update to anon
  using (false);
comment on policy "generations_anon_update" on public.generations is 'anonymous users cannot update generations';

-- anon: no delete
create policy "generations_anon_delete"
  on public.generations for delete to anon
  using (false);
comment on policy "generations_anon_delete" on public.generations is 'anonymous users cannot delete generations';
