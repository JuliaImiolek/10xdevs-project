import path from "node:path";
import dotenv from "dotenv";
import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

// Ensure .env.test is loaded in worker (config dotenv may not propagate to workers)
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Loguje użytkownika testowego i czeka na przekierowanie (np. na /generate).
 * Wymaga E2E_USERNAME i E2E_PASSWORD w .env.test.
 * Używane w test hooks (beforeEach) dla testów wymagających zalogowania.
 */
export async function loginAsTestUser(
  page: Page,
  options?: { redirectTo?: string; waitForUrl?: string | RegExp }
): Promise<void> {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_USERNAME i E2E_PASSWORD muszą być ustawione w .env.test do testów wymagających logowania."
    );
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto(options?.redirectTo);
  await loginPage.login(email, password);

  const targetUrl = options?.waitForUrl ?? /\/generate/;
  try {
    await page.waitForURL(targetUrl, { timeout: 15000, waitUntil: "commit" });
  } catch {
    const stillOnLogin = await page.url().includes("/auth/login");
    const formError = stillOnLogin ? await loginPage.formError.textContent().catch(() => null) : null;
    const hint = formError
      ? ` Form error: "${formError.trim()}". Ustaw w .env.test E2E_USERNAME i E2E_PASSWORD zgodne z użytkownikiem utworzonym ręcznie w Supabase (chmura).`
      : " Sprawdź, czy build używa .env.test (SUPABASE_*) i czy dane w .env.test zgadzają się z użytkownikiem w Supabase.";
    throw new Error(`Po logowaniu nie nastąpiło przekierowanie do ${String(targetUrl)}.${hint}`);
  }
}
