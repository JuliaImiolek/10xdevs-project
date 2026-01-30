# Database Schema - PostgreSQL

## 1. Tables

### 1.1. users

The `users` table is managed by Supabase Auth. 
- id: UUID PRIMARY KEY
- email: VARCHAR(255) NOT NULL UNIQUE
- encrypted_password: VARCHAR NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- confirmed_at: TIMESTAMPTZ
---

### 1.2. flashcards

- ID: bigserial primary key
- front: VARCHAR(200) NOT NULL
- back: VARCHAR(500) NOT NULL
- source: VARCHAT NOT NULL CHECK (SOURCE in ('AI-FULL", "AI-EDITED', 'MANUAL'))
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- generation_id: BIGINT REFERENCES generations(id) ON DELETE SET NULL
- user_id: UUID NOT NULL REFERENCES users(id)

*Trigger: Automatically update the 'updated_at' column on record uodated.*

---

### 1.3. generations

- id: BIGSERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id)
- model: VARCHAR NOT NULL
- generated_count: INTEGER NOT NULL
- accepted_unedited_count: INTEGER NULLABLE
- accepted_edited_count: INTEGER NOT NULLABLE
- source_text_hash: VARCHAR NOT NULL
- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- generation_duration: INTEGER NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()


---

### 1.4. generation_error_logs

- id: BIGSERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id)
- model: VARCHAR NOT NULL
- source_text_hash: VARCHAR NOT NULL
- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- error_code: VARCHAR(100) NOT NULL
- error_message: TEXT NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

---

## 2. Relationships Between Tables

- `flashcards.user_id` → `users(id)`: One-to-many relationship (one user can have many flashcards).
- `generations` → `users(id)`: One-to-many relationship (one user can have many generations).
- `generation_error_logs.generation_id` → `users(id)`: One-to-many relationship (one user can have many records in generation_error_logs).
- `flashcards.generation_id` → `generations(id)`: One-to-many relationship (one generation can be associated with many flashcards).
- `generations(id)` → `flashcards.generation_id`: each card can optionally refer to one generation (generations) via generation_id 
- `generation_error_logs.generation_id` → `generations(id)`: One-to-many relationship (a single generation may have multiple error logs).

## 3. Indexes

- Index on column `user_id` in table flashcards.
- Index on `generation_id` in table flashcards.
- Index on `user_id` in table generations.
- Inex in kolumn `user_id` in table generation_error_logs

## 4. RLS rules (Row-Level Security)

- Implement RLS policies in the flashcards, generations and generation_error_logs tables that allow the user to access only records where `user_id` corresponds to the user ID from Supabase Auth (e.g. auth.uid() = user_id).


## 6. Additional Notes

- The trigger in the flashcards tables is supposed to automatically update the `updated_at` column whenever a record is modified.