import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutocomplete, initAutocompleteAll, type AutocompleteSourceContext } from "../src/index.js";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function markup(): HTMLElement {
  document.body.innerHTML = `<div class="a11y-autocomplete" data-a11y-autocomplete><label for="city">City</label><input id="city" data-autocomplete-input /><div data-autocomplete-status></div><div data-autocomplete-popup hidden><ul data-autocomplete-list></ul></div></div>`;
  return document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
}

describe("createAutocomplete", () => {
  it("initializes once and removes state when destroyed", () => {
    const root = markup();
    const first = createAutocomplete(root, { minLength: "invalid" });
    expect(first).toBe(createAutocomplete(root));
    expect(root.dataset.a11yAutocompleteInitialized).toBe("true");
    expect(root.querySelector("input")?.getAttribute("role")).toBe("combobox");
    first.destroy();
    expect(root.dataset.a11yAutocompleteInitialized).toBeUndefined();
    expect(root.querySelector("input")?.hasAttribute("role")).toBe(false);
  });

  it("restores author state and exposes the public instance in lifecycle events", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const list = root.querySelector("ul") as HTMLUListElement;
    input.setAttribute("role", "searchbox");
    input.setAttribute("aria-describedby", "author-help");
    list.append("Fallback result");
    const events: CustomEvent[] = [];
    root.addEventListener("a11y-autocomplete:init", (event) => events.push(event as CustomEvent));
    root.addEventListener("a11y-autocomplete:destroy", (event) => events.push(event as CustomEvent));

    const instance = createAutocomplete(root);
    expect(events[0].detail.instance).toBe(instance);
    instance.destroy();

    expect(events[1].detail.instance).toBe(instance);
    expect(input.getAttribute("role")).toBe("searchbox");
    expect(input.getAttribute("aria-describedby")).toBe("author-help");
    expect(list.textContent).toBe("Fallback result");
  });

  it("suppresses browser autocomplete only when the author has not configured it", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const instance = createAutocomplete(root);

    expect(input.getAttribute("autocomplete")).toBe("off");
    instance.destroy();
    expect(input.hasAttribute("autocomplete")).toBe(false);

    input.setAttribute("autocomplete", "address-level2");
    instance.init();
    expect(input.getAttribute("autocomplete")).toBe("address-level2");
    instance.destroy();
    expect(input.getAttribute("autocomplete")).toBe("address-level2");
  });

  it("finds declared roots without initializing on import", () => {
    markup();
    expect(initAutocompleteAll()).toHaveLength(1);
  });

  it("keeps focus on the input while keyboard navigation updates combobox state", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    Element.prototype.scrollIntoView ??= () => undefined;
    createAutocomplete(root, { items: ["Athens", "Berlin"] });

    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
    expect(root.querySelector("[role=option][aria-selected=true]")).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("stops arrow navigation at both listbox boundaries without changing focus, value, or status", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    Element.prototype.scrollIntoView ??= () => undefined;
    createAutocomplete(root, { items: ["Athens", "Atlanta"] });

    input.focus();
    input.value = "At";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const resultsMessage = status.textContent;

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    const firstOptionId = input.getAttribute("aria-activedescendant");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(input.getAttribute("aria-activedescendant")).toBe(firstOptionId);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    const lastOptionId = input.getAttribute("aria-activedescendant");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));

    expect(firstOptionId).toMatch(/-option-0$/);
    expect(lastOptionId).toMatch(/-option-1$/);
    expect(input.getAttribute("aria-activedescendant")).toBe(lastOptionId);
    expect(root.querySelectorAll("[role=option][aria-selected=true]")).toHaveLength(1);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("At");
    expect(status.textContent).toBe(resultsMessage);
  });

  it("keeps loading and empty messages out of the listbox", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
    const popup = root.querySelector("[data-autocomplete-popup]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    createAutocomplete(root, { items: ["Berlin"] });

    input.value = "zz";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(list.childElementCount).toBe(0);
    expect(popup.hidden).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(status.textContent).toContain("No suggestions found");
  });

  it("uses labelled ARIA groups for grouped suggestions", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      items: [{ label: "Countries", items: ["Greece", "Germany"] }]
    });

    input.value = "g";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const group = root.querySelector<HTMLElement>("[role=group]");
    const labelId = group?.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(root.querySelector(`#${labelId}`)?.textContent).toBe("Countries");
    expect(group?.querySelectorAll(":scope [role=option]")).toHaveLength(2);
  });

  it("focuses and associates the input when strict submission fails", () => {
    document.body.innerHTML = `<form><div class="a11y-autocomplete" data-a11y-autocomplete><label for="country">Country</label><input id="country" aria-describedby="country-hint" data-autocomplete-input /><p id="country-hint">Choose a listed country.</p><div data-autocomplete-status></div><div data-autocomplete-popup hidden><ul data-autocomplete-list></ul></div><p data-autocomplete-error>Original error</p></div><button type="submit">Submit</button></form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    const error = root.querySelector("[data-autocomplete-error]") as HTMLElement;
    const instance = createAutocomplete(root, { items: ["Greece"], strict: true });
    input.value = "France";

    const submit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(error.id).toBeTruthy();
    expect(input.getAttribute("aria-describedby")?.split(/\s+/)).toContain(error.id);

    instance.destroy();
    expect(error.hasAttribute("id")).toBe(false);
    expect(error.textContent).toBe("Original error");
  });

  it("checks strict validity without changing markup, selection, focus, or announcements", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const instance = createAutocomplete(root, { items: [{ label: "Athens", value: "ath" }], strict: true });
    input.value = "Athens";
    input.focus();
    const before = root.outerHTML;

    expect(instance.checkValidity()).toBe(true);
    expect(instance.getSelectedItem()).toBeNull();
    expect(root.outerHTML).toBe(before);
    expect(status.textContent).toBe("");
    expect(document.activeElement).toBe(input);

    input.value = "Unknown";
    const invalidBefore = root.outerHTML;
    expect(instance.checkValidity()).toBe(false);
    expect(root.outerHTML).toBe(invalidBefore);
  });

  it("delegates validation state and submit focus in external mode", () => {
    document.body.innerHTML = `<form><div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" name="city" aria-invalid="mixed" data-autocomplete-input />
      <input type="hidden" data-autocomplete-hidden-value />
      <div data-autocomplete-status></div><div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div><button type="submit">Submit</button></form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector<HTMLInputElement>("[data-autocomplete-input]") as HTMLInputElement;
    const hidden = root.querySelector<HTMLInputElement>("[data-autocomplete-hidden-value]") as HTMLInputElement;
    const instance = createAutocomplete(root, {
      items: [{ label: "Athens", value: "ath" }],
      strict: true,
      validationMode: "external"
    });

    expect(instance.validationMode).toBe("external");
    expect(input.getAttribute("aria-invalid")).toBe("mixed");
    input.value = "Unknown";
    expect(instance.validate()).toBe(false);
    expect(root.querySelector("[data-autocomplete-error]")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("mixed");

    const submit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(input);

    input.value = "Athens";
    expect(instance.checkValidity()).toBe(true);
    expect(hidden.value).toBe("");
    expect(instance.validate({ announce: false })).toBe(true);
    expect(hidden.value).toBe("ath");
    expect(instance.getSelectedItem()).toEqual({ label: "Athens", value: "ath" });
    expect(input.getAttribute("aria-invalid")).toBe("mixed");

    instance.destroy();
    expect(input.getAttribute("aria-invalid")).toBe("mixed");
  });
});

