import { expect, test } from "@playwright/test";

test("first login onboarding flow", async ({ page }) => {
  let postedBody: Record<string, unknown> | null = null;

  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "null",
      });
      return;
    }

    postedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-id", user_id: "mock-user", ...postedBody }),
    });
  });

  await page.goto("/onboarding");

  await page.getByText("Momentum Maker").click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Start time").fill("08:30");
  await page.getByLabel("End time").fill("16:30");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("radio", { name: "Dark" }).check();
  await page.getByRole("radio", { name: "Bold" }).check();
  await page.getByRole("radio", { name: "Emerald" }).check();

  await page.getByRole("button", { name: /finish setup/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  expect(postedBody).toMatchObject({
    persona: "momentum_maker",
    work_start: "08:30",
    work_end: "16:30",
    theme: "dark",
    theme_contrast: "bold",
    accent_color: "emerald",
  });
});
