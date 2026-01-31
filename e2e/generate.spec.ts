import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { GeneratePage } from "./pages/GeneratePage";
import {
  TEXT_INPUT_MIN_LENGTH,
  MANUAL_FRONT_MAX,
  MANUAL_BACK_MAX,
} from "./pages/GeneratePage";

test.describe("Strona Generuj fiszki", () => {
  test.describe("ochrona ścieżki", () => {
    test("niezalogowany użytkownik jest przekierowany na logowanie z redirectTo", async ({
      page,
    }) => {
      await page.goto("/generate");

      await expect(page).toHaveURL(/\/auth\/login/);
      expect(page.url()).toContain("redirectTo=");
      // Decoded URL is e.g. ...?redirectTo=/generate (slash, not %2F)
      expect(decodeURIComponent(page.url())).toContain("redirectTo=/generate");
    });
  });

  test.describe("jako zalogowany użytkownik", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTestUser(page, { redirectTo: "/generate" });
    });

    test("wyświetla nagłówek, pole tekstowe, przycisk generowania i formularz ręcznej fiszki", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      await expect(generatePage.heading).toBeVisible();
      await expect(generatePage.heading).toHaveText("Generuj fiszki");
      await expect(generatePage.sourceTextArea).toBeVisible();
      await expect(generatePage.buttonGenerate).toBeVisible();
      await expect(generatePage.manualFormSection).toBeVisible();
      await expect(generatePage.inputFront).toBeVisible();
      await expect(generatePage.inputBack).toBeVisible();
      await expect(generatePage.buttonAddFlashcard).toBeVisible();
    });

    test("walidacja tekstu źródłowego: tekst krótszy niż minimum po blurze pokazuje błąd", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      const tooShort = "a".repeat(TEXT_INPUT_MIN_LENGTH - 1);
      await generatePage.fillSourceText(tooShort, true);

      await expect(generatePage.errorNotification).toBeVisible();
      await expect(generatePage.errorNotification).toContainText(
        String(TEXT_INPUT_MIN_LENGTH)
      );
    });

    test("walidacja tekstu źródłowego: klik Generuj przy pustym polu pokazuje błąd", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      await generatePage.buttonGenerate.click();

      await expect(generatePage.errorNotification).toBeVisible();
      await expect(generatePage.errorNotification).toContainText(
        String(TEXT_INPUT_MIN_LENGTH)
      );
    });

    test("formularz ręcznej fiszki: submit z pustymi polami pokazuje błędy wymaganych pól", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      await generatePage.buttonAddFlashcard.click();

      await expect(page.getByText("Pole jest wymagane.").first()).toBeVisible();
    });

    test("formularz ręcznej fiszki: poprawne wypełnienie i submit pokazuje komunikat sukcesu", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      await generatePage.fillManualForm("Przód testowy", "Tył testowy", true);

      await expect(generatePage.getSuccessMessage()).toBeVisible({ timeout: 10000 });
    });

    test("formularz ręcznej fiszki: pole Przód powyżej limitu znaków pokazuje błąd walidacji", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      const tooLongFront = "a".repeat(MANUAL_FRONT_MAX + 1);
      await generatePage.inputFront.fill(tooLongFront);
      await generatePage.inputBack.fill("Tył");
      await generatePage.buttonAddFlashcard.click();

      await expect(page.getByRole("alert")).toContainText(
        `Maksymalnie ${MANUAL_FRONT_MAX} znaków`
      );
    });

    test("formularz ręcznej fiszki: pole Tył powyżej limitu znaków pokazuje błąd walidacji", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.goto();

      const tooLongBack = "a".repeat(MANUAL_BACK_MAX + 1);
      await generatePage.inputFront.fill("Przód");
      await generatePage.inputBack.fill(tooLongBack);
      await generatePage.buttonAddFlashcard.click();

      await expect(page.getByRole("alert")).toContainText(
        `Maksymalnie ${MANUAL_BACK_MAX} znaków`
      );
    });

    test("błąd API generacji: odpowiedź 500 pokazuje komunikat błędu w UI", async ({
      page,
    }) => {
      await page.route("**/api/generations", (route) => {
        if (route.request().method() === "POST") {
          return route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Błąd serwera" }),
          });
        }
        return route.continue();
      });

      const generatePage = new GeneratePage(page);
      await generatePage.goto();
      await generatePage.fillSourceTextWithLength(TEXT_INPUT_MIN_LENGTH, TEXT_INPUT_MIN_LENGTH);
      await generatePage.buttonGenerate.click();

      await expect(generatePage.errorNotification).toBeVisible({ timeout: 5000 });
      await expect(generatePage.errorNotification).not.toBeEmpty();
    });

    test("przycisk Generuj fiszki jest zablokowany podczas ładowania", async ({
      page,
    }) => {
      await page.route("**/api/generations", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 1500));
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ generation_id: 1, flashcards_proposals: [] }),
          });
        }
        return route.continue();
      });

      const generatePage = new GeneratePage(page);
      await generatePage.goto();
      await generatePage.fillSourceTextWithLength(TEXT_INPUT_MIN_LENGTH, TEXT_INPUT_MIN_LENGTH);
      await generatePage.buttonGenerate.click();

      await expect(generatePage.skeletonLoader).toBeVisible({ timeout: 3000 });
      await expect(generatePage.buttonGenerate).toBeDisabled();
    });
  });
});