describe("semantic and lifecycle contracts", () => {
  it("adds live status defaults and restores the author state", () => {
    const root = markup();
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const instance = createAutocomplete(root);

    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");

    instance.destroy();
    expect(status.hasAttribute("role")).toBe(false);
    expect(status.hasAttribute("aria-live")).toBe(false);
    expect(status.hasAttribute("aria-atomic")).toBe(false);
  });

  it("renders one visual result summary outside the listbox and keeps it synchronized with the live status", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const popup = root.querySelector("[data-autocomplete-popup]") as HTMLElement;
    const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const first = createAutocomplete(root, {
      items: ["Athens", "Atlanta"],
      messages: { results: (count) => `${count} matching cities` }
    });
    const second = createAutocomplete(root);
    const summary = root.querySelector("[data-autocomplete-results-summary]") as HTMLElement;

    expect(second).toBe(first);
    expect(root.querySelectorAll("[data-autocomplete-results-summary]")).toHaveLength(1);
    expect(summary.parentElement).toBe(popup);
    expect(summary.nextElementSibling).toBe(list);
    expect(list.contains(summary)).toBe(false);
    expect(summary.getAttribute("aria-hidden")).toBe("true");
    expect(summary.hidden).toBe(true);

    input.focus();
    input.value = "at";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toBe("2 matching cities");
    expect(status.textContent).toBe("2 matching cities");
    expect(root.classList.contains("has-results-status")).toBe(true);
    expect(list.querySelectorAll("[role=option]")).toHaveLength(2);
    expect(summary.getAttribute("role")).toBeNull();
  });

  it("hides an empty visual result message and restores visible closed-state status messages", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    createAutocomplete(root, { items: ["Athens"], messages: { results: "" } });
    const summary = root.querySelector("[data-autocomplete-results-summary]") as HTMLElement;

    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);
    expect(summary.hidden).toBe(true);
    expect(summary.textContent).toBe("");
    expect(status.textContent).toBe("");
    expect(root.classList.contains("has-results-status")).toBe(false);

    input.value = "z";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(summary.hidden).toBe(true);
    expect(status.textContent).toBe("No suggestions found for z.");
    expect(root.classList.contains("has-results-status")).toBe(false);
  });

  it("clears, removes, and recreates exactly one generated summary across reset and reinitialization", () => {
    vi.useFakeTimers();
    const root = markup();
    const form = document.createElement("form");
    root.before(form);
    form.append(root);
    const input = root.querySelector("input") as HTMLInputElement;
    const instance = createAutocomplete(root, { items: ["Athens"] });

    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const summary = root.querySelector("[data-autocomplete-results-summary]") as HTMLElement;
    expect(summary.textContent).toBe("1 suggestion available.");

    form.reset();
    vi.runAllTimers();
    expect(summary.hidden).toBe(true);
    expect(summary.textContent).toBe("");

    instance.destroy();
    expect(root.querySelector("[data-autocomplete-results-summary]")).toBeNull();
    instance.init();
    expect(root.querySelectorAll("[data-autocomplete-results-summary]")).toHaveLength(1);
  });

  it("rejects unsupported inputs without partially initializing and can retry", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    input.type = "number";

    expect(() => createAutocomplete(root)).toThrow(/type text or search/);
    expect(root.hasAttribute("data-a11y-autocomplete-initialized")).toBe(false);
    expect(input.hasAttribute("role")).toBe(false);

    input.type = "search";
    expect(() => createAutocomplete(root)).not.toThrow();
  });

  it("keeps listbox references unique when author ids are duplicated", () => {
    document.body.innerHTML = ["one", "two"].map((name) => `<div data-a11y-autocomplete>
      <label for="${name}">${name}</label><input id="${name}" data-autocomplete-input />
      <div data-autocomplete-status></div><div hidden data-autocomplete-popup>
        <ul id="duplicate-list" data-autocomplete-list></ul>
      </div></div>`).join("");

    const instances = initAutocompleteAll({ items: ["Athens"] });
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-autocomplete-input]"));
    const controls = inputs.map((input) => input.getAttribute("aria-controls"));

    expect(instances).toHaveLength(2);
    expect(new Set(controls).size).toBe(2);
    for (const id of controls) expect(document.getElementById(id ?? "")).not.toBeNull();
  });

  it("supports destroy, idempotent destroy, and one clean reinitialization", () => {
    const root = markup();
    const instance = createAutocomplete(root, { items: ["Athens"] });
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
    expect(() => instance.clear()).toThrow(/not initialized/);

    instance.init();
    expect(createAutocomplete(root)).toBe(instance);
    expect(root.dataset.a11yAutocompleteInitialized).toBe("true");
  });

  it("restores the original disabled state when destroyed", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    input.disabled = true;
    const instance = createAutocomplete(root);
    instance.enable();
    expect(input.disabled).toBe(false);
    instance.destroy();
    expect(input.disabled).toBe(true);
  });
});

