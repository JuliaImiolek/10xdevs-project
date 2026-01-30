-- ---------------------------------------------------------------------------
-- migration: 20250130120003_disable_rls_policies
-- purpose: drop all RLS policies and disable RLS on flashcards, generations,
--          and generation_error_logs (as defined in prior migrations).
-- affected: public.flashcards, public.generations, public.generation_error_logs
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- flashcards: drop policies then disable RLS
-- ---------------------------------------------------------------------------
drop policy if exists "flashcards_authenticated_select" on public.flashcards;
drop policy if exists "flashcards_authenticated_insert" on public.flashcards;
drop policy if exists "flashcards_authenticated_update" on public.flashcards;
drop policy if exists "flashcards_authenticated_delete" on public.flashcards;
drop policy if exists "flashcards_anon_select" on public.flashcards;
drop policy if exists "flashcards_anon_insert" on public.flashcards;
drop policy if exists "flashcards_anon_update" on public.flashcards;
drop policy if exists "flashcards_anon_delete" on public.flashcards;

alter table public.flashcards disable row level security;

-- ---------------------------------------------------------------------------
-- generations: drop policies then disable RLS
-- ---------------------------------------------------------------------------
drop policy if exists "generations_authenticated_select" on public.generations;
drop policy if exists "generations_authenticated_insert" on public.generations;
drop policy if exists "generations_authenticated_update" on public.generations;
drop policy if exists "generations_authenticated_delete" on public.generations;
drop policy if exists "generations_anon_select" on public.generations;
drop policy if exists "generations_anon_insert" on public.generations;
drop policy if exists "generations_anon_update" on public.generations;
drop policy if exists "generations_anon_delete" on public.generations;

alter table public.generations disable row level security;

-- ---------------------------------------------------------------------------
-- generation_error_logs: drop policies then disable RLS
-- ---------------------------------------------------------------------------
drop policy if exists "generation_error_logs_authenticated_select" on public.generation_error_logs;
drop policy if exists "generation_error_logs_authenticated_insert" on public.generation_error_logs;
drop policy if exists "generation_error_logs_authenticated_update" on public.generation_error_logs;
drop policy if exists "generation_error_logs_authenticated_delete" on public.generation_error_logs;
drop policy if exists "generation_error_logs_anon_select" on public.generation_error_logs;
drop policy if exists "generation_error_logs_anon_insert" on public.generation_error_logs;
drop policy if exists "generation_error_logs_anon_update" on public.generation_error_logs;
drop policy if exists "generation_error_logs_anon_delete" on public.generation_error_logs;

alter table public.generation_error_logs disable row level security;
