import { createTagInput, type TagInputInstance } from "a11y-tag-input";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAutocompleteTagInput,
  type AutocompleteTagInputInstance,
  type AutocompleteTagInputOptions
} from "../src/addons/tag-input.js";

const instances: AutocompleteTagInputInstance[] = [];
const standaloneTagInputs: TagInputInstance[] = [];

afterEach(() => {
  for (const instance of instances.splice(0).reverse()) instance.destroy();
  for (const tagInput of standaloneTagInputs.splice(0).reverse()) tagInput.destroy();
  document.body.replaceChildren();
  vi.useRealTimers();
});

function setup(options: AutocompleteTagInputOptions = {}, initialValue = "") {
  document.body.innerHTML = `<form>
    <div class="authored-tag-root" data-a11y-tag-input-root>
      <label for="topics">Topics</label>
      <textarea id="topics" name="topics" data-a11y-tag-input>${initialValue}</textarea>
    </div>
    <button type="submit">Submit</button>
  </form>`;
  const form = document.querySelector("form") as HTMLFormElement;
  const source = document.querySelector("#topics") as HTMLTextAreaElement;
  const label = document.querySelector("label") as HTMLLabelElement;
  const instance = createAutocompleteTagInput(source, {
    ...options,
    autocomplete: { items: ["Alpha", "Alpine", "Beta"], ...options.autocomplete },
    tagInput: options.tagInput
  });
  instances.push(instance);
  return { form, source, label, instance, field: instance.tagInput.field };
}

