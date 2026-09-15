# A11y Autocomplete

A dependency-free, progressively enhanced autocomplete with accessible keyboard navigation, live announcements, optional strict-selection validation, and cleanup-safe lifecycle behavior.

## Installation

```sh
npm install a11y-autocomplete
pnpm add a11y-autocomplete
yarn add a11y-autocomplete
```

## Usage

```ts
import { createAutocomplete } from "a11y-autocomplete";
import "a11y-autocomplete/styles.css";

const root = document.querySelector("[data-a11y-autocomplete]");

if (root instanceof HTMLElement) {
  createAutocomplete(root, {
    items: ["Athens", "Berlin", "Lisbon", "Madrid", "Paris"]
  });
}
```

The component does not initialize automatically. Call `createAutocomplete()` for one root or `initAutocompleteAll()` for every declared root.

## Native datalist adapter

Use the optional datalist entry point when static suggestions should remain available before JavaScript loads or when JavaScript is unavailable. The input `list` value and the configured selector must resolve to the same authored `<datalist>`.

```html
<div class="a11y-autocomplete" data-a11y-autocomplete>
  <label class="a11y-autocomplete__label" for="city-code">City code</label>
  <div class="a11y-autocomplete__control">
    <input
      id="city-code"
      name="city"
      class="a11y-autocomplete__input"
      list="city-options"
      data-autocomplete-input
    />
    <div class="a11y-autocomplete__popup" hidden data-autocomplete-popup>
      <ul class="a11y-autocomplete__list" data-autocomplete-list></ul>
    </div>
  </div>
  <p class="a11y-autocomplete__status" data-autocomplete-status></p>
</div>

<datalist id="city-options">
  <option value="ATH" label="Athens"></option>
  <option value="BER" label="Berlin"></option>
  <option value="LIS" label="Lisbon"></option>
</datalist>
```

```ts
import { createDatalistAutocomplete } from "a11y-autocomplete/datalist";
import "a11y-autocomplete/styles.css";

const root = document.querySelector("[data-a11y-autocomplete]");

if (root instanceof HTMLElement) {
  const instance = createDatalistAutocomplete(root, {
    datalist: "#city-options",
    minLength: 0,
    openOnFocus: true
  });
}
```

The adapter takes one static snapshot during initialization. It converts every non disabled option with a non empty value, keeps authored order, and preserves duplicate values. Matching uses both the value and label. Selection writes `option.value` into the visible input and normal form submission. A distinct `option.label` appears as supporting text in the custom popup.

After successful initialization, the adapter removes the input `list` attribute so native and custom popups cannot appear together. `destroy()` restores the exact authored attribute and all normal autocomplete state. `init()` takes a fresh snapshot before enhancing the same instance again. Duplicate factory calls return the existing instance and do not refresh it.

Update dynamic options first, then call the adapter instance `refresh()` explicitly:

```ts
const datalist = document.querySelector("#city-options");
if (!(datalist instanceof HTMLDataListElement)) throw new Error("City options are missing.");

const option = document.createElement("option");
option.value = "ROM";
option.label = "Rome";
datalist.append(option);
instance.refresh();
```

The datalist instance does not expose `setItems()` and does not install a `MutationObserver`. Missing selectors, unsupported markup, or a mismatched native association fail before enhancement changes the input. A failed refresh keeps the last valid snapshot.

Native datalist rendering, filtering, zoom behavior, and announcements vary across browsers and assistive technology. Treat the authored control as a useful fallback rather than an identical presentation. Verify both native and enhanced paths in the browser and assistive technology combinations that matter to the integration.

## A11y Form Validator addon

Use the optional form validator addon when `strict: true` selection errors must participate in A11y Form Validator inline errors, error summaries, and invalid submit focus. Basic native rules such as `required` work without the addon.

Install both packages:

```sh
npm install a11y-autocomplete a11y-form-validator
```