describe("autocomplete modes and collection boundaries", () => {
  it("keeps no-autocomplete suggestions query-independent", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const filterItems = vi.fn(() => ["Filtered"]);
    createAutocomplete(root, { autoComplete: "none", items: ["Athens", "Berlin"], filterItems });

    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(input.getAttribute("aria-autocomplete")).toBe("none");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(2);
    expect(filterItems).not.toHaveBeenCalled();
  });

  it("falls back to list behavior for an invalid runtime autocomplete value", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      autoComplete: "both" as unknown as "list",
      items: ["Athens", "Berlin"]
    });

    input.value = "ath";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);
  });

  it("preserves mixed flat and grouped results while enforcing one global limit", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      minLength: 0,
      maxResults: 3,
      items: ["Athens", { label: "Countries", items: ["Albania", "Algeria"] }, "Andorra"]
    });

    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(Array.from(root.querySelectorAll("[role=option]")).map((node) => node.textContent)).toEqual([
      "Athens", "Albania", "Algeria"
    ]);
  });

  it("uses documented defaults for malformed integer strings and accepts valid ones", () => {
    let root = markup();
    let input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { maxResults: "2items", items: Array.from({ length: 10 }, (_, index) => `A${index}`) });
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(8);

    root = markup();
    input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { maxResults: "2", items: ["A1", "A2", "A3"] });
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(2);
  });
});

