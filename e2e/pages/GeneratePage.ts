import type { Locator, Page } from "@playwright/test";

/** Limity znaków (reguły biznesowe) – zgodne z TextInputArea i ManualFlashcardForm. */
export const TEXT_INPUT_MIN_LENGTH = 1000;
export const TEXT_INPUT_MAX_LENGTH = 10000;
export const MANUAL_FRONT_MAX = 200;
export const MANUAL_BACK_MAX = 500;

/**
 * Page Object dla strony generowania fiszek (/generate).
 * Zgodnie z Page Object Model – locators, izolacja środowiska.
 */
export class GeneratePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly sourceTextArea: Locator;
  readonly buttonGenerate: Locator;
  readonly manualFormSection: Locator;
  readonly inputFront: Locator;
  readonly inputBack: Locator;
  readonly buttonAddFlashcard: Locator;
  readonly errorNotification: Locator;
  readonly skeletonLoader: Locator;
  readonly flashcardListSection: Locator;
  readonly buttonSaveAccepted: Locator;
  readonly buttonSaveAll: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Generuj fiszki" });
    this.sourceTextArea = page.getByLabel(/Tekst źródłowy/);
    this.buttonGenerate = page.getByRole("button", { name: "Generuj fiszki na podstawie tekstu" });
    this.manualFormSection = page.getByRole("region", { name: "Ręcznie dodaj fiszkę" });
    this.inputFront = page.getByLabel("Przód");
    this.inputBack = page.getByLabel("Tył");
    this.buttonAddFlashcard = page.getByRole("button", { name: /Dodaj fiszkę|Zapisz fiszkę/ });
    // Toast error (ErrorNotification): single role="alert" with aria-live to avoid matching inline field errors
this.errorNotification = page.locator('div[role="alert"][aria-live="assertive"]');
    this.skeletonLoader = page.locator("[data-slot='skeleton-loader']");
    this.flashcardListSection = page.getByRole("region", { name: "Lista propozycji fiszek" });
    this.buttonSaveAccepted = page.getByRole("button", { name: /Zapisz tylko zaakceptowane fiszki/ });
    this.buttonSaveAll = page.getByRole("button", { name: /Zapisz wszystkie fiszki \(bez odrzuconych\)/ });
  }

  async goto() {
    await this.page.goto("/generate");
  }

  /** Wypełnia pole tekstu źródłowego i opcjonalnie wywołuje blur (tab out). */
  async fillSourceText(text: string, blur = false) {
    await this.sourceTextArea.fill(text);
    if (blur) await this.sourceTextArea.evaluate((el) => (el as HTMLTextAreaElement).blur());
  }

  /** Generuje tekst o długości w podanym zakresie (min–max znaków). */
  async fillSourceTextWithLength(min: number, max?: number) {
    const len = max ?? min;
    const text = "a".repeat(len);
    await this.fillSourceText(text, true);
  }

  /** Wypełnia formularz ręcznej fiszki i opcjonalnie wysyła. */
  async fillManualForm(front: string, back: string, submit = false) {
    await this.inputFront.fill(front);
    await this.inputBack.fill(back);
    if (submit) await this.buttonAddFlashcard.click();
  }

  /** Zwraca locator przycisku Akceptuj dla pierwszej fiszki na liście. */
  getButtonAcceptFirst(): Locator {
    return this.flashcardListSection.getByRole("button", { name: "Zaakceptuj fiszkę" }).first();
  }

  /** Zwraca locator przycisku Odrzuć dla pierwszej fiszki. */
  getButtonRejectFirst(): Locator {
    return this.flashcardListSection.getByRole("button", { name: "Odrzuć fiszkę" }).first();
  }

  /** Zwraca locator przycisku Edytuj dla pierwszej fiszki. */
  getButtonEditFirst(): Locator {
    return this.flashcardListSection.getByRole("button", { name: "Edytuj fiszkę" }).first();
  }

  /** Komunikat sukcesu po zapisie ręcznej fiszki. */
  getSuccessMessage(): Locator {
    return this.page.getByText("Fiszka została zapisana.");
  }
}
