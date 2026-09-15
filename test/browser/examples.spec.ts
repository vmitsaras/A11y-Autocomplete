import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage links to the dedicated example suite", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.getByRole("link", { name: /Async destination search/ })).toHaveAttribute("href", "./examples/async-data/");
  await expect(page.getByRole("link", { name: "Interaction-state playground" })).toHaveAttribute("href", "./examples/states.html");
  await expect(page.getByRole("link", { name: "Match highlighting" })).toHaveAttribute("href", "./examples/match-highlighting.html");
  await expect(page.getByRole("link", { name: "Native datalist adapter" })).toHaveAttribute("href", "./examples/datalist.html");
  await expect(page.getByRole("link", { name: "A11y Form Validator integration" })).toHaveAttribute("href", "./examples/form-validator-integration.html");
  await expect(page.getByRole("link", { name: "Autocomplete to tag input" })).toHaveAttribute("href", "./examples/tag-input-integration.html");
  await expect(page.getByRole("link", { name: "Theme gallery" })).toHaveAttribute("href", "./examples/themes.html");
});

test("async data example waits for typing and recovers from a request failure", async ({ page }, testInfo) => {
  await page.goto("/examples/async-data/");
  const input = page.getByLabel("Airport or destination");
  const requestCount = page.locator("[data-demo-request-count]");
  const status = page.locator("[data-autocomplete-status]");

  await expect(requestCount).toHaveText("0");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).toHaveAttribute("type", "text");

  await input.focus();
  await expect(requestCount).toHaveText("0");
  await expect(status).toBeEmpty();
  await expect(page.getByRole("option")).toHaveCount(0);

  await input.fill("berlin");
  await expect(page.getByRole("button", { name: "Clear destination" })).toBeVisible();
  await expect(requestCount).toHaveText("1");
  await expect(status).toHaveText("Loading destinations.");
  await expect(page.locator("[data-autocomplete-list]")).toHaveAttribute("aria-busy", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toHaveText("Berlin Brandenburg — Germany");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("[data-demo-selected-code]")).toHaveText("BER");

  await page.getByRole("button", { name: "Fail the next request" }).click();
  await expect(status).toHaveText("Destinations could not be loaded. Retry the search.");
  await expect(page.getByRole("button", { name: "Retry destination search" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);

  await page.getByRole("button", { name: "Retry destination search" }).click();
  await expect(input).toBeFocused();
  await expect(page.locator("[data-demo-request-trigger]")).toHaveText("Retry");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Retry destination search" })).toBeHidden();

  await input.fill("zzzz");
  await expect(status).toHaveText("No destinations found for zzzz.");
  await expect(page.getByRole("option")).toHaveCount(0);
});

test("@axe form validator addon owns strict errors, summary focus, and correction", async ({ page }, testInfo) => {
  await page.goto("/examples/form-validator-integration.html");
  await expect(page.locator("[data-integration-load-status]")).toHaveText(/integration ready/i);
  const input = page.getByRole("combobox", { name: "Departure city" });

  await input.fill("Unknown");
  await page.getByRole("button", { name: "Check trip" }).click();

  const summary = page.locator(".a11y-form-validator__summary");
  const validatorError = page.locator(".a11y-form-validator__error");
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(validatorError).toHaveText("Choose a departure city from the suggestions.");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("[data-autocomplete-error]")).toHaveCount(0);
  await expect(summary.getByRole("link", { name: /departure city/i })).toHaveCount(1);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, testInfo.project.name).toEqual([]);

  await summary.getByRole("link", { name: /departure city/i }).click();
  await expect(input).toBeFocused();
  await input.fill("Ath");
  await input.press("ArrowDown");
  await input.press("Enter");

  await expect(input).toHaveValue("Athens");
  await expect(summary).toBeHidden();
  await expect(validatorError).toHaveCount(0);
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(page.locator('[data-integration-readout="selected"]')).toHaveText("ath");

  await page.getByRole("button", { name: "Check trip" }).click();
  await expect(page.locator('[data-integration-readout="outcome"]')).toHaveText("Ready to submit");
});

test("generated form validator example loads its local dependency", async ({ page }) => {
  await page.goto("/docs/examples/form-validator-integration.html");
  await expect(page.locator("[data-integration-load-status]")).toHaveText(/integration ready/i);
});

