import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object dla strony logowania (/auth/login).
 * Zgodnie z Page Object Model – locators, izolacja środowiska.
 */
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly buttonSubmit: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Logowanie" });
    this.inputEmail = page.getByLabel("Adres e-mail");
    this.inputPassword = page.getByLabel("Hasło", { exact: true });
    this.buttonSubmit = page.getByRole("button", { name: /Zaloguj się/ });
    this.formError = page.getByRole("alert").filter({ hasNot: page.getByLabel("Adres e-mail") });
  }

  async goto(redirectTo?: string) {
    const url = redirectTo ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/auth/login";
    await this.page.goto(url);
    await this.inputEmail.waitFor({ state: "visible" });
  }

  async login(email: string, password: string) {
    await this.inputEmail.fill(email);
    await this.inputPassword.fill(password);
    // Ensure React controlled state is updated before submit (avoid "Adres e-mail jest wymagany")
    await expect(this.inputEmail).toHaveValue(email);
    await expect(this.inputPassword).toHaveValue(password);
    await this.buttonSubmit.click();
  }
}
