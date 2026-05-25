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

  const addButton = page.getByRole("button", { name: /^hinzuf.gen$/i });
  await expect(addButton).toBeVisible();
  await addButton.click();

  await expect(page.getByRole("heading", { name: /eintrag hinzuf.gen/i })).toBeVisible();
  await expect(page.getByPlaceholder("Schreibe oder diktiere, was du gegessen hast")).toBeVisible();
});

test("erstellt fuer Demo-Nutzer eine deutsche Schaetzung", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /^hinzuf.gen$/i }).click();
  await page.getByPlaceholder("Schreibe oder diktiere, was du gegessen hast").fill("avocado");
  await page.getByRole("button", { name: /^sch.tzen$/i }).click();

  await expect(page.getByRole("heading", { name: "Avocado", exact: true })).toBeVisible();
  await expect(page.locator(".estimate-card--review")).toBeVisible();
});

test("kann eine neue Schaetzung vor dem Speichern manuell bearbeiten", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /^hinzuf.gen$/i }).click();
  await page.getByPlaceholder("Schreibe oder diktiere, was du gegessen hast").fill("gemischte mahlzeit");
  await page.getByRole("button", { name: /^sch.tzen$/i }).click();
  await expect(page.locator(".estimate-card--review")).toBeVisible();

  await page.locator(".sheet__actions").getByRole("button", { name: /^(bearbeiten|.ndern)$/i }).click();
  await expect(page.getByRole("heading", { name: "Gericht bearbeiten" })).toBeVisible();
  await page.getByLabel("Name").fill("Korrigierte Mahlzeit");
  await page.getByLabel("kcal").first().fill("610");
  await page.getByRole("button", { name: /^speichern$/i }).click();

  await expect(page.getByRole("heading", { name: "Korrigierte Mahlzeit" })).toBeVisible();
  await expect(page.getByText("610").first()).toBeVisible();
});

test("zeigt Tagesuebersicht und erweiterbare Meal-Details fuer Demo-Nutzer", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Heute" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ø" })).toBeVisible();
  await expect(page.getByText(/Tagesziel:/i)).toBeVisible();

  await page.locator(".meal-card__summary").first().click();
  await expect(page.getByText("Menge")).toBeVisible();
  await expect(page.getByText("Hohe Sicherheit")).toBeVisible();
  await expect(page.getByRole("button", { name: /bearbeiten/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /favorisiert|favorit/i }).first()).toBeVisible();
});

test("laesst Acorns vom Squirrel regnen", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /acorns regnen lassen/i }).click();

  await expect(page.locator(".acorn-rain__drop")).toHaveCount(44);
  await expect(page.locator(".acorn-rain")).toHaveCSS("position", "fixed");
});

test("zeigt vergangene Tage in der Heute-Ansicht", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /vorheriger tag/i }).click();

  await expect(page.getByRole("heading", { name: /tomato pasta/i })).toBeVisible();
});

test("oeffnet einen Chart aus der Statistik-Karte", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /statistik .ffnen/i }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
  await expect(page.getByLabel("Kalorienverlauf der letzten 30 Tage")).toBeVisible();
  await expect(page.locator(".calorie-chart__bar")).toHaveCount(30);
});

test("fuegt Bibliotheksgerichte zum ausgewaehlten Tag hinzu", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /vorheriger tag/i }).click();
  await page.locator(".saved-food-chip").filter({ hasText: "Avocado toast" }).click();

  await expect(page.getByRole("heading", { name: /avocado toast/i })).toBeVisible();
});

test("zeigt in der Bibliothek fuer jedes Gericht eine direkte Erneut-hinzufuegen-Aktion", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/library");

  await expect(page.getByRole("button", { name: /tomato pasta erneut hinzuf.gen/i })).toBeVisible();
  await page.getByRole("button", { name: /tomato pasta erneut hinzuf.gen/i }).click();
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Tomato pasta" })).toBeVisible();
});

test("bearbeitet ein gespeichertes Gericht manuell", async ({ page }) => {
  await page.addInitScript(seedDemoSession);
  await page.goto("/");

  await page.getByRole("button", { name: /bearbeiten/i }).first().click();

  await expect(page.getByRole("heading", { name: "Gericht bearbeiten" })).toBeVisible();
  await expect(page.getByRole("button", { name: /verfeinern/i })).toHaveCount(0);

  await page.getByLabel("Name").fill("Manuell bearbeitetes Gericht");
  await page.getByLabel("kcal").first().fill("500");
  await page.getByRole("button", { name: /item hinzuf.gen/i }).click();
  await page.getByLabel("Item").last().fill("Extra Sauce");
  await page.getByLabel("Portion").last().fill("30 g");
  await page.getByLabel("kcal").last().fill("120");
  await page.getByLabel("Protein").last().fill("1");
  await page.getByLabel("Kohlenh.").last().fill("5");
  await page.getByLabel("Fett").last().fill("10");
  await page.getByRole("button", { name: /^speichern$/i }).click();

  await expect(page.getByRole("heading", { name: "Manuell bearbeitetes Gericht" })).toBeVisible();
  await page.getByRole("heading", { name: "Manuell bearbeitetes Gericht" }).click();
  await expect(page.getByText("Extra Sauce")).toBeVisible();
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

    const addButton = page.getByRole("button", { name: /^hinzuf.gen$/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByRole("heading", { name: /eintrag hinzuf.gen/i })).toBeVisible();
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

  await expect(page.getByRole("button", { name: /auf updates pr.fen/i })).toBeVisible();
});
