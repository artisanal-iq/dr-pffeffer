import { test, expect } from "@playwright/test";

test.describe("Sign in", () => {
  test("shows a success message", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email address").fill("user@example.com");
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByTestId("auth-status")).toHaveText("Check your email for a magic link.");
  });

  test("shows an error message for disallowed emails", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email address").fill("fail@example.com");
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByTestId("auth-status")).toContainText("Unable to sign in");
  });
});