```ts
import { createAutocomplete } from "a11y-autocomplete";
import {
  createAutocompleteFormValidatorAddon
} from "a11y-autocomplete/addons/form-validator";
import {
  createDefaultPreset,
  createFormValidator
} from "a11y-form-validator";
import "a11y-autocomplete/styles.css";
import "a11y-form-validator/styles.css";

const autocomplete = createAutocomplete(root, {
  items: cities,
  strict: true,
  validationMode: "external"
});

const preset = createDefaultPreset();
const presetAddons = Array.isArray(preset.addons)
  ? preset.addons
  : preset.addons ? [preset.addons] : [];

const validator = createFormValidator(form, {
  ...preset,
  validateOn: ["submit"],
  rules: {
    city: { autocompleteSelection: true }
  },
  addons: [
    ...presetAddons,
    createAutocompleteFormValidatorAddon({
      fields: [{
        name: "city",
        autocomplete,
        message: "Choose a city from the suggestions."
      }]
    })
  ]
});
```

`validationMode: "external"` keeps autocomplete suggestion behavior and status announcements, but it prevents autocomplete from rendering strict errors, writing validation ARIA, intercepting submit, or moving focus after an invalid submit. The form validator becomes the only owner of those behaviors. Add `required` to the native input when an empty value must also fail.

The example uses submit validation so an inline error cannot change the layout between pointer down and click on the submit button. If an integration also validates on blur, reserve stable space for inserted error content or place form actions where that content cannot move the active pointer target.

The addon's default rule name is `autocompleteSelection`. Each mapped validator field must enable that rule, use the same form and input as its autocomplete instance, and have a unique field name. The addon fails during installation when those ownership requirements are not met or when the rule name collides with an existing validator rule.

`checkValidity()` is a read only predicate. It does not select an item, fill a hidden value, update the DOM, announce, or move focus. `validate()` in external mode also avoids validation UI, but it may commit an exact typed match so its associated hidden value is ready for submission. Destroy the validator before destroying its mapped autocomplete instances so addon listeners and its registered rule are removed first.

The addon adds no storage, analytics, network requests, or dependency to the main autocomplete entry. `a11y-form-validator` is an optional peer dependency used only when this subpath is imported. See the [working form validator integration example](examples/form-validator-integration.html).

## A11y Tag Input addon

Use the optional tag input composer when selecting an autocomplete suggestion should add a removable tag while still allowing custom text values. The composer initializes both plugins, enhances the tag input's generated editable field as the combobox, and keeps the original input or textarea synchronized for form submission.

Install both packages:

```sh
npm install a11y-autocomplete a11y-tag-input
```

```ts
import { createAutocompleteTagInput } from "a11y-autocomplete/addons/tag-input";
import "a11y-autocomplete/styles.css";
import "a11y-tag-input/styles.css";

const source = document.querySelector("[data-a11y-tag-input]");

if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
  const instance = createAutocompleteTagInput(source, {
    tagInput: {
      maxTags: 5
    },
    autocomplete: {
      items: ["Accessibility", "Inclusive design", "Keyboard testing"],
      minLength: 0,
      openOnFocus: true
    }
  });

  console.log(instance.tagInput.getTags());
}
```

The composer owns initialization so it can coordinate keyboard behavior and reverse-order cleanup. Do not initialize `a11y-tag-input` or another autocomplete on the same source/root first. Duplicate composer calls for the same source return the existing composed instance, and `destroy()` removes both generated interfaces before restoring the authored form control.

When an autocomplete option is active, Enter adds only that suggestion; without an active option, Enter adds the typed custom value. Escape closes an open suggestion popup without clearing the draft, and a later Escape uses the tag input's normal clear behavior. Autocomplete announces result availability, while tag input owns add, remove, limit, and validation announcements. The composer therefore forces autocomplete `strict: false`, `validationMode: "external"`, `selectOnBlur: false`, `clearOnEscape: false`, and a silent selected message.

String suggestions become tags directly. Object suggestions use `item.label` by default. Use `toTag` when the submitted tag should use another string:

```ts
createAutocompleteTagInput(source, {
  autocomplete: {
    items: [{ label: "Accessibility", value: "a11y" }]
  },
  toTag: (item) => typeof item === "string" ? item : String(item.value)
});
```

`a11y-tag-input` stores plain string tags, so one tag cannot currently retain a distinct display label and canonical value. The addon adds no storage, analytics, or network behavior. `a11y-tag-input` is an optional peer dependency used only when this subpath is imported. See the [working tag input integration example](examples/tag-input-integration.html).

## CSS

Import `a11y-autocomplete/styles.css` for the baseline layout, visible focus indicator, forced-colors support, and reduced-motion handling. Public custom properties use the `--a11y-autocomplete-*` prefix.