function enterValue(field: HTMLInputElement, value: string): void {
  field.focus();
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function press(field: HTMLInputElement, key: string): void {
  field.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("createAutocompleteTagInput", () => {
  it("enhances the generated tag field and reuses one composed instance", () => {
    const { source, label, instance, field } = setup();
    const duplicate = createAutocompleteTagInput(source, { autocomplete: { items: ["Ignored"] } });

    expect(duplicate).toBe(instance);
    expect(source.hidden).toBe(true);
    expect(label.htmlFor).toBe(field.id);
    expect(field.getAttribute("role")).toBe("combobox");
    expect(field.getAttribute("aria-autocomplete")).toBe("list");
    expect(instance.tagInput.control.hasAttribute("aria-readonly")).toBe(false);
    expect(instance.root.querySelectorAll("[data-autocomplete-tag-input-popup]")).toHaveLength(1);
    expect(instance.root.querySelectorAll("[data-autocomplete-tag-input-status]")).toHaveLength(1);
    expect(instance.root.querySelector(".a11y-tag-input__instructions")?.textContent).toContain("Press Enter to add the active suggestion");
  });

  it("keeps readonly state on the combobox without placing unsupported aria-readonly on the group", () => {
    const { instance, field } = setup();

    instance.tagInput.readonly(true);
    expect(field.getAttribute("aria-readonly")).toBe("true");
    expect(instance.tagInput.control.hasAttribute("aria-readonly")).toBe(false);

    instance.tagInput.disable();
    instance.tagInput.enable();
    expect(instance.tagInput.control.hasAttribute("aria-readonly")).toBe(false);
  });

  it("adds exactly the active suggestion instead of also adding the typed draft", () => {
    const { instance, field, source } = setup();
    const addEvents = vi.fn();
    source.addEventListener("a11y-tag-input:add", addEvents);

    enterValue(field, "Al");
    press(field, "ArrowDown");
    expect(field.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
    press(field, "Enter");

    expect(instance.tagInput.getTags()).toEqual(["Alpha"]);
    expect(instance.tagInput.control.hasAttribute("aria-readonly")).toBe(false);
    expect(field.value).toBe("");
    expect(addEvents).toHaveBeenCalledTimes(1);
    expect(instance.root.querySelector(".a11y-tag-input__status")?.textContent).toBe("Added tag Alpha.");
    expect(instance.root.querySelector<HTMLElement>("[data-autocomplete-tag-input-status]")?.textContent).toBe("");
  });

  it("inherits stopped arrow boundaries without adding a tag or changing the draft", () => {
    const { instance, field } = setup();
    Element.prototype.scrollIntoView ??= () => undefined;

    enterValue(field, "Al");
    press(field, "ArrowDown");
    const firstOptionId = field.getAttribute("aria-activedescendant");
    press(field, "ArrowUp");
    expect(field.getAttribute("aria-activedescendant")).toBe(firstOptionId);

    press(field, "ArrowDown");
    const lastOptionId = field.getAttribute("aria-activedescendant");
    press(field, "ArrowDown");

    expect(firstOptionId).toMatch(/-option-0$/);
    expect(lastOptionId).toMatch(/-option-1$/);
    expect(field.getAttribute("aria-activedescendant")).toBe(lastOptionId);
    expect(instance.root.querySelectorAll("[role=option][aria-selected=true]")).toHaveLength(1);
    expect(instance.tagInput.getTags()).toEqual([]);
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe("Al");
  });

  it("adds custom text when Enter is pressed without an active suggestion", () => {
    const { instance, field } = setup();

    enterValue(field, "Custom topic");
    expect(field.hasAttribute("aria-activedescendant")).toBe(false);
    press(field, "Enter");

    expect(instance.tagInput.getTags()).toEqual(["Custom topic"]);
    expect(field.value).toBe("");
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });

  it("adds a pointer-selected suggestion and leaves focus on the editable field", () => {
    const { instance, field } = setup();
    enterValue(field, "Be");
    const option = instance.root.querySelector<HTMLElement>("[role=option]");

    option?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(instance.tagInput.getTags()).toEqual(["Beta"]);
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe("");
  });

  it("closes an open popup before a later Escape clears the draft", () => {
    const { field } = setup();

    enterValue(field, "Al");
    press(field, "ArrowDown");
    expect(field.getAttribute("aria-expanded")).toBe("true");

    press(field, "Escape");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(field.value).toBe("Al");

    press(field, "Escape");
    expect(field.value).toBe("");
  });

  it("keeps a rejected duplicate available for correction and uses one error owner", () => {
    const { instance, field } = setup({}, "Alpha");

    enterValue(field, "Al");
    press(field, "ArrowDown");
    press(field, "Enter");

    expect(instance.tagInput.getTags()).toEqual(["Alpha"]);
    expect(field.value).toBe("Alpha");
    expect(instance.root.querySelector(".a11y-tag-input__error")?.textContent).toBe("Tag Alpha already exists.");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(instance.root.querySelector("[data-autocomplete-error]")).toBeNull();
  });

  it("supports an explicit item-to-tag mapper and preserves consumer beforeAdd hooks", () => {
    const beforeAdd = vi.fn((value: string) => value.toUpperCase());
    const { instance, field } = setup({
      autocomplete: { items: [{ label: "Alpha", value: "alpha-id" }] },
      tagInput: { hooks: { beforeAdd } },
      toTag: (item) => typeof item === "string" ? item : String(item.value)
    });

    enterValue(field, "Al");
    press(field, "ArrowDown");
    press(field, "Enter");

    expect(instance.tagInput.getTags()).toEqual(["ALPHA-ID"]);
    expect(beforeAdd).toHaveBeenCalledTimes(1);
    expect(beforeAdd).toHaveBeenCalledWith("alpha-id", instance.tagInput.context);
  });

  it("does not open suggestions or call an async source when no more tags can be added", () => {
    const source = vi.fn(async () => ["Beta"]);
    const { instance, field } = setup({
      autocomplete: { source, minLength: 0, openOnFocus: true, debounceDelay: 0 },
      tagInput: { maxTags: 1 }
    }, "Alpha");

    field.focus();
    press(field, "ArrowDown");

    expect(source).not.toHaveBeenCalled();
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(instance.root.querySelectorAll("[role=option]")).toHaveLength(0);
    expect(instance.root.querySelector<HTMLElement>("[data-autocomplete-tag-input-status]")?.textContent).toBe("");
  });

  it("restores initial tags and clears autocomplete state after native form reset", async () => {
    const { form, source, instance, field } = setup({}, "Alpha");
    enterValue(field, "Be");
    press(field, "ArrowDown");
    press(field, "Enter");
    expect(instance.tagInput.getTags()).toEqual(["Alpha", "Beta"]);
    expect(source.value).toBe("Alpha,Beta");

    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(instance.tagInput.getTags()).toEqual(["Alpha"]);
    expect(field.value).toBe("");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(instance.root.querySelectorAll("[role=option]")).toHaveLength(0);
  });

  it("cleans up both plugins in reverse order and supports a fresh initialization", () => {
    const { source, label, instance } = setup();
    const root = instance.root;

    instance.destroy();
    instances.splice(instances.indexOf(instance), 1);

    expect(source.hidden).toBe(false);
    expect(label.htmlFor).toBe("topics");
    expect(root.className).toBe("authored-tag-root");
    expect(root.querySelector(".a11y-tag-input__control")).toBeNull();
    expect(root.querySelector("[data-autocomplete-tag-input-status]")).toBeNull();

    const replacement = createAutocompleteTagInput(source, { autocomplete: { items: ["Beta"] } });
    instances.push(replacement);
    expect(replacement).not.toBe(instance);
    expect(replacement.tagInput.field.getAttribute("role")).toBe("combobox");
  });

  it("rejects a pre-initialized tag input because it cannot safely replace its hooks", () => {
    document.body.innerHTML = `<div data-a11y-tag-input-root><label for="topics">Topics</label><textarea id="topics"></textarea></div>`;
    const source = document.querySelector("textarea") as HTMLTextAreaElement;
    const tagInput = createTagInput(source);
    standaloneTagInputs.push(tagInput);

    expect(() => createAutocompleteTagInput(source, { autocomplete: { items: ["Alpha"] } })).toThrow(/must initialize the tag input/);
  });
});
