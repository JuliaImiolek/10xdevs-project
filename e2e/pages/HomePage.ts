import type { Locator, Page } from "@playwright/test";

/**
 * Page Object dla strony głównej (index).
 * Zgodnie z Page Object Model – selekcja przez locators, izolacja środowiska przez kontekst przeglądarki.
 */
export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly linkLogin: Locator;
  readonly linkRegister: Locator;
  readonly linkGenerate: Locator;
  readonly linkFlashcards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "10x-cards" });
    this.linkLogin = page.getByRole("link", { name: "Zaloguj się" });
    this.linkRegister = page.getByRole("link", { name: "Zarejestruj się" });
    this.linkGenerate = page.getByRole("link", { name: "Generuj fiszki" });
    this.linkFlashcards = page.getByRole("link", { name: "Moje fiszki" });
  }

  async goto() {
    await this.page.goto("/");
  }

  async getHeadingText(): Promise<string> {
    return this.heading.textContent() ?? "";
  }
}
