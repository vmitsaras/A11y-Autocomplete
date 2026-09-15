import { afterEach, describe, expect, it } from "vitest";
import {
  createDefaultPreset,
  createFormValidator,
  type A11yFormValidator
} from "a11y-form-validator";
import { createAutocomplete, type A11yAutocompleteInstance } from "../src/index.js";
import { createAutocompleteFormValidatorAddon } from "../src/addons/form-validator.js";

const autocompleteInstances: A11yAutocompleteInstance[] = [];
const validatorInstances: A11yFormValidator[] = [];

afterEach(() => {
  for (const validator of validatorInstances.splice(0)) validator.destroy();
  for (const autocomplete of autocompleteInstances.splice(0)) autocomplete.destroy();
  document.body.replaceChildren();
});

function setup(options: { required?: boolean } = {}) {
  document.body.innerHTML = `<form id="travel-form">
    <div data-a11y-autocomplete>
      <label for="city">City</label>
      <input id="city" name="city" ${options.required ? "required" : ""} data-autocomplete-input />
      <input name="city-id" type="hidden" data-autocomplete-hidden-value />
      <p id="city-hint">Choose a listed city.</p>
      <div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
    </div>
    <button type="submit">Continue</button>
  </form>`;
  const form = document.querySelector("form") as HTMLFormElement;
  const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
  const input = document.querySelector("#city") as HTMLInputElement;
  const hidden = document.querySelector("[data-autocomplete-hidden-value]") as HTMLInputElement;
  const autocomplete = createAutocomplete(root, {
    items: [
      { label: "Athens", value: "ath" },
      { label: "Berlin", value: "ber" }
    ],
    strict: true,
    validationMode: "external"
  });
  autocompleteInstances.push(autocomplete);

  const addon = createAutocompleteFormValidatorAddon({
    fields: [{ name: "city", autocomplete, message: "Choose a city from the suggestions." }]
  });
  const preset = createDefaultPreset();
  const presetAddons = Array.isArray(preset.addons) ? preset.addons : preset.addons ? [preset.addons] : [];
  const validator = createFormValidator(form, {
    ...preset,
    rules: { city: { autocompleteSelection: true } },
    addons: [...presetAddons, addon]
  }) as A11yFormValidator;
  validatorInstances.push(validator);
  return { form, root, input, hidden, autocomplete, validator, addon };
}

describe("createAutocompleteFormValidatorAddon", () => {
  it("gives the validator sole ownership of strict errors and its summary", async () => {
    const { root, input, validator } = setup();
    input.value = "Unknown";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await expect(validator.validate({ reason: "submit" })).resolves.toBe(false);

    const error = document.querySelector("#a11y-form-validator-error-travel-form-city");
    expect(error?.textContent).toBe("Choose a city from the suggestions.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-errormessage")).toBe(error?.id);
    expect(root.querySelector("[data-autocomplete-error]")).toBeNull();
    expect(document.querySelectorAll(".a11y-form-validator__summary-link")).toHaveLength(1);
    expect(validator.getErrors().fields).toEqual({ city: "Choose a city from the suggestions." });
  });

  it("clears an existing validator error when a suggestion is selected", async () => {
    const { input, validator } = setup();
    input.value = "Unknown";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await validator.validate({ reason: "submit" });

    input.focus();
    input.value = "Ath";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(input.value).toBe("Athens");
    expect(validator.getErrors().fields).toEqual({});
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(document.querySelector<HTMLElement>(".a11y-form-validator__summary")?.hidden).toBe(true);
  });

  it("commits an exact typed match so its hidden value is submitted", async () => {
    const { input, hidden, autocomplete, validator } = setup();
    input.value = "Athens";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await expect(validator.validate({ reason: "submit" })).resolves.toBe(true);

    expect(autocomplete.getSelectedItem()).toEqual({ label: "Athens", value: "ath" });
    expect(hidden.value).toBe("ath");
    expect(validator.getErrors().fields).toEqual({});
  });

  it("lets the native required rule own an empty field", async () => {
    const { input, validator } = setup({ required: true });

    await expect(validator.validate({ reason: "submit" })).resolves.toBe(false);

    expect(validator.getErrors().fields.city).toBe("This field is required.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelectorAll(".a11y-form-validator__summary-link")).toHaveLength(1);
  });

  it("rejects unsafe mappings and rule collisions", () => {
    document.body.innerHTML = `<form><div data-a11y-autocomplete><label for="city">City</label>
      <input id="city" name="city" data-autocomplete-input /><div data-autocomplete-status></div>
      <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div></div></form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    const root = document.querySelector("[data-a11y-autocomplete]") as HTMLElement;
    const autocomplete = createAutocomplete(root, { strict: true });
    autocompleteInstances.push(autocomplete);
    const addon = createAutocompleteFormValidatorAddon({ fields: [{ name: "city", autocomplete }] });

    expect(() => createFormValidator(form, {
      rules: { city: { autocompleteSelection: true } },
      addons: [addon]
    })).toThrow(/validationMode: "external"/);
  });

  it("removes its rule and listeners during validator cleanup", async () => {
    const { input, autocomplete, validator } = setup();
    validator.destroy();
    validatorInstances.splice(validatorInstances.indexOf(validator), 1);
    expect(validator.ruleRegistry.has("autocompleteSelection")).toBe(false);

    input.focus();
    input.value = "Ath";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await Promise.resolve();

    expect(autocomplete.getSelectedItem()).toEqual({ label: "Athens", value: "ath" });
    expect(document.querySelector(".a11y-form-validator__error")).toBeNull();
  });
});
