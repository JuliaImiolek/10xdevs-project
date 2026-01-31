-- ---------------------------------------------------------------------------
-- migration: 20250131120000_add_flashcards_srs_columns
-- purpose: add SRS (SM-2) columns to flashcards for spaced repetition.
-- affected: public.flashcards
-- notes: RLS remains disabled (per 20250130120003). New columns nullable/default
--        so existing rows get sensible defaults; next_review_at NULL = due now.
-- ---------------------------------------------------------------------------

-- next_review_at: when the card is due for review; null = never reviewed / always due
alter table public.flashcards
  add column if not exists next_review_at timestamptz;

comment on column public.flashcards.next_review_at is 'SRS: when this card is due for review; null means never reviewed (always due)';

-- interval_days: SM-2 inter-repetition interval in days
alter table public.flashcards
  add column if not exists interval_days integer not null default 0;

comment on column public.flashcards.interval_days is 'SRS (SM-2): inter-repetition interval in days';

-- repetitions: SM-2 count of continuous correct responses
alter table public.flashcards
  add column if not exists repetitions integer not null default 0;

comment on column public.flashcards.repetitions is 'SRS (SM-2): count of continuous correct responses';

-- ease_factor: SM-2 easiness factor (typical initial 2.5)
alter table public.flashcards
  add column if not exists ease_factor numeric(6,4) not null default 2.5;

comment on column public.flashcards.ease_factor is 'SRS (SM-2): easiness factor';

-- index for session query: due cards (next_review_at is null or <= now()) by user
create index if not exists idx_flashcards_user_next_review
  on public.flashcards (user_id, next_review_at);
