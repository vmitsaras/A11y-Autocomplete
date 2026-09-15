import { A11yAutocompleteInstance } from "../index.js";
import { A11yFormValidator, ValidatorAddon } from "a11y-form-validator";
//#region src/addons/form-validator.d.ts
interface AutocompleteFormValidatorField {
  name: string;
  autocomplete: A11yAutocompleteInstance;
  message?: string;
  unavailableMessage?: string;
}
interface AutocompleteFormValidatorAddonOptions {
  fields: AutocompleteFormValidatorField[];
  ruleName?: string;
}
interface AutocompleteFormValidatorAddon extends ValidatorAddon {
  readonly ruleName: string;
  install(validator: A11yFormValidator): void;
  destroy(): void;
}
declare function createAutocompleteFormValidatorAddon(options: AutocompleteFormValidatorAddonOptions): AutocompleteFormValidatorAddon;
//#endregion
export { AutocompleteFormValidatorAddon, AutocompleteFormValidatorAddonOptions, AutocompleteFormValidatorField, createAutocompleteFormValidatorAddon, createAutocompleteFormValidatorAddon as default };
//# sourceMappingURL=form-validator.d.ts.map