import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("enhances a datalist without changing its selected form value", async ({ page }) => {
  await page.goto("/test/fixtures/datalist.html");
  const input = page.getByLabel("City code");

  await expect(input).not.toHaveAttribute("list", /.+/);
  await input.focus();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(page.getByRole("option").first()).toContainText("ATH");
  await expect(page.getByRole("option").first()).toContainText("Athens");

  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("ATH");
  await expect(input).toBeFocused();
  const submittedValue = await page.locator("form").evaluate((form) => new FormData(form as HTMLFormElement).get("city"));
  expect(submittedValue).toBe("ATH");

  await page.evaluate(() => {
    const instance = Reflect.get(window, "datalistAutocomplete") as { destroy(): void };
    instance.destroy();
  });
  await expect(input).toHaveAttribute("list", "datalist-city-options");
  await expect(input).not.toHaveAttribute("role", "combobox");
});

test("keeps datalist mutations static until explicit refresh", async ({ page }) => {
  await page.goto("/test/fixtures/datalist.html");
  const input = page.getByLabel("City code");
  await input.fill("Rome");
  await expect(page.getByRole("option")).toHaveCount(0);

  await page.evaluate(() => {
    const datalist = document.querySelector("#datalist-city-options");
    if (!(datalist instanceof HTMLDataListElement)) throw new Error("Missing datalist fixture.");
    const option = document.createElement("option");
    option.value = "ROM";
    option.label = "Rome";
    datalist.append(option);
  });
  await input.fill("Rome");
  await expect(page.getByRole("option")).toHaveCount(0);

  await page.evaluate(() => {
    const instance = Reflect.get(window, "datalistAutocomplete") as { refresh(): void };
    instance.refresh();
  });
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(input).toBeFocused();
});

test("keeps the authored datalist fallback when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/test/fixtures/datalist.html");
  const input = page.getByLabel("City code");

  await expect(input).toHaveAttribute("list", "datalist-city-options");
  await expect(input).not.toHaveAttribute("role", "combobox");
  await expect(page.locator("#datalist-city-options option")).toHaveCount(3);
  await context.close();
});

test("@axe has no automatically detectable violations in the enhanced datalist state", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/datalist.html");
  const input = page.getByLabel("City code");
  await input.focus();
  await expect(input).toHaveAttribute("aria-expanded", "true");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, testInfo.project.name).toEqual([]);
});

test("opens local suggestions for an empty explicitly configured field", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?openOnFocus=true&minLength=0");
  const input = page.getByLabel("City");
  const status = page.getByRole("status");

  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(status).toHaveText("3 suggestions available.");

  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);
  await input.press("Enter");
  await expect(input).toHaveValue("Athens");
  await expect(input).toBeFocused();

  await input.fill("");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await input.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(input).toBeFocused();
  await input.press("Tab");
  const submit = page.getByRole("button", { name: "Submit" });
  if (testInfo.project.name === "webkit") {
    await expect(input).not.toBeFocused();
    await submit.focus();
  } else await expect(submit).toBeFocused();
});

test("cancels an empty async focus request when focus leaves", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?async=true&openOnFocus=true&minLength=0");
  const input = page.getByLabel("City");
  const status = page.locator("[data-autocomplete-status]");

  await input.focus();
  await expect(status).toHaveText("Loading suggestions.");
  await input.press("Tab");
  const submit = page.getByRole("button", { name: "Submit" });
  if (testInfo.project.name === "webkit") {
    await expect(input).not.toBeFocused();
    await submit.focus();
  } else await expect(submit).toBeFocused();
  await page.waitForTimeout(150);

  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(status).toBeEmpty();
});

test("supports keyboard selection and two-stage Escape clearing", async ({ page }) => {
  await page.goto("/test/fixtures/browser.html");
  const input = page.getByLabel("City");
  const status = page.getByRole("status");
  await input.fill("At");
  await expect(page.getByRole("option")).toHaveCount(2);

  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);
  await input.press("Enter");
  await expect(input).toHaveValue("Athens");
  await expect(input).toBeFocused();
  await expect(status).toHaveText("Athens selected.");
  await expect(status).toHaveCSS("opacity", "1");

  await input.fill("At");
  await input.press("Escape");
  await expect(input).toHaveValue("At");
  await input.press("Escape");
  await expect(input).toHaveValue("");
  await expect(status).toHaveText("Input cleared.");
  await expect(status).toHaveCSS("opacity", "1");
});