## HTML structure

Start with a labeled native text input. Put optional help text directly after the label and reference it with `aria-describedby`. Nest the popup in the control for the connected input-and-popup presentation; the persistent status remains outside the popup so updates are available while the popup is hidden.

```html
<div class="a11y-autocomplete" data-a11y-autocomplete>
  <label class="a11y-autocomplete__label" for="city">City</label>
  <p class="a11y-autocomplete__hint" id="city-hint">Type a city name.</p>
  <div class="a11y-autocomplete__control">
    <input id="city" class="a11y-autocomplete__input" aria-describedby="city-hint" data-autocomplete-input />
    <button type="button" class="a11y-autocomplete__clear" hidden data-autocomplete-clear>Clear</button>
    <div class="a11y-autocomplete__popup" hidden data-autocomplete-popup>
      <ul class="a11y-autocomplete__list" data-autocomplete-list></ul>
    </div>
  </div>
  <p id="city-status" class="a11y-autocomplete__status" role="status" aria-live="polite" aria-atomic="true" data-autocomplete-status></p>
</div>
```

On initialization, the component prepends an `aria-hidden` visual result summary to the popup, outside the `role="listbox"`. The persistent status announces the same count and is made visually transparent while that popup summary is present. Loading, empty, error, selected, and cleared messages remain visible below the control. Previous popup placement remains behaviorally supported, but the nesting above is required for the fully connected baseline styling.

## API

`createAutocomplete(root, options)` returns an `A11yAutocompleteInstance` and reuses the existing instance when the same root is initialized twice. `initAutocompleteAll(options)` initializes roots matching `[data-a11y-autocomplete]` or `.js-autocomplete`.

Common options include `items`, `source`, `filterItems`, `minLength`, `maxResults`, `debounceDelay`, `strict`, `validationMode`, `openOnFocus`, `selectOnBlur`, `clearOnEscape`, `highlightFirst`, `autoComplete`, `messages`, and `renderOption`.

### Browse on focus and empty queries

`openOnFocus` refreshes suggestions when focus enters the input, but it does not bypass `minLength`. Set both options explicitly to let people browse suggestions before typing:

```ts
createAutocomplete(root, {
  items,
  minLength: 0,
  openOnFocus: true
});
```

With that configuration, local items are filtered with an empty query and capped by `maxResults`. If an async `source` is configured, focusing the field before typing may call it with `query: ""`; its existing debounce, cancellation, stale-response, error, and result-limit behavior still applies. Treat that browse-on-focus request like any other remote request: enforce authorization, privacy, request-rate and volume, cancellation, and result-content policies.

`autoComplete` supports two behaviorally accurate modes:

- `"list"` (default) filters or returns suggestions that correspond to the query.
- `"none"` keeps local suggestions independent of the typed characters. A custom async source used with this mode must provide the same behavior.

The JavaScript `autoComplete` option controls the value of `aria-autocomplete` and the relationship between typed text and custom suggestions. The HTML `autocomplete` attribute controls browser provided form completion. During enhancement, the component adds `autocomplete="off"` only when the input has no authored value, which helps prevent the browser popup from competing with the custom listbox. Authored values such as `address-level2` remain unchanged, and `destroy()` restores the original attribute state. Browsers may still treat `autocomplete="off"` as a hint.

Inline completion is not part of the v1 API. The component accepts text and search inputs; initialization fails before changing the DOM for unsupported input types or incomplete required markup.

`maxResults` applies to flat, grouped, custom-filtered, and async collections. `renderOption` may return text or presentational DOM, but it must not add links, buttons, form fields, editable content, or other tabbable descendants inside an option.

Every selectable item needs a non-empty label after trimming. Items without a usable label are omitted so the listbox never exposes an unnamed option. A group with valid children but no usable group label is flattened into ordinary options, while an empty group is omitted.

Async sources receive an `AbortSignal`. Changing the query invalidates existing options immediately, and pending work is canceled on blur, clear, form reset, disable, and destroy. Late or out-of-order responses cannot reopen the popup or replace current results.

### Locale-aware local filtering

Use `filterItems` when matching should follow a specific locale. This prefix-search recipe creates one collator for the integration and keeps the package API unchanged:

