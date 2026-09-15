import { A11yAutocompleteInstance, A11yAutocompleteOptions, AutocompleteRenderContext, InteractionSource } from "./index.js";
//#region src/datalist.d.ts
interface DatalistAutocompleteItem {
  [key: string]: unknown;
  value: string;
  label: string;
}
interface DatalistAutocompleteFilterContext {
  items: DatalistAutocompleteItem[];
  query: string;
  instance: DatalistAutocompleteInstance;
}
type DatalistAutocompleteOptions = Omit<A11yAutocompleteOptions, "items" | "source" | "getItemLabel" | "getItemValue" | "filterItems" | "renderOption"> & {
  datalist: string;
  filterItems?: ((context: DatalistAutocompleteFilterContext) => DatalistAutocompleteItem[]) | null;
  renderOption?: ((item: DatalistAutocompleteItem, context: AutocompleteRenderContext) => Node | string | null) | null;
};
interface DatalistAutocompleteInstance extends Omit<A11yAutocompleteInstance, "init" | "getSelectedItem" | "setItems" | "refresh"> {
  init(): DatalistAutocompleteInstance;
  getSelectedItem(): DatalistAutocompleteItem | null;
  refresh(options?: {
    source?: InteractionSource;
  }): void;
}
declare function createDatalistAutocomplete(root: HTMLElement, options: DatalistAutocompleteOptions): DatalistAutocompleteInstance;
//#endregion
export { DatalistAutocompleteFilterContext, DatalistAutocompleteInstance, DatalistAutocompleteItem, DatalistAutocompleteOptions, createDatalistAutocomplete };
//# sourceMappingURL=datalist.d.ts.map