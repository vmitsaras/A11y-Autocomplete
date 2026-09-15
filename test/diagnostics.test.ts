import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnoseAutocomplete } from "../src/diagnostics.js";
import { createAutocomplete } from "../src/index.js";
import type {
  AutocompleteDiagnosticIssue,
  AutocompleteDiagnosticOptions
} from "../src/diagnostics.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function validMarkup(): HTMLElement {
  document.body.innerHTML = `<div class="a11y-autocomplete" data-a11y-autocomplete>
    <label for="city">City</label>
    <input id="city" aria-describedby="city-hint" data-autocomplete-input />
    <button type="button" hidden disabled data-autocomplete-clear>Clear</button>
    <p id="city-hint">Choose a listed city.</p>
    <div data-autocomplete-status></div>
    <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
  </div>`;
  return document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
}

function issueCodes(root: HTMLElement, options?: AutocompleteDiagnosticOptions): string[] {
  return diagnoseAutocomplete(root, options).map(({ code }) => code);
}

describe("diagnoseAutocomplete", () => {
  it("returns structured issues and stays silent for valid markup", () => {
    const root = validMarkup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const issues: AutocompleteDiagnosticIssue[] = diagnoseAutocomplete(root);

    expect(issues).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ["explicit label", `<label for="city">City</label><input id="city" data-autocomplete-input />`],
    ["wrapping label", `<label>City <input data-autocomplete-input /></label>`],
    ["aria-label", `<input aria-label="City" data-autocomplete-input />`],
    ["aria-labelledby", `<span id="city-label">City</span><input aria-labelledby="city-label" data-autocomplete-input />`]
  ])("accepts an input name from %s", (_name, inputMarkup) => {
    document.body.innerHTML = `<div data-a11y-autocomplete>${inputMarkup}
      <div data-autocomplete-status></div><div data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;

    expect(issueCodes(root)).not.toContain("input-accessible-name-missing");
  });

  it("accepts an associated label outside the root", () => {
    document.body.innerHTML = `<label for="city">City</label><div data-a11y-autocomplete>
      <input id="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;

    expect(issueCodes(root)).toEqual([]);
  });

  it("does not treat placeholder or title as a sufficient explicit name", () => {
    document.body.innerHTML = `<div data-a11y-autocomplete>
      <input placeholder="City" title="City" data-autocomplete-input />
      <div data-autocomplete-status></div><div data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;

    expect(issueCodes(root)).toEqual(["input-accessible-name-missing"]);
  });

  it("reports an invalid aria-labelledby name and its broken reference in check order", () => {
    document.body.innerHTML = `<div data-a11y-autocomplete>
      <input aria-labelledby="missing-label" data-autocomplete-input />
      <div data-autocomplete-status></div><div data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;

    expect(issueCodes(root)).toEqual(["input-accessible-name-missing", "id-reference-broken"]);
  });

  it("reports unsupported or missing input targets", () => {
    const root = validMarkup();
    const input = root.querySelector("input") as HTMLInputElement;
    input.type = "number";
    expect(issueCodes(root)).toContain("input-type-unsupported");

    input.remove();
    expect(issueCodes(root)).toContain("input-type-unsupported");
  });

  it("reports relevant duplicate ids with every duplicate element", () => {
    const root = validMarkup();
    const duplicate = document.createElement("div");
    duplicate.id = "city";
    document.body.append(duplicate);

    const issue = diagnoseAutocomplete(root).find(({ code }) => code === "duplicate-id");
    expect(issue?.elements).toEqual([root.querySelector("#city"), duplicate]);
  });

  it("reports duplicated external reference targets but ignores unrelated duplicates", () => {
    const root = validMarkup();
    const input = root.querySelector("input") as HTMLInputElement;
    input.setAttribute("aria-describedby", "shared-help");
    document.body.insertAdjacentHTML("beforeend", `
      <p id="shared-help">First help</p><p id="shared-help">Second help</p>
      <span id="unrelated">One</span><span id="unrelated">Two</span>`);

    const duplicateIssues = diagnoseAutocomplete(root).filter(({ code }) => code === "duplicate-id");
    expect(duplicateIssues).toHaveLength(1);
    expect(duplicateIssues[0].elements).toHaveLength(2);
  });

  it("reports each distinct broken id reference once", () => {
    const root = validMarkup();
    const input = root.querySelector("input") as HTMLInputElement;
    input.setAttribute("aria-describedby", "missing-help missing-help");
    input.setAttribute("aria-controls", "missing-list");

    const broken = diagnoseAutocomplete(root).filter(({ code }) => code === "id-reference-broken");
    expect(broken.map(({ message }) => message)).toEqual([
      expect.stringContaining("missing-list"),
      expect.stringContaining("missing-help")
    ]);
  });

  it("reports clear controls that are not buttons", () => {
    const root = validMarkup();
    root.querySelector("button")?.remove();
    root.insertAdjacentHTML("beforeend", `<span data-autocomplete-clear>Clear</span>`);

    expect(issueCodes(root)).toContain("clear-control-not-button");
  });

  it("reports clear-button type and naming problems without rejecting valid disabled or hidden buttons", () => {
    const root = validMarkup();
    const clear = root.querySelector("button") as HTMLButtonElement;
    clear.removeAttribute("type");
    clear.textContent = "";

    expect(issueCodes(root)).toEqual(["clear-control-type-invalid", "clear-control-name-missing"]);

    clear.type = "button";
    clear.setAttribute("aria-label", "Clear city");
    expect(issueCodes(root)).toEqual([]);
  });

  it("reports status regions placed inside the listbox", () => {
    const root = validMarkup();
    const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    list.append(status);

    const issue = diagnoseAutocomplete(root).find(({ code }) => code === "status-region-misplaced");
    expect(issue?.elements).toEqual([status, list]);
  });

  it("inspects rendered options only when requested and ignores non-focusable descendants", () => {
    const root = validMarkup();
    const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
    list.innerHTML = `<li role="option" data-autocomplete-option>
      <span>Presentational</span>
      <button type="button">Action</button>
      <button type="button" disabled>Disabled action</button>
      <a href="#" tabindex="-1">Programmatic link</a>
      <span hidden><button type="button">Hidden action</button></span>
    </li>`;

    expect(issueCodes(root)).not.toContain("option-descendant-focusable");
    const issue = diagnoseAutocomplete(root, { inspectRenderedOptions: true })
      .find(({ code }) => code === "option-descendant-focusable");
    expect(issue?.elements).toEqual([list.firstElementChild, list.querySelector("button:not([disabled])")]);
  });

  it("supports matching custom selectors before and after initialization", () => {
    document.body.innerHTML = `<div data-a11y-autocomplete>
      <label for="city">City</label><input id="city" class="custom-input" />
      <button class="custom-clear" type="button">Clear</button>
      <div class="custom-status"></div><div class="custom-popup"><ul class="custom-list"></ul></div>
    </div>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const selectors = {
      inputSelector: ".custom-input",
      clearSelector: ".custom-clear",
      statusSelector: ".custom-status",
      popupSelector: ".custom-popup",
      listSelector: ".custom-list"
    };

    expect(diagnoseAutocomplete(root, selectors)).toEqual([]);
    createAutocomplete(root, selectors);
    expect(diagnoseAutocomplete(root, selectors)).toEqual([]);
  });

  it("reports nested initialized roots but not initialized siblings", () => {
    const outer = validMarkup();
    outer.setAttribute("data-a11y-autocomplete-initialized", "true");
    const nested = document.createElement("div");
    nested.setAttribute("data-a11y-autocomplete-initialized", "true");
    outer.append(nested);
    const sibling = document.createElement("div");
    sibling.setAttribute("data-a11y-autocomplete-initialized", "true");
    document.body.append(sibling);

    const issue = diagnoseAutocomplete(outer).find(({ code }) => code === "initialized-root-conflict");
    expect(issue?.elements).toEqual([outer, nested]);
  });

  it.each(["is-disabled", "is-loading", "has-error", "has-no-results", "is-open"])(
    "does not treat the %s runtime state as an integration issue",
    (state) => {
      const root = validMarkup();
      root.classList.add(state);
      expect(diagnoseAutocomplete(root)).toEqual([]);
    }
  );

  it("does not mutate markup, focus, status text, or dispatch lifecycle events", () => {
    const root = validMarkup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    status.textContent = "Loading suggestions.";
    input.focus();
    const before = root.outerHTML;
    const events = vi.fn();
    root.addEventListener("a11y-autocomplete:init", events);
    root.addEventListener("a11y-autocomplete:open", events);
    const observer = new MutationObserver(() => undefined);
    observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });

    diagnoseAutocomplete(root, { inspectRenderedOptions: true });

    expect(root.outerHTML).toBe(before);
    expect(document.activeElement).toBe(input);
    expect(status.textContent).toBe("Loading suggestions.");
    expect(observer.takeRecords()).toEqual([]);
    expect(events).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it("logs all issues once only when logging is explicitly enabled", () => {
    const root = validMarkup();
    root.querySelector("label")?.remove();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    diagnoseAutocomplete(root);
    expect(warn).not.toHaveBeenCalled();

    const issues = diagnoseAutocomplete(root, { log: true });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("1 issue"), issues);
  });

  it("does no work merely by importing the diagnostics module", async () => {
    const root = validMarkup();
    root.querySelector("label")?.remove();
    const before = root.outerHTML;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.resetModules();

    const diagnostics = await import("../src/diagnostics.js");

    expect(typeof diagnostics.diagnoseAutocomplete).toBe("function");
    expect(root.outerHTML).toBe(before);
    expect(warn).not.toHaveBeenCalled();
  });

  it("throws for invalid roots and selector syntax", () => {
    const root = validMarkup();
    expect(() => diagnoseAutocomplete(null as unknown as HTMLElement)).toThrow(TypeError);
    expect(() => diagnoseAutocomplete(root, { inputSelector: "[" })).toThrow();
  });
});
