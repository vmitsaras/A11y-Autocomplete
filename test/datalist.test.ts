import { afterEach, describe, expect, it } from "vitest";
import { createDatalistAutocomplete } from "../src/datalist.js";
import { createAutocomplete } from "../src/index.js";

afterEach(() => {
  document.body.replaceChildren();
});

function datalistMarkup(options = ""): {
  root: HTMLElement;
  input: HTMLInputElement;
  datalist: HTMLDataListElement;
  form: HTMLFormElement;
} {
  document.body.innerHTML = `<form>
    <div class="a11y-autocomplete" data-a11y-autocomplete>
      <label for="city">City</label>
      <input id="city" name="city" list="city-options" data-autocomplete-input />
      <div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>
    <datalist id="city-options">${options}</datalist>
    <button type="submit">Submit</button>
  </form>`;
  return {
    root: document.querySelector("[data-a11y-autocomplete]") as HTMLElement,
    input: document.querySelector("#city") as HTMLInputElement,
    datalist: document.querySelector("#city-options") as HTMLDataListElement,
    form: document.querySelector("form") as HTMLFormElement
  };
}

describe("createDatalistAutocomplete", () => {
  it("converts eligible options, preserves duplicates, and selects the native value", () => {
    const { root, input, form } = datalistMarkup(`
      <option value="BER" label="Berlin"></option>
      <option value="ATH">Athens</option>
      <option value="" label="Empty"></option>
      <option value="ROM" label="Rome" disabled></option>
      <option value="BER" label="Brandenburg"></option>
      <option value="BER" label="Berlin"></option>
    `);
    Element.prototype.scrollIntoView ??= () => undefined;
    const instance = createDatalistAutocomplete(root, {
      datalist: "#city-options",
      minLength: 0,
      openOnFocus: true,
      maxResults: 10
    });

    expect(input.hasAttribute("list")).toBe(false);
    input.focus();

    expect(Array.from(root.querySelectorAll("[role=option]")).map((option) => option.textContent?.trim())).toEqual([
      "BER Berlin",
      "ATH Athens",
      "BER Brandenburg",
      "BER Berlin"
    ]);

    input.value = "Berlin";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(2);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(input.value).toBe("BER");
    expect(new FormData(form).get("city")).toBe("BER");
    expect(instance.getSelectedItem()).toEqual({ value: "BER", label: "Berlin" });
    expect(root.querySelector("[data-autocomplete-status]")?.textContent).toBe("BER selected.");
    expect(document.activeElement).toBe(input);
  });

  it("fails before mutation when the native association or core markup is invalid", () => {
    let { root, input } = datalistMarkup(`<option value="BER">Berlin</option>`);
    input.setAttribute("list", "another-list");
    expect(() => createDatalistAutocomplete(root, { datalist: "#city-options" })).toThrow(/list attribute/);
    expect(input.getAttribute("list")).toBe("another-list");
    expect(input.hasAttribute("role")).toBe(false);

    ({ root, input } = datalistMarkup(`<option value="BER">Berlin</option>`));
    root.querySelector("[data-autocomplete-popup]")?.remove();
    expect(() => createDatalistAutocomplete(root, { datalist: "#city-options" })).toThrow(/missing a required/);
    expect(input.getAttribute("list")).toBe("city-options");
    expect(input.hasAttribute("role")).toBe(false);

    ({ root, input } = datalistMarkup(`<option value="BER">Berlin</option>`));
    expect(() => createDatalistAutocomplete(root, { datalist: "[" })).toThrow(/invalid datalist selector/);
    expect(input.getAttribute("list")).toBe("city-options");
  });

  it("uses a static snapshot until refresh is called", () => {
    const { root, input, datalist } = datalistMarkup(`<option value="BER">Berlin</option>`);
    const first = createDatalistAutocomplete(root, { datalist: "#city-options", minLength: 0, openOnFocus: true });
    const duplicate = createDatalistAutocomplete(root, { datalist: "#city-options", maxResults: 1 });
    expect(duplicate).toBe(first);
    expect(createAutocomplete(root)).toBe(first);

    datalist.insertAdjacentHTML("beforeend", `<option value="ATH">Athens</option>`);
    input.focus();
    expect(root.querySelectorAll("[role=option]")).toHaveLength(1);

    input.value = "ath";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("[role=option]")).toHaveLength(0);

    input.value = "";
    first.refresh();
    expect(root.querySelectorAll("[role=option]")).toHaveLength(2);
  });

  it("rereads a replaced datalist and keeps the previous snapshot when refresh fails", () => {
    const { root, input, datalist } = datalistMarkup(`<option value="BER">Berlin</option>`);
    const instance = createDatalistAutocomplete(root, { datalist: "#city-options", minLength: 0, openOnFocus: true });
    input.focus();
    expect(root.querySelector("[role=option]")?.textContent).toContain("BER");

    const replacement = document.createElement("datalist");
    replacement.id = "city-options";
    replacement.innerHTML = `<option value="ATH" label="Athens"></option>`;
    datalist.replaceWith(replacement);
    instance.refresh();
    expect(root.querySelector("[role=option]")?.textContent).toContain("ATH");

    const invalidReplacement = document.createElement("div");
    invalidReplacement.id = "city-options";
    replacement.replaceWith(invalidReplacement);
    expect(() => instance.refresh()).toThrow(/HTMLDataListElement/);
    expect(root.querySelector("[role=option]")?.textContent).toContain("ATH");
  });

  it("restores the list attribute on destroy and rereads options on reinit", () => {
    const { root, input, datalist } = datalistMarkup(`<option value="BER">Berlin</option>`);
    const lifecycleInstances: unknown[] = [];
    root.addEventListener("a11y-autocomplete:init", (event) => lifecycleInstances.push((event as CustomEvent).detail.instance));
    root.addEventListener("a11y-autocomplete:destroy", (event) => lifecycleInstances.push((event as CustomEvent).detail.instance));
    const instance = createDatalistAutocomplete(root, { datalist: "#city-options", minLength: 0, openOnFocus: true });

    instance.destroy();
    expect(input.getAttribute("list")).toBe("city-options");
    expect(input.hasAttribute("role")).toBe(false);
    expect(() => instance.refresh()).toThrow(/not initialized/);
    expect(() => instance.destroy()).not.toThrow();

    datalist.replaceChildren();
    datalist.insertAdjacentHTML("beforeend", `<option value="ATH">Athens</option>`);
    instance.init();
    expect(input.hasAttribute("list")).toBe(false);
    input.focus();
    expect(root.querySelector("[role=option]")?.textContent).toContain("ATH");
    expect(lifecycleInstances.every((candidate) => candidate === instance)).toBe(true);
  });

  it("handles an empty datalist without opening either popup", () => {
    const { root, input } = datalistMarkup();
    createDatalistAutocomplete(root, { datalist: "#city-options", minLength: 0, openOnFocus: true });

    input.focus();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector("[data-autocomplete-popup]")?.hasAttribute("hidden")).toBe(true);
    expect(root.querySelector("[data-autocomplete-status]")?.textContent).toBe("No suggestions available.");
  });

  it("supports datalist-aware custom filtering and rendering", () => {
    const { root, input } = datalistMarkup(`
      <option value="BER" label="Berlin"></option>
      <option value="ATH" label="Athens"></option>
    `);
    createDatalistAutocomplete(root, {
      datalist: "#city-options",
      filterItems: ({ items, query }) => items.filter((item) => item.label.toLowerCase() === query.toLowerCase()),
      renderOption: (item) => `Choose ${item.label} (${item.value})`
    });

    input.focus();
    input.value = "Athens";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("[role=option]")?.textContent).toBe("Choose Athens (ATH)");
  });

  it("rejects adapter initialization after a core instance already owns the root", () => {
    const { root, input } = datalistMarkup(`<option value="BER">Berlin</option>`);
    createAutocomplete(root, { items: ["Berlin"] });

    expect(() => createDatalistAutocomplete(root, { datalist: "#city-options" })).toThrow(/core autocomplete instance/);
    expect(input.getAttribute("list")).toBe("city-options");
  });
});