test("stops arrow navigation at both suggestion boundaries", async ({ page }) => {
  await page.goto("/test/fixtures/browser.html");
  const input = page.getByLabel("City");
  const status = page.getByRole("status");
  const options = page.getByRole("option");

  await input.fill("At");
  await expect(options).toHaveCount(2);
  const resultsMessage = await status.textContent();

  await input.press("ArrowDown");
  const firstOptionId = await input.getAttribute("aria-activedescendant");
  await input.press("ArrowUp");
  await expect(input).toHaveAttribute("aria-activedescendant", firstOptionId ?? "");

  await input.press("ArrowDown");
  const lastOptionId = await input.getAttribute("aria-activedescendant");
  await input.press("ArrowDown");

  expect(firstOptionId).toMatch(/-option-0$/);
  expect(lastOptionId).toMatch(/-option-1$/);
  await expect(input).toHaveAttribute("aria-activedescendant", lastOptionId ?? "");
  await expect(page.locator("[role=option][aria-selected=true]")).toHaveCount(1);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("At");
  await expect(status).toHaveText(resultsMessage ?? "");
});

test("does not return focus when select-on-blur commits a value", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?selectOnBlur=true&highlightFirst=true");
  const input = page.getByLabel("City");
  await input.fill("At");
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);
  await input.press("Tab");

  const clear = page.getByRole("button", { name: /clear/i });
  if (testInfo.project.name === "webkit") await expect(input).not.toBeFocused();
  else await expect(clear).toBeFocused();
  await expect(input).toHaveValue("Athens");
  const submit = page.getByRole("button", { name: "Submit" });
  if (testInfo.project.name === "webkit") await submit.focus();
  else await clear.press("Tab");
  await expect(submit).toBeFocused();
});

test("cancels async work when focus leaves and does not reopen", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?async=true");
  const input = page.getByLabel("City");
  await input.fill("At");
  await input.press("Tab");
  await page.waitForTimeout(150);

  const clear = page.getByRole("button", { name: /clear/i });
  if (testInfo.project.name === "webkit") await expect(input).not.toBeFocused();
  else await expect(clear).toBeFocused();
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("option")).toHaveCount(0);
  const submit = page.getByRole("button", { name: "Submit" });
  if (testInfo.project.name === "webkit") await submit.focus();
  else await clear.press("Tab");
  await expect(submit).toBeFocused();
});

test("connects the popup to the input without shifting content or changing the option model", async ({ page }) => {
  await page.goto("/test/fixtures/browser.html");
  const input = page.getByLabel("City");
  const popup = page.locator("[data-autocomplete-popup]");
  const list = page.locator("[data-autocomplete-list]");
  const summary = page.locator("[data-autocomplete-results-summary]");
  const status = page.getByRole("status");
  const submit = page.getByRole("button", { name: "Submit" });
  const submitBefore = await submit.boundingBox();

  await input.fill("Unknown");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(status).toBeVisible();
  await expect(status).toHaveCSS("opacity", "1");
  await expect(summary).toBeHidden();
  await input.fill("At");
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(summary).toBeVisible();
  await expect(summary).toHaveText("2 suggestions available.");
  await expect(summary).toHaveAttribute("aria-hidden", "true");
  await expect(status).toHaveText("2 suggestions available.");
  await expect(status).toHaveCSS("clip-path", "inset(50%)");
  await expect(status).not.toHaveAttribute("hidden", "");
  await expect(status).not.toHaveAttribute("aria-hidden", /.+/);

  const [inputBox, popupBox, submitAfter, styles, structure] = await Promise.all([
    input.boundingBox(),
    popup.boundingBox(),
    submit.boundingBox(),
    page.evaluate(() => {
      const inputElement = document.querySelector("[data-autocomplete-input]");
      const popupElement = document.querySelector("[data-autocomplete-popup]");
      if (!(inputElement instanceof HTMLElement) || !(popupElement instanceof HTMLElement)) throw new Error("Missing fixture markup.");
      const inputStyle = getComputedStyle(inputElement);
      const popupStyle = getComputedStyle(popupElement);
      return {
        popupPosition: popupStyle.position,
        inputBottomStartRadius: inputStyle.getPropertyValue("border-end-start-radius"),
        inputBottomEndRadius: inputStyle.getPropertyValue("border-end-end-radius"),
        popupTopStartRadius: popupStyle.getPropertyValue("border-start-start-radius"),
        popupTopEndRadius: popupStyle.getPropertyValue("border-start-end-radius"),
        inputOutlineStyle: inputStyle.outlineStyle,
        inputOutlineWidth: inputStyle.outlineWidth,
        inputZIndex: inputStyle.zIndex
      };
    }),
    page.evaluate(() => {
      const root = document.querySelector("[data-a11y-autocomplete]");
      const label = root?.querySelector("label");
      const hint = root?.querySelector(".a11y-autocomplete__hint");
      const control = root?.querySelector(".a11y-autocomplete__control");
      const popupElement = root?.querySelector("[data-autocomplete-popup]");
      const summaryElement = root?.querySelector("[data-autocomplete-results-summary]");
      const listElement = root?.querySelector("[data-autocomplete-list]");
      return {
        hintFollowsLabel: label?.nextElementSibling === hint,
        controlFollowsHint: hint?.nextElementSibling === control,
        popupInControl: popupElement?.parentElement === control,
        summaryInPopup: summaryElement?.parentElement === popupElement,
        summaryBeforeList: summaryElement?.nextElementSibling === listElement,
        summaryOutsideListbox: Boolean(listElement && summaryElement && !listElement.contains(summaryElement))
      };
    })
  ]);
  expect(styles.popupPosition).toBe("absolute");
  expect(submitBefore).not.toBeNull();
  expect(submitAfter).not.toBeNull();
  expect(submitAfter?.y).toBeCloseTo(submitBefore?.y ?? 0, 1);
  expect(inputBox).not.toBeNull();
  expect(popupBox).not.toBeNull();
  expect(popupBox?.x).toBeCloseTo(inputBox?.x ?? 0, 1);
  expect(popupBox?.width).toBeCloseTo(inputBox?.width ?? 0, 1);
  expect(popupBox?.y).toBeCloseTo((inputBox?.y ?? 0) + (inputBox?.height ?? 0) - 1, 1);
  expect(styles.inputBottomStartRadius).toBe("0px");
  expect(styles.inputBottomEndRadius).toBe("0px");
  expect(styles.popupTopStartRadius).toBe("0px");
  expect(styles.popupTopEndRadius).toBe("0px");
  expect(styles.inputOutlineStyle).not.toBe("none");
  expect(styles.inputOutlineWidth).toBe("3px");
  expect(styles.inputZIndex).toBe("2");
  expect(structure).toEqual({
    hintFollowsLabel: true,
    controlFollowsHint: true,
    popupInControl: true,
    summaryInPopup: true,
    summaryBeforeList: true,
    summaryOutsideListbox: true
  });
  await expect(input).toHaveAttribute("aria-controls", await list.getAttribute("id") ?? "");

  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /-option-0$/);
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");

  await input.press("Escape");
  await expect(popup).toBeHidden();
  const closedRadius = await input.evaluate((element) => getComputedStyle(element).getPropertyValue("border-end-start-radius"));
  expect(closedRadius).not.toBe("0px");
});