```ts
const cities = ["Ålesund", "Alicante", "Berlin", "Évora"];
const collator = new Intl.Collator(document.documentElement.lang || undefined, {
  usage: "search",
  sensitivity: "base"
});

function startsWithQuery(label: string, query: string): boolean {
  const queryCharacters = Array.from(query);
  const prefix = Array.from(label).slice(0, queryCharacters.length).join("");
  return collator.compare(prefix, query) === 0;
}

createAutocomplete(root, {
  items: cities,
  filterItems: ({ items, query }) => items.filter(
    (item): item is string => typeof item === "string" && startsWithQuery(item, query)
  )
});
```

`filterItems` must return the collection to display; `maxResults` is applied afterward. This example deliberately covers prefix matching for flat string items, not complete Unicode substring-search semantics. Integrations using object items should apply the same label extraction used by `getItemLabel`; grouped collections must filter their child items while preserving the group structure.

### Consumer-owned async retry

`refresh()` reads the input’s current trimmed query and runs the configured local or async result path again. Keep retry policy and controls in the consuming application rather than wrapping the autocomplete in a request manager:

```html
<button id="retry-cities" type="button" hidden>Retry city suggestions</button>
```

```ts
const input = root.querySelector<HTMLInputElement>("[data-autocomplete-input]");
const retryButton = document.querySelector<HTMLButtonElement>("#retry-cities");

if (!input || !retryButton) throw new Error("Autocomplete retry controls are missing.");

const instance = createAutocomplete(root, {
  source: loadCities
});

root.addEventListener("a11y-autocomplete:error", () => {
  retryButton.hidden = false;
});

root.addEventListener("a11y-autocomplete:results", () => {
  retryButton.hidden = true;
});

retryButton.addEventListener("click", () => {
  input.focus({ preventScroll: true });
  instance.refresh();
});
```

This recipe leaves `openOnFocus` at its default `false`, so focusing the input and calling `refresh()` produces one retry. The same current query may be transmitted again. Authorization, attempt limits, backoff, offline handling, and service-level retry policy remain the consumer’s responsibility; `refresh()` does not accept a query argument or return the request promise.

With `strict: true`, a value is valid when it exactly matches a static item, the latest successful async result set, or the still-current selected item. Empty values remain valid unless the author applies a separate required-field constraint.

Instances expose `destroy()`, `open()`, `close()`, `clear()`, `getValue()`, `setValue()`, `getSelectedItem()`, `setItems()`, `refresh()`, `checkValidity()`, `validate()`, `enable()`, and `disable()`.

`destroy()` is idempotent. Calling `init()` on the same instance initializes it again without duplicate listeners. Other mutating methods throw a clear error while the instance is destroyed.

### Lifecycle events and telemetry privacy

Lifecycle and interaction events bubble from the root. The full event names are `a11y-autocomplete:init`, `a11y-autocomplete:open`, `a11y-autocomplete:close`, `a11y-autocomplete:input`, `a11y-autocomplete:results`, `a11y-autocomplete:select`, `a11y-autocomplete:clear`, `a11y-autocomplete:error`, and `a11y-autocomplete:destroy`.

Every event detail includes `instance`, `query`, `item`, `value`, `results`, and `source`; the error event also includes `error`. Queries and values may contain user-entered information, item and result objects may contain application data, and errors may include service details. Do not serialize, spread, or forward the complete `event.detail` object to logs or telemetry. Allowlist only the fields needed for a specific measurement, such as the event name or interaction `source`, and apply the consuming application’s consent, minimization, and retention rules. The package does not add analytics or telemetry.

## Integration diagnostics

The optional diagnostics entry point scans one autocomplete root for common integration mistakes and returns structured issues. Run it only during development, behind the development guard provided by your application or bundler. This example uses Vite's development flag; use your environment's equivalent:

```ts
import { diagnoseAutocomplete } from "a11y-autocomplete/diagnostics";

if (import.meta.env.DEV) {
  const issues = diagnoseAutocomplete(root, {
    log: true,
    inspectRenderedOptions: true
  });
}
```

Diagnostics never run automatically. A scan does not change markup, focus, live-region text, or component state, and it does not install observers, timers, polling, or event handlers. `log` defaults to `false`; when enabled, one warning contains all returned issues. `inspectRenderedOptions` defaults to `false` so large result sets are scanned only when requested.