describe("empty-query opening on focus", () => {
  it("opens capped local results while keeping focus on the input", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const popup = root.querySelector("[data-autocomplete-popup]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const results = vi.fn();
    root.addEventListener("a11y-autocomplete:results", results);
    Element.prototype.scrollIntoView ??= () => undefined;
    createAutocomplete(root, {
      items: ["Athens", "Berlin", "Lisbon"],
      minLength: 0,
      maxResults: 2,
      openOnFocus: true
    });

    input.focus();

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(popup.hidden).toBe(false);
    expect(Array.from(root.querySelectorAll("[role=option]")).map((option) => option.textContent)).toEqual(["Athens", "Berlin"]);
    expect(status.textContent).toBe("2 suggestions available.");
    expect(results).toHaveBeenCalledTimes(1);
    expect((results.mock.calls[0][0] as CustomEvent).detail.source).toBe("focus");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
  });

  it("honors highlight-first behavior when opening empty local results", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    Element.prototype.scrollIntoView ??= () => undefined;
    createAutocomplete(root, {
      items: ["Athens", "Berlin"],
      minLength: 0,
      openOnFocus: true,
      highlightFirst: true
    });

    input.focus();

    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
    expect(document.activeElement).toBe(input);
  });

  it("keeps the popup closed and announces the empty-query no-results message", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const popup = root.querySelector("[data-autocomplete-popup]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    createAutocomplete(root, { minLength: 0, openOnFocus: true });

    input.focus();

    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(popup.hidden).toBe(true);
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
    expect(status.textContent).toBe("No suggestions available.");
  });

  it("keeps an empty field closed when the minimum length is greater than zero", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const popup = root.querySelector("[data-autocomplete-popup]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const filterItems = vi.fn(({ items }) => items);
    createAutocomplete(root, {
      items: ["Athens"],
      filterItems,
      minLength: 1,
      openOnFocus: true
    });

    input.focus();

    expect(filterItems).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(popup.hidden).toBe(true);
    expect(status.textContent).toBe("");
  });

  it("does not refresh a disabled input when a focus event is dispatched", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const filterItems = vi.fn(({ items }) => items);
    const instance = createAutocomplete(root, {
      items: ["Athens"],
      filterItems,
      minLength: 0,
      openOnFocus: true
    });
    instance.disable();

    input.dispatchEvent(new FocusEvent("focus"));

    expect(filterItems).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
  });

  it("does not duplicate focus work when initialized twice", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const filterItems = vi.fn(({ items }) => items);
    const results = vi.fn();
    root.addEventListener("a11y-autocomplete:results", results);
    const first = createAutocomplete(root, {
      items: ["Athens"],
      filterItems,
      minLength: 0,
      openOnFocus: true
    });
    const second = createAutocomplete(root);

    input.focus();

    expect(second).toBe(first);
    expect(filterItems).toHaveBeenCalledTimes(1);
    expect(results).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll("[data-autocomplete-status]")).toHaveLength(1);
    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);
  });

  it("opens exactly once after destroy and reinitialization", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const filterItems = vi.fn(({ items }) => items);
    const results = vi.fn();
    root.addEventListener("a11y-autocomplete:results", results);
    const instance = createAutocomplete(root, {
      items: ["Athens"],
      filterItems,
      minLength: 0,
      openOnFocus: true
    });

    input.focus();
    input.blur();
    instance.destroy();
    expect(input.hasAttribute("aria-expanded")).toBe(false);

    instance.init();
    input.focus();

    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(filterItems).toHaveBeenCalledTimes(2);
    expect(results).toHaveBeenCalledTimes(2);
  });

  it("requests and announces capped async results for an empty query", async () => {
    vi.useFakeTimers();
    const request = deferred<string[]>();
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const source = vi.fn((_context: AutocompleteSourceContext) => request.promise);
    createAutocomplete(root, {
      source,
      debounceDelay: 0,
      minLength: 0,
      maxResults: 2,
      openOnFocus: true
    });

    input.value = "   ";
    input.focus();
    vi.runOnlyPendingTimers();

    expect(source).toHaveBeenCalledTimes(1);
    expect(source.mock.calls[0][0].query).toBe("");
    expect(source.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(status.textContent).toBe("Loading suggestions.");

    request.resolve(["Athens", "Berlin", "Lisbon"]);
    await flushPromises();

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(list.getAttribute("aria-busy")).toBe("false");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(2);
    expect(status.textContent).toBe("2 suggestions available.");
  });

  it("aborts an empty async request on blur without a late announcement or reopen", async () => {
    vi.useFakeTimers();
    const request = deferred<string[]>();
    let signal!: AbortSignal;
    document.body.innerHTML = `<div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div></div>
      <button id="next">Next</button>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const next = document.querySelector("#next") as HTMLButtonElement;
    createAutocomplete(root, {
      source: (context) => { signal = context.signal; return request.promise; },
      debounceDelay: 0,
      minLength: 0,
      openOnFocus: true
    });

    input.focus();
    vi.runOnlyPendingTimers();
    expect(status.textContent).toBe("Loading suggestions.");

    next.focus();
    vi.runOnlyPendingTimers();
    expect(signal.aborted).toBe(true);
    expect(status.textContent).toBe("");

    request.resolve(["Athens"]);
    await flushPromises();

    expect(document.activeElement).toBe(next);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
    expect(status.textContent).toBe("");
  });
});

describe("keyboard, focus, and form behavior", () => {
  it("activates the first option when ArrowDown opens a highlight-first popup", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { items: ["Athens", "Albania"], highlightFirst: true });
    input.focus();
    input.value = "a";

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(input.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
  });

  it("commits select-on-blur without returning focus", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div></div>
      <button type="button" id="next">Next</button>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    const next = document.querySelector("#next") as HTMLButtonElement;
    const sources: string[] = [];
    root.addEventListener("a11y-autocomplete:select", (event) => sources.push((event as CustomEvent).detail.source));
    createAutocomplete(root, { items: ["Athens"], selectOnBlur: true });
    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    next.focus();
    vi.runAllTimers();

    expect(document.activeElement).toBe(next);
    expect(input.value).toBe("Athens");
    expect(sources).toEqual(["blur"]);
  });

  it("validates an exact strict value on blur without stealing focus", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div></div>
      <button type="button" id="next">Next</button>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    const next = document.querySelector("#next") as HTMLButtonElement;
    createAutocomplete(root, { items: ["Athens"], strict: true });
    input.focus();
    input.value = "Athens";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    next.focus();
    vi.runAllTimers();

    expect(document.activeElement).toBe(next);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("closes first and clears second when Escape clearing is enabled", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const instance = createAutocomplete(root, { items: ["Athens"], clearOnEscape: true });
    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(input.value).toBe("a");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(instance.getValue()).toBe("");
  });

  it("preserves native visible and hidden defaults after form reset", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<form><div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" value="Athens" data-autocomplete-input />
      <input type="hidden" value="ath" data-autocomplete-hidden-value />
      <div data-autocomplete-status></div><div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
      </div><button type="reset">Reset</button></form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("[data-autocomplete-input]") as HTMLInputElement;
    const hidden = root.querySelector("[data-autocomplete-hidden-value]") as HTMLInputElement;
    const instance = createAutocomplete(root, { items: [{ label: "Berlin", value: "ber" }] });
    instance.setValue("Berlin", { silent: true });
    hidden.value = "ber";

    form.reset();
    vi.runAllTimers();

    expect(input.value).toBe("Athens");
    expect(hidden.value).toBe("ath");
  });
});

describe("async, recovery, and unusual input", () => {
  it("does not select twice when a delayed click follows keyboard selection", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const selections = vi.fn();
    root.addEventListener("a11y-autocomplete:select", selections);
    createAutocomplete(root, { items: ["Athens"] });

    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const option = root.querySelector("[role=option]") as HTMLElement;
    option.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(input.value).toBe("Athens");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(selections).toHaveBeenCalledTimes(1);
  });

  it("omits options without usable names and flattens an unlabeled group", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      items: [
        "",
        "   ",
        { label: "", value: "hidden-id" },
        { label: "   ", items: ["Athens"] },
        { label: "Empty group", items: [] },
        "Berlin"
      ],
      minLength: 0,
      maxResults: 2,
      openOnFocus: true
    });

    input.focus();

    expect(Array.from(root.querySelectorAll("[role=option]")).map((option) => option.textContent)).toEqual([
      "Athens",
      "Berlin"
    ]);
    expect(root.querySelector("[role=group]")).toBeNull();
    expect(root.querySelector("[data-autocomplete-status]")?.textContent).toBe("2 suggestions available.");
  });

  it("matches canonically equivalent Unicode and preserves emoji and RTL labels", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { items: ["Caf\u00e9", "\ud83d\udc69\u200d\ud83d\udcbb \u0645\u0637\u0648\u0651\u0631\u0629", "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1"] });

    input.value = "Cafe\u0301";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")?.textContent).toBe("Caf\u00e9");

    input.value = "\ud83d\udc69\u200d\ud83d\udcbb";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")?.textContent).toBe("\ud83d\udc69\u200d\ud83d\udcbb \u0645\u0637\u0648\u0651\u0631\u0629");

    input.value = "\u05ea\u05dc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")?.textContent).toBe("\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1");
  });

  it("fails safely on malformed async items and recovers on the next request", async () => {
    vi.useFakeTimers();
    let malformed = true;
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    createAutocomplete(root, {
      debounceDelay: 0,
      source: async () => malformed
        ? [null, "Athens"] as unknown as string[]
        : ["Athens"]
    });

    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.runOnlyPendingTimers();
    await flushPromises();

    expect(status.textContent).toBe("Suggestions could not be loaded.");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);

    malformed = false;
    input.value = "at";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.runOnlyPendingTimers();
    await flushPromises();

    expect(status.textContent).toBe("1 suggestion available.");
    expect(root.querySelector("[role=option]")?.textContent).toBe("Athens");
    expect(root.classList.contains("has-error")).toBe(false);
  });

  it.each(["clear", "reset", "disable", "destroy"] as const)(
    "prevents late async results after %s",
    async (action) => {
      vi.useFakeTimers();
      const request = deferred<string[]>();
      let signal!: AbortSignal;
      const root = markup();
      const form = document.createElement("form");
      root.before(form);
      form.append(root);
      const input = root.querySelector("input") as HTMLInputElement;
      const list = root.querySelector("[data-autocomplete-list]") as HTMLElement;
      const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
      const instance = createAutocomplete(root, {
        debounceDelay: 0,
        source: (context) => {
          signal = context.signal;
          return request.promise;
        }
      });

      input.focus();
      input.value = "a";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      vi.runOnlyPendingTimers();
      expect(status.textContent).toBe("Loading suggestions.");

      if (action === "clear") instance.clear();
      else if (action === "reset") form.reset();
      else if (action === "disable") instance.disable();
      else instance.destroy();
      vi.runOnlyPendingTimers();

      expect(signal.aborted).toBe(true);
      request.resolve(["Athens"]);
      await flushPromises();

      expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
      if (action === "destroy") {
        expect(input.hasAttribute("role")).toBe(false);
        expect(list.hasAttribute("aria-busy")).toBe(false);
      } else {
        expect(input.getAttribute("aria-expanded")).toBe("false");
        expect(list.getAttribute("aria-busy")).toBe("false");
      }
    }
  );

  it("ignores out-of-order results and removes stale options during debounce", async () => {
    vi.useFakeTimers();
    const first = deferred<Array<string>>();
    const second = deferred<Array<string>>();
    const signals: AbortSignal[] = [];
    let call = 0;
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      debounceDelay: 0,
      source: ({ signal }) => {
        signals.push(signal);
        call += 1;
        return call === 1 ? first.promise : second.promise;
      }
    });
    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.runOnlyPendingTimers();

    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);
    expect(signals[0].aborted).toBe(true);
    vi.runOnlyPendingTimers();

    first.resolve(["Athens"]);
    second.resolve(["Abidjan"]);
    await flushPromises();

    expect(Array.from(root.querySelectorAll("[role=option]")).map((node) => node.textContent)).toEqual(["Abidjan"]);
  });

  it("cancels an async request on blur and never reopens after it resolves", async () => {
    vi.useFakeTimers();
    const request = deferred<Array<string>>();
    let signal!: AbortSignal;
    document.body.innerHTML = `<div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div></div>
      <button id="next">Next</button>`;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    const next = document.querySelector("#next") as HTMLButtonElement;
    createAutocomplete(root, { debounceDelay: 0, source: (context) => { signal = context.signal; return request.promise; } });
    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.runOnlyPendingTimers();
    next.focus();
    vi.runOnlyPendingTimers();

    expect(signal.aborted).toBe(true);
    request.resolve(["Athens"]);
    await flushPromises();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector("[data-autocomplete-popup]")?.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(next);
  });

  it("accepts a selected async result in strict mode and rejects a later edit", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<form><div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" data-autocomplete-input /><input type="hidden" data-autocomplete-hidden-value />
      <div data-autocomplete-status></div><div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
      </div><button type="submit">Submit</button></form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const input = root.querySelector("[data-autocomplete-input]") as HTMLInputElement;
    const hidden = root.querySelector("[data-autocomplete-hidden-value]") as HTMLInputElement;
    createAutocomplete(root, {
      strict: true,
      debounceDelay: 0,
      source: async () => [{ label: "Athens", value: "ath" }]
    });
    input.focus();
    input.value = "ath";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.runOnlyPendingTimers();
    await flushPromises();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const validSubmit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(validSubmit);
    expect(validSubmit.defaultPrevented).toBe(false);
    expect(hidden.value).toBe("ath");

    input.value = "Athens edited";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const invalidSubmit = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(invalidSubmit);
    expect(invalidSubmit.defaultPrevented).toBe(true);
  });

  it("suppresses filtering during IME composition and refreshes once at the end", () => {
    const filterItems = vi.fn(({ items }) => items);
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { items: ["東京"], filterItems });
    input.focus();
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input.value = "東";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true }));
    expect(filterItems).not.toHaveBeenCalled();

    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    expect(filterItems).toHaveBeenCalledTimes(1);
  });

  it("fails safely when a consumer filter throws and recovers on retry", () => {
    let shouldThrow = true;
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    const errors: CustomEvent[] = [];
    root.addEventListener("a11y-autocomplete:error", (event) => errors.push(event as CustomEvent));
    createAutocomplete(root, {
      items: ["Athens"],
      filterItems: ({ items }) => {
        if (shouldThrow) throw new Error("filter failed");
        return items;
      }
    });
    input.focus();
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(status.textContent).toContain("could not be loaded");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(errors).toHaveLength(1);

    shouldThrow = false;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);
    expect(root.classList.contains("has-error")).toBe(false);
  });

  it("falls back to stable status copy when a custom message throws", () => {
    const root = markup();
    const input = root.querySelector("input") as HTMLInputElement;
    const status = root.querySelector("[data-autocomplete-status]") as HTMLElement;
    createAutocomplete(root, {
      items: ["Athens"],
      messages: { results: () => { throw new Error("message failed"); } }
    });
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(status.textContent).toBe("1 suggestion available.");
    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);
  });

  it("renders hostile-looking labels as text and rejects interactive option descendants", () => {
    let root = markup();
    let input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, { items: ["<button>unsafe</button>"] });
    input.value = "button";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")?.textContent).toBe("<button>unsafe</button>");
    expect(root.querySelector("[role=option] button")).toBeNull();

    root = markup();
    input = root.querySelector("input") as HTMLInputElement;
    createAutocomplete(root, {
      items: ["Athens"],
      renderOption: () => {
        const button = document.createElement("button");
        button.textContent = "Nested action";
        return button;
      }
    });
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")).toBeNull();
    expect(root.textContent).toContain("Suggestions could not be loaded");
  });
});
