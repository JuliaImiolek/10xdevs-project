-- ---------------------------------------------------------------------------
-- migration: 20250130120002_create_generation_error_logs_table
-- purpose: create generation_error_logs table (log errors per generation attempt).
-- affected: public.generation_error_logs
-- notes: user_id references auth.users(id); generation_id references generations(id).
--        rls restricts access to own rows.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- generation_error_logs: log errors per generation attempt (owned by user)
-- ---------------------------------------------------------------------------
create table if not exists public.generation_error_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id bigint references public.generations(id) on delete set null,
  model varchar not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 10000),
  error_code varchar(100) not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

comment on table public.generation_error_logs is 'logs errors for failed or partial generation attempts; optionally tied to a generation row';

-- index for lookups by user
create index if not exists idx_generation_error_logs_user_id on public.generation_error_logs (user_id);

-- ---------------------------------------------------------------------------
-- row level security (rls)
-- ---------------------------------------------------------------------------
alter table public.generation_error_logs enable row level security;

-- authenticated: select own rows
create policy "generation_error_logs_authenticated_select"
  on public.generation_error_logs for select to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_select" on public.generation_error_logs is 'authenticated users can select only their own error log rows';

-- authenticated: insert own rows
create policy "generation_error_logs_authenticated_insert"
  on public.generation_error_logs for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_insert" on public.generation_error_logs is 'authenticated users can insert only error logs with their own user_id';

-- authenticated: update own rows
create policy "generation_error_logs_authenticated_update"
  on public.generation_error_logs for update to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_update" on public.generation_error_logs is 'authenticated users can update only their own error log rows';

-- authenticated: delete own rows
create policy "generation_error_logs_authenticated_delete"
  on public.generation_error_logs for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_delete" on public.generation_error_logs is 'authenticated users can delete only their own error log rows';

-- anon: no select
create policy "generation_error_logs_anon_select"
  on public.generation_error_logs for select to anon
  using (false);
comment on policy "generation_error_logs_anon_select" on public.generation_error_logs is 'anonymous users cannot select error logs';

-- anon: no insert
create policy "generation_error_logs_anon_insert"
  on public.generation_error_logs for insert to anon
  with check (false);
comment on policy "generation_error_logs_anon_insert" on public.generation_error_logs is 'anonymous users cannot insert error logs';

-- anon: no update
create policy "generation_error_logs_anon_update"
  on public.generation_error_logs for update to anon
  using (false);
comment on policy "generation_error_logs_anon_update" on public.generation_error_logs is 'anonymous users cannot update error logs';

-- anon: no delete
create policy "generation_error_logs_anon_delete"
  on public.generation_error_logs for delete to anon
  using (false);
comment on policy "generation_error_logs_anon_delete" on public.generation_error_logs is 'anonymous users cannot delete error logs';
