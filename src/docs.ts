export interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: { npm: string; pnpm: string; yarn: string };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{ key: string; description: string }>;
  api: Array<{ name: string; type: string; description: string }>;
  examples?: Array<{ name: string; description: string; path: string }>;
}

export const docs = {
  slug: "a11y-autocomplete",
  name: "A11y Autocomplete",
  packageName: "a11y-autocomplete",
  description: "A dependency-free, progressively enhanced autocomplete with accessible keyboard navigation and live announcements.",
  repo: "https://github.com/vmitsaras/A11y-Autocomplete",
  npm: "https://www.npmjs.com/package/a11y-autocomplete",
  install: {
    npm: "npm install a11y-autocomplete",
    pnpm: "pnpm add a11y-autocomplete",
    yarn: "yarn add a11y-autocomplete"
  },
  usage: `import { createAutocomplete } from "a11y-autocomplete";
import "a11y-autocomplete/styles.css";

const root = document.querySelector("[data-a11y-autocomplete]");
if (root instanceof HTMLElement) {
  createAutocomplete(root, { items: ["Athens", "Berlin", "Lisbon"] });
}`,
  selectors: [
    "[data-a11y-autocomplete]",
    "[data-autocomplete-input]",
    "[data-autocomplete-popup]",
    "[data-autocomplete-results-summary]",
    "[data-autocomplete-list]",
    "[data-autocomplete-status]",
    "[data-autocomplete-clear]"
  ],
  keyboard: [
    { key: "ArrowDown / ArrowUp", description: "Opens the suggestions, moves the active option, and stops at the first or last option without wrapping." },
    { key: "Enter", description: "Selects the active suggestion." },
    { key: "Escape", description: "Closes the suggestions without changing the value; an optional second press clears a closed field." },
    { key: "Tab", description: "Closes or commits a configured blur selection and continues normal focus navigation without returning focus." }
  ],
  api: [
    {
      name: "createAutocomplete(root, options)",
      type: "(root: HTMLElement, options?: A11yAutocompleteOptions) => A11yAutocompleteInstance",
      description: "Initializes one autocomplete and returns an existing instance on duplicate initialization."
    },
    {
      name: "initAutocompleteAll(options)",
      type: "(options?: A11yAutocompleteOptions) => A11yAutocompleteInstance[]",
      description: "Initializes every declared autocomplete root in the current document."
    },
    {
      name: "createDatalistAutocomplete(root, options)",
      type: "(root: HTMLElement, options: DatalistAutocompleteOptions) => DatalistAutocompleteInstance",
      description: "Enhances a matching native input and datalist through the optional a11y-autocomplete/datalist entry point. Its refresh method explicitly rereads authored options, and destroy restores the native list association."
    },
    {
      name: "createAutocompleteFormValidatorAddon(options)",
      type: "(options: AutocompleteFormValidatorAddonOptions) => AutocompleteFormValidatorAddon",
      description: "Registers strict selection as an opt in A11y Form Validator rule through a11y-autocomplete/addons/form-validator while the validator owns errors, summaries, validation ARIA, and invalid submit focus."
    },
    {
      name: "createAutocompleteTagInput(source, options)",
      type: "(source: HTMLInputElement | HTMLTextAreaElement, options?: AutocompleteTagInputOptions) => AutocompleteTagInputInstance",
      description: "Composes A11y Tag Input and autocomplete through the optional a11y-autocomplete/addons/tag-input entry point. Active suggestions become tags, custom Enter values remain supported, announcement ownership is separated, and destroy restores the authored source."
    },
    {
      name: "autoComplete",
      type: "\"none\" | \"list\"",
      description: "Selects query-independent suggestions or list suggestions through aria-autocomplete. This is distinct from the HTML autocomplete attribute, which keeps authored values and otherwise defaults to off while enhanced. Inline completion is not part of the v1 API."
    },
    {
      name: "openOnFocus",
      type: "boolean",
      description: "Refreshes suggestions when the input receives focus. With minLength set to 0, focus before typing may call an async source with an empty query; consumers remain responsible for authorization, privacy, request volume, cancellation, and result content."
    },
    {
      name: "source(context)",
      type: "({ query, signal, instance }) => Promise<AutocompleteCollectionItem[]>",
      description: "Loads suggestions with cancellation and stale-response protection. Result counts are capped by maxResults."
    },
    {
      name: "filterItems(context)",
      type: "({ items, query, instance }) => AutocompleteCollectionItem[]",
      description: "Overrides local list filtering, including consumer-owned Intl.Collator matching. The returned collection is capped by maxResults."
    },
    {
      name: "refresh(options)",
      type: "(options?: { source?: InteractionSource }) => void",
      description: "Rereads the current trimmed input query and runs the configured result path again. Consumers own retry controls, attempt limits, backoff, and offline policy."
    },
    {
      name: "validationMode",
      type: "\"standalone\" | \"external\"",
      description: "Keeps strict validation self contained by default or delegates its error presentation and automatic triggers to an external validator."
    },
    {
      name: "checkValidity()",
      type: "() => boolean",
      description: "Returns strict selection validity without changing DOM, selection, hidden values, focus, events, or announcements."
    },
    {
      name: "a11y-autocomplete:* events",
      type: "CustomEvent",
      description: "Bubbling events include instance, query, item, value, results, and source details; error events also include error. Allowlist telemetry fields instead of forwarding the complete detail object."
    },
    {
      name: "destroy()",
      type: "() => void",
      description: "Idempotently removes listeners and restores the author-provided DOM and ARIA state; init() can initialize the same instance again."
    },
    {
      name: "diagnoseAutocomplete(root, options)",
      type: "(root: HTMLElement, options?: AutocompleteDiagnosticOptions) => AutocompleteDiagnosticIssue[]",
      description: "Development-only, read-only integration checks exported from a11y-autocomplete/diagnostics. Results identify common mistakes but do not prove WCAG conformance."
    }
  ],
  examples: [
    {
      name: "Async destination search",
      description: "Waits for a typed query before fetching JSON, then demonstrates cancellation, loading, no results, deterministic failure, and retry.",
      path: "examples/async-data"
    },
    {
      name: "Native datalist adapter",
      description: "Keeps authored suggestions available without JavaScript, then enhances the same values with the custom combobox contract.",
      path: "examples/datalist.html"
    },
    {
      name: "A11y Form Validator integration",
      description: "Delegates strict selection errors, the error summary, and invalid submit focus to one form validation owner.",
      path: "examples/form-validator-integration.html"
    },
    {
      name: "A11y Tag Input integration",
      description: "Turns selected suggestions into removable tags while preserving custom text, native submission, Escape ordering, and reverse lifecycle cleanup.",
      path: "examples/tag-input-integration.html"
    }
  ]
} satisfies PluginDocs;