test("@axe tag input addon adds one suggested tag, custom text, and preserves Escape order", async ({ page }, testInfo) => {
  await page.goto("/examples/tag-input-integration.html");
  await expect(page.locator("[data-tag-integration-status]")).toHaveText(/integration ready/i);
  const field = page.getByRole("combobox", { name: "Topics" });

  await field.fill("Incl");
  await field.press("ArrowDown");
  await expect(field).toHaveAttribute("aria-activedescendant", /-option-0$/);
  await field.press("Enter");
  await expect(page.getByRole("button", { name: "Remove tag Inclusive design" })).toBeVisible();
  await expect(page.locator('[data-tag-readout="tags"]')).toContainText("Inclusive design");
  await expect(field).toHaveValue("");

  await field.fill("Custom topic");
  await field.press("Enter");
  await expect(page.getByRole("button", { name: "Remove tag Custom topic" })).toBeVisible();

  await field.fill("Key");
  await field.press("ArrowDown");
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await field.press("Escape");
  await expect(field).toHaveAttribute("aria-expanded", "false");
  await expect(field).toHaveValue("Key");
  await field.press("Escape");
  await expect(field).toHaveValue("");

  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
});

test("datalist example demonstrates snapshot refresh and reversible enhancement", async ({ page }) => {
  await page.goto("/examples/datalist.html");
  const input = page.getByLabel("City code");

  await expect(input).not.toHaveAttribute("list");
  await input.focus();
  await expect(page.getByRole("option")).toHaveCount(4);

  await input.fill("Rome");
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.getByRole("button", { name: "Add Rome to the datalist" }).click();

  await page.getByRole("button", { name: "Refresh snapshot" }).click();
  await input.focus();
  await expect(page.getByRole("option")).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("ROM");

  await page.getByRole("button", { name: "Destroy" }).click();
  await expect(input).toHaveAttribute("list", "datalist-example-options");
  await expect(input).not.toHaveAttribute("role", "combobox");

  await page.getByRole("button", { name: "Reinitialize" }).click();
  await expect(input).not.toHaveAttribute("list");
  await expect(input).toHaveAttribute("role", "combobox");
});

test("state playground exposes local, grouped, and lifecycle states", async ({ page }) => {
  await page.goto("/examples/states.html");
  const input = page.getByLabel("City");
  await expect(input).toHaveAttribute("autocomplete", "off");

  await input.fill("a");
  await expect(page.locator("[data-a11y-autocomplete] [role=option]")).not.toHaveCount(0);
  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);

  await page.getByLabel("Scenario", { exact: true }).selectOption("grouped");
  await page.getByLabel("City").fill("e");
  await expect(page.getByRole("group")).toHaveCount(2);
  await expect(page.getByRole("group").first()).toHaveAttribute("aria-labelledby", /-group-0$/);

  await page.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByLabel("City")).toBeDisabled();
  await expect(page.locator('[data-readout="disabled"]')).toHaveText("true");
  await page.getByRole("button", { name: "Enable" }).click();
  await expect(page.getByLabel("City")).toBeEnabled();

  await page.getByRole("button", { name: "Destroy" }).click();
  await expect(page.getByLabel("City")).not.toHaveAttribute("role", "combobox");
  await expect(page.locator('[data-readout="lifecycle"]')).toHaveText("destroyed");
  await expect(page.getByRole("button", { name: "Reinitialize" })).toBeEnabled();
  await page.getByRole("button", { name: "Reinitialize" }).click();
  await expect(page.getByLabel("City")).toHaveAttribute("role", "combobox");
  await expect(page.locator('[data-readout="lifecycle"]')).toHaveText("initialized");
});

test("state playground controls async failure, retry, and recovery", async ({ page }) => {
  await page.goto("/examples/states.html");
  await page.getByLabel("Scenario", { exact: true }).selectOption("async");
  const input = page.getByLabel("City");
  const status = page.getByRole("status");

  await input.fill("a");
  await expect(page.getByRole("button", { name: "Reject request" })).toBeEnabled();
  await expect(status).toHaveText("Loading suggestions.");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Reject request" }).click();
  await expect(status).toHaveText("Suggestions could not be loaded.");
  await expect(page.getByRole("button", { name: "Retry request" })).toBeEnabled();

  await page.getByRole("button", { name: "Retry request" }).click();
  await expect(page.getByRole("button", { name: "Resolve request" })).toBeEnabled();
  await page.getByRole("button", { name: "Resolve request" }).click();
  await expect(page.locator("[data-a11y-autocomplete] [role=option]")).toHaveCount(6);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(status).toHaveText("6 suggestions available.");
});

