-- ---------------------------------------------------------------------------
-- migration: 20250130120004_seed_default_user
-- purpose: insert default dev user into auth.users so DEFAULT_USER_ID satisfies FK.
--          No Auth/JWT needed; app uses this user without implementing auth.
-- affected: auth.users
-- ---------------------------------------------------------------------------

-- Ensure pgcrypto is available for crypt/gen_salt
create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '43454c13-032d-4a61-8f7c-356fab613472'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'dev-default@localhost',
  crypt('dev-default-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;
