import { expect, test } from "@playwright/test";

function seedDemoSession() {
  window.localStorage.setItem(
    "acorn.demo.session",
    JSON.stringify({
      uid: "demo-squirrel",
      displayName: "Acorn Demo",
      email: "demo@acorn.local",
      isDemo: true,
    }),
  );
}

test("rendert den S23-Auth-Screen auf Deutsch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /kalorien schnell und klar im blick/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /lokale demo starten|mit google fortfahren/i })).toBeVisible();
});

test("oeffnet den Add-Flow ueber die Floating-Pill", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  const addButton = page.getByRole("button", { name: /^hinzufuegen$/i });
  await expect(addButton).toBeVisible();
  await addButton.click();

  await expect(page.getByRole("heading", { name: "Eintrag hinzufuegen" })).toBeVisible();
  await expect(page.getByPlaceholder("Schreibe oder diktiere, was du gegessen hast")).toBeVisible();
});

test("erstellt fuer Demo-Nutzer eine deutsche Schaetzung", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /^hinzufuegen$/i }).click();
  await page.getByPlaceholder("Schreibe oder diktiere, was du gegessen hast").fill("avocado");
  await page.getByRole("button", { name: /^schaetzen$/i }).click();

  await expect(page.getByRole("heading", { name: "Avocado", exact: true })).toBeVisible();
  await expect(page.getByText("Annahmen")).toBeVisible();
});

test("zeigt Tagesuebersicht und erweiterbare Meal-Details fuer Demo-Nutzer", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await expect(page.getByText("Tagesuebersicht")).toBeVisible();
  await expect(page.getByText("Heute im Blick")).toBeVisible();
  await expect(page.getByText(/Tagesziel:/i)).toBeVisible();

  await page.locator(".meal-card__summary").first().click();
  await expect(page.getByText("Menge")).toBeVisible();
  await expect(page.getByText("Hohe Sicherheit")).toBeVisible();
  await expect(page.getByRole("button", { name: /bearbeiten/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /favorisiert|favorit/i }).first()).toBeVisible();
});

test.describe("Desktop-Layout", () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
  });

  test("zeigt auch auf Desktop einen Add-Button", async ({ page }) => {
    await page.addInitScript(seedDemoSession);
    await page.goto("/library");

    const addButton = page.getByRole("button", { name: /^hinzufuegen$/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByRole("heading", { name: "Eintrag hinzufuegen" })).toBeVisible();
  });
});

test("behaelt Profildaten nach einem Reload", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("acorn.e2e.profile-seeded")) {
      window.localStorage.setItem(
        "acorn.demo.session",
        JSON.stringify({
          uid: "demo-squirrel",
          displayName: "Acorn Demo",
          email: "demo@acorn.local",
          isDemo: true,
        }),
      );
      window.localStorage.removeItem("acorn.demo.data");
      window.sessionStorage.setItem("acorn.e2e.profile-seeded", "true");
    }
  });

  await page.goto("/profile");

  await page.getByRole("spinbutton", { name: "Alter" }).fill("31");
  await page.getByRole("spinbutton", { name: "Gewicht (kg)" }).fill("80");
  await page.getByRole("button", { name: /profil speichern/i }).click();
  await expect(page.getByText("Profil gespeichert.")).toBeVisible();

  await page.reload();

  await expect(page.getByRole("spinbutton", { name: "Alter" })).toHaveValue("31");
  await expect(page.getByRole("spinbutton", { name: "Gewicht (kg)" })).toHaveValue("80");
});

test("zeigt die PWA-Aktualisierungspruefung auf der Profilseite", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/profile");

  await expect(page.getByRole("button", { name: /auf updates pruefen/i })).toBeVisible();
});
