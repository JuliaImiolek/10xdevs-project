/**
 * Seeds the default dev user in auth.users so DEFAULT_USER_ID satisfies the FK.
 * Run once: npm run seed:user (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env).
 * Uses the same UUID as src/db/supabase.client.ts DEFAULT_USER_ID.
 */
import { createClient } from "@supabase/supabase-js";

const DEFAULT_USER_ID =
  process.env.DEFAULT_USER_ID ?? "43454c13-032d-4a61-8f7c-356fab613472";
const DEV_EMAIL = "dev-default@localhost";
const DEV_PASSWORD = "dev-default-password";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env and run: node --env-file=.env scripts/seed-default-user.mjs"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await supabase.auth.admin.getUserById(DEFAULT_USER_ID);
  if (existing?.user) {
    console.log("Default user already exists:", existing.user.id);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    id: DEFAULT_USER_ID,
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to create default user:", error.message);
    process.exit(1);
  }
  console.log("Default user created:", data.user.id);
}

main();