test("keeps long content inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/test/fixtures/browser.html");
  await page.getByLabel("City").fill("At");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const clearBox = await page.getByRole("button", { name: /clear/i }).boundingBox();
  expect(clearBox?.width).toBeGreaterThanOrEqual(44);
  expect(clearBox?.height).toBeGreaterThanOrEqual(44);
});

test("@axe has no automatically detectable violations in expanded and invalid states", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?strict=true");
  const input = page.getByLabel("City");
  await input.fill("At");
  const expanded = await new AxeBuilder({ page }).analyze();
  expect(expanded.violations, testInfo.project.name).toEqual([]);

  await input.fill("Unknown");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const invalid = await new AxeBuilder({ page }).analyze();
  expect(invalid.violations, testInfo.project.name).toEqual([]);
});

test("diagnostics preserve rendered markup, status text, and input focus", async ({ page }) => {
  await page.goto("/test/fixtures/browser.html");
  const input = page.getByLabel("City");
  await input.fill("At");
  await expect(page.getByRole("option")).toHaveCount(2);

  const result = await page.evaluate(() => {
    const root = document.querySelector("[data-a11y-autocomplete]");
    const inputElement = document.querySelector("[data-autocomplete-input]");
    const status = document.querySelector("[data-autocomplete-status]");
    const diagnose = Reflect.get(window, "diagnoseAutocomplete") as (
      root: HTMLElement,
      options: { inspectRenderedOptions: boolean }
    ) => unknown[];
    if (!(root instanceof HTMLElement) || !(inputElement instanceof HTMLInputElement) || !(status instanceof HTMLElement)) {
      throw new Error("Browser diagnostics fixture is incomplete.");
    }
    const before = root.outerHTML;
    const statusText = status.textContent;
    const issues = diagnose(root, { inspectRenderedOptions: true });
    return {
      issueCount: issues.length,
      markupPreserved: root.outerHTML === before,
      statusPreserved: status.textContent === statusText,
      focusPreserved: document.activeElement === inputElement
    };
  });

  expect(result).toEqual({ issueCount: 0, markupPreserved: true, statusPreserved: true, focusPreserved: true });
});

test("@axe has no automatically detectable violations in the empty focus-open state", async ({ page }, testInfo) => {
  await page.goto("/test/fixtures/browser.html?openOnFocus=true&minLength=0");
  const input = page.getByLabel("City");
  await input.focus();
  await expect(input).toHaveAttribute("aria-expanded", "true");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, testInfo.project.name).toEqual([]);
});
