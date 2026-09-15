import { A11yAutocompleteInstance, A11yAutocompleteOptions, AutocompleteItem } from "../index.js";
import { TagInputInstance, TagInputOptions } from "a11y-tag-input";
//#region src/addons/tag-input.d.ts
type AutocompleteTagInputSource = HTMLInputElement | HTMLTextAreaElement;
interface AutocompleteTagInputMapContext {
  autocomplete: A11yAutocompleteInstance;
  tagInput: TagInputInstance;
}
interface AutocompleteTagInputOptions {
  autocomplete?: A11yAutocompleteOptions;
  tagInput?: TagInputOptions;
  toTag?: (item: AutocompleteItem, context: AutocompleteTagInputMapContext) => string;
}
interface AutocompleteTagInputInstance {
  readonly source: AutocompleteTagInputSource;
  readonly root: HTMLElement;
  readonly autocomplete: A11yAutocompleteInstance;
  readonly tagInput: TagInputInstance;
  destroy(): void;
}
declare function createAutocompleteTagInput(source: AutocompleteTagInputSource, options?: AutocompleteTagInputOptions): AutocompleteTagInputInstance;
//#endregion
export { AutocompleteTagInputInstance, AutocompleteTagInputMapContext, AutocompleteTagInputOptions, AutocompleteTagInputSource, createAutocompleteTagInput, createAutocompleteTagInput as default };
//# sourceMappingURL=tag-input.d.ts.map