Custom-selector integrations must pass the same relevant selectors used for initialization:

```ts
diagnoseAutocomplete(root, {
  inputSelector: ".city-input",
  listSelector: ".city-results",
  popupSelector: ".city-popup",
  statusSelector: ".city-status",
  clearSelector: ".city-clear"
});
```

Issue codes are stable API identifiers; messages are explanatory and may be refined.

| Issue code | Meaning |
|---|---|
| `input-accessible-name-missing` | The text/search input has no non-empty associated label, `aria-label`, or valid `aria-labelledby` text. Placeholder and title alone do not satisfy this check. |
| `input-type-unsupported` | The configured input target is missing, is not an input, or does not use `type="text"` or `type="search"`. |
| `duplicate-id` | An ID owned or referenced by the root is used by more than one element. |
| `id-reference-broken` | An HTML or ARIA ID reference from the root does not resolve in its document. |
| `clear-control-not-button` | The configured clear control is not a native button. |
| `clear-control-type-invalid` | The clear button does not use `type="button"`. |
| `clear-control-name-missing` | The clear button lacks visible text, `aria-label`, or valid `aria-labelledby` text. |
| `status-region-misplaced` | A configured status or live region is inside the popup, listbox, group, or option. |
| `option-descendant-focusable` | An inspected rendered option contains a focusable descendant. |
| `initialized-root-conflict` | Initialized autocomplete roots are nested and have overlapping ownership boundaries. |

Diagnostics inspect only the current light DOM. They do not observe later changes, enter closed shadow roots or iframes, compute the browser accessibility tree or CSS visibility, predict assistive-technology output, validate custom-theme contrast, or prove WCAG conformance. An empty issue array is not a substitute for the manual accessibility checks below.

## Accessibility notes

- The input receives the combobox role and synchronized `aria-expanded`, `aria-controls`, and `aria-activedescendant` states. Standalone validation also synchronizes `aria-invalid`; external validation leaves that state to the validator.
- With `openOnFocus: true` and `minLength: 0`, focusing an empty input opens available suggestions without moving DOM focus and reports the result count through the existing status element. If `source` is async, that focus may send `query: ""` before the person types.
- Arrow keys move the active suggestion and stop at the first or last option without wrapping. Enter selects it, Escape closes the popup, and Tab follows normal focus order. With `clearOnEscape`, a second Escape while already closed clears the field.
- DOM focus remains on the text input while `aria-activedescendant` identifies the active option.
- The component adds missing `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` defaults to the declared status element, then restores its author-provided state on destroy.
- Loading, results, errors, selection, and clearing are exposed through the status element; canceled async work clears stale loading state.
- Selection on blur may commit the active option, but it does not return focus to the input.
- Disabled styling follows the native input state.
- `destroy()` removes listeners and restores author-provided DOM and ARIA state.
- The default active option has both a background and a high-contrast inset indicator; the baseline stylesheet also covers forced colors, 44px controls, long labels, and reduced motion.

The plugin does not replace accessible labeling, validate color contrast for a consuming brand theme, or provide a remote data service. Async sources remain responsible for request authorization, privacy, appropriate result content, and query-independent results when using `autoComplete: "none"`.

Automated checks do not establish complete WCAG conformance. Before shipping an integration, manually verify the field with keyboard-only navigation, relevant screen readers, zoom/reflow, forced colors, reduced motion, touch input, localized content, and the consuming theme.

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for the expected screen-reader information matrix, current evidence, manual release matrix, and known limitations.

## Docs metadata

```ts
import { docs } from "a11y-autocomplete/docs";
```

The named metadata export is suitable for centralized Astro or Starlight documentation aggregation without adding a framework runtime dependency.

## Examples

- [Async destination search](examples/async-data/) waits for a typed query before fetching a local JSON response and demonstrates loading, cancellation, no results, deterministic failure, and retry.
- [Interaction-state playground](examples/states.html) exposes local, grouped, async, empty, strict, reset, disabled, and lifecycle states.
- [Native datalist adapter](examples/datalist.html) preserves authored suggestions as a no-JavaScript fallback.
- [A11y Form Validator integration](examples/form-validator-integration.html) gives strict-selection errors a single validation owner.
- [Match highlighting](examples/match-highlighting.html) and the [theme gallery](examples/themes.html) cover rendering and styling boundaries.
