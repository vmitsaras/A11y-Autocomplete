import type {
  A11yFormValidator,
  ValidationContext,
  ValidatorAddon,
  ValidatorRule
} from "a11y-form-validator";
import type { A11yAutocompleteInstance } from "../index.js";

const DEFAULT_RULE_NAME = "autocompleteSelection";
const DEFAULT_MESSAGE = "Select a value from the suggestions list.";
const DEFAULT_UNAVAILABLE_MESSAGE = "Suggestions are unavailable. Reload the page and try again.";

export interface AutocompleteFormValidatorField {
  name: string;
  autocomplete: A11yAutocompleteInstance;
  message?: string;
  unavailableMessage?: string;
}

export interface AutocompleteFormValidatorAddonOptions {
  fields: AutocompleteFormValidatorField[];
  ruleName?: string;
}

export interface AutocompleteFormValidatorAddon extends ValidatorAddon {
  readonly ruleName: string;
  install(validator: A11yFormValidator): void;
  destroy(): void;
}

interface NormalizedField {
  name: string;
  autocomplete: A11yAutocompleteInstance;
  message: string;
  unavailableMessage: string;
}

function requiredString(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeFields(fields: AutocompleteFormValidatorField[]): NormalizedField[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new TypeError("The A11y Autocomplete form validator addon requires at least one field mapping.");
  }

  const names = new Set<string>();
  const instances = new Set<A11yAutocompleteInstance>();
  return fields.map((field) => {
    const name = requiredString(field?.name, "");
    if (!name) throw new TypeError("Each A11y Autocomplete form validator field requires a name.");
    if (!field?.autocomplete) throw new TypeError(`The ${name} field requires an autocomplete instance.`);
    if (names.has(name)) throw new Error(`The form validator addon has more than one mapping for ${name}.`);
    if (instances.has(field.autocomplete)) {
      throw new Error("One autocomplete instance cannot be mapped to more than one validator field.");
    }
    names.add(name);
    instances.add(field.autocomplete);
    return {
      name,
      autocomplete: field.autocomplete,
      message: requiredString(field.message, DEFAULT_MESSAGE),
      unavailableMessage: requiredString(field.unavailableMessage, DEFAULT_UNAVAILABLE_MESSAGE)
    };
  });
}

class FormValidatorAddon implements AutocompleteFormValidatorAddon {
  readonly ruleName: string;
  private readonly fields: NormalizedField[];
  private readonly fieldMap: Map<string, NormalizedField>;
  private validator: A11yFormValidator | null = null;
  private readonly listeners: Array<{ root: HTMLElement; name: string; listener: EventListener }> = [];
  private readonly runningRules = new Set<string>();

  constructor(options: AutocompleteFormValidatorAddonOptions) {
    this.ruleName = requiredString(options?.ruleName, DEFAULT_RULE_NAME);
    this.fields = normalizeFields(options?.fields);
    this.fieldMap = new Map(this.fields.map((field) => [field.name, field]));
  }

  install(validator: A11yFormValidator): void {
    if (this.validator === validator) return;
    if (this.validator) throw new Error("The form validator addon is already installed on another validator.");
    if (validator.ruleRegistry.has(this.ruleName)) {
      throw new Error(`A11y Form Validator already has a ${this.ruleName} rule.`);
    }

    for (const mapping of this.fields) {
      const field = validator.fieldMap.get(mapping.name);
      if (!field) throw new Error(`A11y Form Validator does not contain a ${mapping.name} field.`);
      if (mapping.autocomplete.validationMode !== "external") {
        throw new Error(`The ${mapping.name} autocomplete must use validationMode: "external".`);
      }
      if (!validator.form.contains(mapping.autocomplete.root) || !mapping.autocomplete.root.contains(field.primaryElement)) {
        throw new Error(`The ${mapping.name} autocomplete and validator field must belong to the same form.`);
      }
      if (!(this.ruleName in field.getRules())) {
        throw new Error(`The ${mapping.name} validator rules must enable ${this.ruleName}.`);
      }
    }

    const rule: ValidatorRule = (context) => this.validateMapping(context);
    validator.registerRule(this.ruleName, rule);
    this.validator = validator;

    for (const mapping of this.fields) {
      const inputListener: EventListener = () => queueMicrotask(() => this.updateSummary());
      mapping.autocomplete.root.addEventListener("a11y-autocomplete:input", inputListener);
      this.listeners.push({ root: mapping.autocomplete.root, name: "a11y-autocomplete:input", listener: inputListener });
      for (const eventName of ["a11y-autocomplete:select", "a11y-autocomplete:clear"]) {
        const listener: EventListener = () => this.revalidateCorrectedField(mapping.name);
        mapping.autocomplete.root.addEventListener(eventName, listener);
        this.listeners.push({ root: mapping.autocomplete.root, name: eventName, listener });
      }
    }
  }

  destroy(): void {
    for (const { root, name, listener } of this.listeners) root.removeEventListener(name, listener);
    this.listeners.length = 0;
    if (this.validator) this.validator.unregisterRule(this.ruleName);
    this.validator = null;
    this.runningRules.clear();
  }

  private validateMapping(context: ValidationContext): boolean | string {
    const mapping = this.fieldMap.get(context.field.name);
    if (!mapping) return true;
    if (mapping.autocomplete.root.dataset.a11yAutocompleteInitialized !== "true") {
      return mapping.unavailableMessage;
    }

    this.runningRules.add(mapping.name);
    try {
      return mapping.autocomplete.validate({ announce: false }) || mapping.message;
    } finally {
      this.runningRules.delete(mapping.name);
    }
  }

  private revalidateCorrectedField(name: string): void {
    const validator = this.validator;
    if (!validator || this.runningRules.has(name)) return;
    if (!validator.hasSubmitted && !validator.getErrors().fields[name]) return;
    void validator.validateField(name, { reason: "change" }).then(() => {
      this.updateSummary();
    });
  }

  private updateSummary(): void {
    const summary = this.validator?.summaryAddon as
      | (NonNullable<A11yFormValidator["summaryAddon"]> & { update?: () => void })
      | null
      | undefined;
    summary?.update?.();
  }
}

export function createAutocompleteFormValidatorAddon(
  options: AutocompleteFormValidatorAddonOptions
): AutocompleteFormValidatorAddon {
  return new FormValidatorAddon(options);
}

export default createAutocompleteFormValidatorAddon;
