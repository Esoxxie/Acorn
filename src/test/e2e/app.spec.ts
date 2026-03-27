import { expect, test } from "@playwright/test";

test("renders the S23 auth landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /photo-first calorie tracking/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /enter local demo|continue with google/i })).toBeVisible();
});

test("opens the single add flow from the floating pill", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "acorn.demo.session",
      JSON.stringify({
        uid: "demo-squirrel",
        displayName: "Acorn Demo",
        email: "demo@acorn.local",
        isDemo: true,
      }),
    );
  });
  await page.goto("/");
  const addButton = page.getByRole("button", { name: /^add$/i });
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.getByRole("heading", { name: "Add food" })).toBeVisible();
  await expect(page.getByPlaceholder("Type or dictate what you ate")).toBeVisible();
});
