import assert from "node:assert/strict";
import { Window } from "happy-dom";

const main = await import("a11y-autocomplete");
const formValidatorAddon = await import("a11y-autocomplete/addons/form-validator");
const tagInputAddon = await import("a11y-autocomplete/addons/tag-input");
const datalist = await import("a11y-autocomplete/datalist");
const diagnostics = await import("a11y-autocomplete/diagnostics");

assert.equal(typeof diagnostics.diagnoseAutocomplete, "function", "The diagnostics subpath must export diagnoseAutocomplete().");
assert.equal("diagnoseAutocomplete" in main, false, "Diagnostics must remain opt-in and absent from the main entry point.");
assert.equal(typeof formValidatorAddon.createAutocompleteFormValidatorAddon, "function", "The form validator addon subpath must export its factory.");
assert.equal("createAutocompleteFormValidatorAddon" in main, false, "The form validator addon must remain opt-in and absent from the main entry point.");
assert.equal(typeof tagInputAddon.createAutocompleteTagInput, "function", "The tag input addon subpath must export its factory.");
assert.equal("createAutocompleteTagInput" in main, false, "The tag input addon must remain opt-in and absent from the main entry point.");
assert.equal(typeof datalist.createDatalistAutocomplete, "function", "The datalist subpath must export createDatalistAutocomplete().");
assert.equal("createDatalistAutocomplete" in main, false, "The datalist adapter must remain opt-in and absent from the main entry point.");

const browser = new Window();
for (const name of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLDataListElement",
  "Element",
  "Node",
  "CustomEvent",
  "DOMException"
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: browser[name] });
}

browser.document.body.innerHTML = `<div data-a11y-autocomplete>
  <label for="city">City</label>
  <input id="city" list="city-options" data-autocomplete-input />
  <div data-autocomplete-status></div>
  <div hidden data-autocomplete-popup><ul data-autocomplete-list></ul></div>
</div>
<datalist id="city-options"><option value="Athens"></option></datalist>`;
const root = browser.document.querySelector("[data-a11y-autocomplete]");
assert.ok(root instanceof browser.HTMLElement);
const adapter = datalist.createDatalistAutocomplete(root, { datalist: "#city-options" });
assert.equal(main.createAutocomplete(root), adapter, "The main and datalist entry points must share one instance registry.");
