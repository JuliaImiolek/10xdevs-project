import { expect, test } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

test.describe("Strona główna", () => {
  test("wyświetla tytuł i linki do logowania/rejestracji gdy użytkownik niezalogowany", async ({
    page,
  }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
    expect(await homePage.getHeadingText()).toBe("10x-cards");
    await expect(homePage.linkLogin).toBeVisible();
    await expect(homePage.linkRegister).toBeVisible();
  });

  test("nawigacja do logowania działa", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.linkLogin.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