test("state playground demonstrates empty, strict-invalid, and reset recovery", async ({ page }) => {
  await page.goto("/examples/states.html");
  const scenario = page.getByLabel("Scenario", { exact: true });

  await scenario.selectOption("empty");
  await page.getByLabel("City").fill("nowhere");
  await expect(page.getByRole("status")).toContainText("No suggestions found");
  await expect(page.locator("[data-a11y-autocomplete] [role=option]")).toHaveCount(0);

  await scenario.selectOption("strict");
  const strictInput = page.getByLabel("City");
  await strictInput.fill("Unknown");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(strictInput).toBeFocused();
  await expect(strictInput).toHaveAttribute("aria-invalid", "true");
  await strictInput.fill("Ath");
  await strictInput.press("ArrowDown");
  await strictInput.press("Enter");
  await expect(strictInput).toHaveValue("Athens");
  await expect(strictInput).toHaveAttribute("aria-invalid", "false");

  await scenario.selectOption("reset");
  const resetInput = page.getByLabel("City");
  const hidden = page.locator("[data-autocomplete-hidden-value]");
  await expect(resetInput).toHaveValue("Athens");
  await resetInput.fill("Ber");
  await resetInput.press("ArrowDown");
  await resetInput.press("Enter");
  await expect(hidden).toHaveValue("ber");
  await page.getByRole("button", { name: "Reset form" }).click();
  await expect(resetInput).toHaveValue("Athens");
  await expect(hidden).toHaveValue("ath");
});

test("state playground passes axe in loading and invalid states", async ({ page }, testInfo) => {
  await page.goto("/examples/states.html");
  await page.getByLabel("Scenario", { exact: true }).selectOption("async");
  await page.getByLabel("City").fill("a");
  await expect(page.getByRole("status")).toHaveText("Loading suggestions.");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);

  await page.getByLabel("Scenario", { exact: true }).selectOption("strict");
  await page.getByLabel("City").fill("Unknown");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByLabel("City")).toHaveAttribute("aria-invalid", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
});

test("match highlighting preserves complete option text and selected value", async ({ page }, testInfo) => {
  await page.goto("/examples/match-highlighting.html");
  await page.evaluate(() => document.fonts.ready);
  const input = page.getByLabel("Airport or city");
  const codeTopBeforeResults = await page.locator(".example-code").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  await input.fill("at");
  const codeTopWithResults = await page.locator(".example-code").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  expect(codeTopWithResults).toBe(codeTopBeforeResults);
  const firstOption = page.getByRole("option").first();
  await expect(firstOption).toHaveText("Athens International Airport — Athens");
  await expect(firstOption).toHaveCSS("display", "block");
  await expect(firstOption.locator("mark")).not.toHaveCount(0);
  await expect(firstOption.locator("mark").first()).toHaveCSS("margin", "0px");
  await expect(firstOption.locator("mark").first()).toHaveCSS("padding", "0px");
  await expect(firstOption.locator("mark").first()).toHaveCSS("box-shadow", "none");
  await expect(firstOption.locator("a, button, input, select, textarea, [contenteditable='true'], [tabindex]:not([tabindex='-1'])")).toHaveCount(0);
  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  await input.press("Enter");
  await expect(input).toHaveValue("Athens International Airport — Athens");
  await expect(page.locator("[data-autocomplete-hidden-value]")).toHaveValue("ATH");

  await input.fill("international");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
});

test("theme gallery preserves behavior, target size, and narrow reflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/examples/themes.html");

  const compactInput = page.getByLabel("City").nth(2);
  await compactInput.fill("a");
  const compactCard = page.locator('[data-theme-card="compact"]');
  const clearBox = await compactCard.getByRole("button", { name: /clear/i }).boundingBox();
  const inputBox = await compactInput.boundingBox();
  const optionBox = await compactCard.getByRole("option").first().boundingBox();
  expect(clearBox?.width).toBeGreaterThanOrEqual(44);
  expect(clearBox?.height).toBeGreaterThanOrEqual(44);
  expect(inputBox?.height).toBeGreaterThanOrEqual(44);
  expect(optionBox?.height).toBeGreaterThanOrEqual(44);

  const longInput = page.getByLabel("International destination with a descriptive name");
  await longInput.focus();
  await expect(page.locator('[data-theme-card="long"] [role="option"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  const frame = page.frameLocator('[data-theme-unstyled]');
  await expect(frame.locator('link[rel="stylesheet"]')).toHaveCount(0);
  await expect(frame.getByLabel("City")).toHaveAttribute("role", "combobox");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
  await testInfo.attach("theme-gallery", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});

test("reduced motion removes the popup transition without hiding state changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/test/fixtures/browser.html");
  const input = page.getByLabel("City");
  const popup = page.locator("[data-autocomplete-popup]");

  await input.fill("At");

  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(popup).toHaveCSS("transition-duration", "0s");
});

test("theme gallery uses the real forced-colors media behavior", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Forced-colors emulation is validated in Chromium.");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/examples/themes.html");
  const forcedCard = page.locator('[data-theme-card="forced"]');
  const input = forcedCard.getByLabel("City");
  await input.fill("a");
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);
  const popupShadow = await forcedCard.locator("[data-autocomplete-popup]").evaluate((element) => getComputedStyle(element).boxShadow);
  expect(popupShadow).toBe("none");
  expect((await new AxeBuilder({ page }).analyze()).violations, testInfo.project.name).toEqual([]);
  await testInfo.attach("forced-colors-gallery", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});
