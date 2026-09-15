import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/index.html",
  "/examples/async-data/",
  "/examples/datalist.html",
  "/examples/form-validator-integration.html",
  "/examples/match-highlighting.html",
  "/examples/states.html",
  "/examples/tag-input-integration.html",
  "/examples/theme-unstyled.html",
  "/examples/themes.html"
];

for (const path of pages) {
  test(`@axe release audit has no detectable initial-state violations on ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, testInfo.project.name).toEqual([]);
  });

  test(`release audit reflows without page overflow on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    const measureReflow = () => page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${
              element.classList.length ? `.${Array.from(element.classList).join(".")}` : ""
            }`,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          };
        })
        .filter(({ left, right }) => left < -1 || right > viewportWidth + 1)
        .slice(0, 20);

      return {
        viewportWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        offenders
      };
    });

    const reflow = await measureReflow();
    expect(reflow.pageScrollWidth, JSON.stringify(reflow, null, 2)).toBeLessThanOrEqual(reflow.viewportWidth);

    await page.addStyleTag({
      content: `
        body * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
        p { margin-block-end: 2em !important; }
      `
    });
    const textSpacingReflow = await measureReflow();
    expect(
      textSpacingReflow.pageScrollWidth,
      `Text-spacing override:\n${JSON.stringify(textSpacingReflow, null, 2)}`
    ).toBeLessThanOrEqual(textSpacingReflow.viewportWidth);
  });
}
