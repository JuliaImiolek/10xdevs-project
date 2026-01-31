-- ---------------------------------------------------------------------------
-- migration: 20250131140000_enable_rls_policies
-- purpose: enable RLS and create policies so authorization is enforced by
--          the database (auth.uid() = user_id). Aligns with .ai/auth-spec.md
--          and US-006: only authenticated users access their own rows; anon
--          has no access.
-- affected: public.flashcards, public.generations, public.generation_error_logs
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- flashcards: enable RLS and policies
-- ---------------------------------------------------------------------------
alter table public.flashcards enable row level security;

create policy "flashcards_authenticated_select"
  on public.flashcards for select to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_select" on public.flashcards is 'authenticated users can select only their own flashcards';

create policy "flashcards_authenticated_insert"
  on public.flashcards for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "flashcards_authenticated_insert" on public.flashcards is 'authenticated users can insert only flashcards with their own user_id';

create policy "flashcards_authenticated_update"
  on public.flashcards for update to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_update" on public.flashcards is 'authenticated users can update only their own flashcards';

create policy "flashcards_authenticated_delete"
  on public.flashcards for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "flashcards_authenticated_delete" on public.flashcards is 'authenticated users can delete only their own flashcards';

create policy "flashcards_anon_select"
  on public.flashcards for select to anon
  using (false);
comment on policy "flashcards_anon_select" on public.flashcards is 'anonymous users cannot select flashcards';

create policy "flashcards_anon_insert"
  on public.flashcards for insert to anon
  with check (false);
comment on policy "flashcards_anon_insert" on public.flashcards is 'anonymous users cannot insert flashcards';

create policy "flashcards_anon_update"
  on public.flashcards for update to anon
  using (false);
comment on policy "flashcards_anon_update" on public.flashcards is 'anonymous users cannot update flashcards';

create policy "flashcards_anon_delete"
  on public.flashcards for delete to anon
  using (false);
comment on policy "flashcards_anon_delete" on public.flashcards is 'anonymous users cannot delete flashcards';

-- ---------------------------------------------------------------------------
-- generations: enable RLS and policies
-- ---------------------------------------------------------------------------
alter table public.generations enable row level security;

create policy "generations_authenticated_select"
  on public.generations for select to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_select" on public.generations is 'authenticated users can select only their own generation rows';

create policy "generations_authenticated_insert"
  on public.generations for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "generations_authenticated_insert" on public.generations is 'authenticated users can insert only rows with their own user_id';

create policy "generations_authenticated_update"
  on public.generations for update to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_update" on public.generations is 'authenticated users can update only their own generation rows';

create policy "generations_authenticated_delete"
  on public.generations for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "generations_authenticated_delete" on public.generations is 'authenticated users can delete only their own generation rows';

create policy "generations_anon_select"
  on public.generations for select to anon
  using (false);
comment on policy "generations_anon_select" on public.generations is 'anonymous users cannot select any generations';

create policy "generations_anon_insert"
  on public.generations for insert to anon
  with check (false);
comment on policy "generations_anon_insert" on public.generations is 'anonymous users cannot insert generations';

create policy "generations_anon_update"
  on public.generations for update to anon
  using (false);
comment on policy "generations_anon_update" on public.generations is 'anonymous users cannot update generations';

create policy "generations_anon_delete"
  on public.generations for delete to anon
  using (false);
comment on policy "generations_anon_delete" on public.generations is 'anonymous users cannot delete generations';

-- ---------------------------------------------------------------------------
-- generation_error_logs: enable RLS and policies
-- ---------------------------------------------------------------------------
alter table public.generation_error_logs enable row level security;

create policy "generation_error_logs_authenticated_select"
  on public.generation_error_logs for select to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_select" on public.generation_error_logs is 'authenticated users can select only their own error log rows';

create policy "generation_error_logs_authenticated_insert"
  on public.generation_error_logs for insert to authenticated
  with check (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_insert" on public.generation_error_logs is 'authenticated users can insert only error logs with their own user_id';

create policy "generation_error_logs_authenticated_update"
  on public.generation_error_logs for update to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_update" on public.generation_error_logs is 'authenticated users can update only their own error log rows';

create policy "generation_error_logs_authenticated_delete"
  on public.generation_error_logs for delete to authenticated
  using (auth.uid() = user_id);
comment on policy "generation_error_logs_authenticated_delete" on public.generation_error_logs is 'authenticated users can delete only their own error log rows';

create policy "generation_error_logs_anon_select"
  on public.generation_error_logs for select to anon
  using (false);
comment on policy "generation_error_logs_anon_select" on public.generation_error_logs is 'anonymous users cannot select error logs';

create policy "generation_error_logs_anon_insert"
  on public.generation_error_logs for insert to anon
  with check (false);
comment on policy "generation_error_logs_anon_insert" on public.generation_error_logs is 'anonymous users cannot insert error logs';

create policy "generation_error_logs_anon_update"
  on public.generation_error_logs for update to anon
  using (false);
comment on policy "generation_error_logs_anon_update" on public.generation_error_logs is 'anonymous users cannot update error logs';

create policy "generation_error_logs_anon_delete"
  on public.generation_error_logs for delete to anon
  using (false);
comment on policy "generation_error_logs_anon_delete" on public.generation_error_logs is 'anonymous users cannot delete error logs';
