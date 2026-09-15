import {
  A11yAutocomplete,
  DEFAULT_OPTIONS,
  type A11yAutocompleteInstance,
  type A11yAutocompleteOptions,
  type AutocompleteFilterContext,
  type AutocompleteRenderContext,
  type InteractionSource
} from "./index.js";

export interface DatalistAutocompleteItem {
  [key: string]: unknown;
  value: string;
  label: string;
}

export interface DatalistAutocompleteFilterContext {
  items: DatalistAutocompleteItem[];
  query: string;
  instance: DatalistAutocompleteInstance;
}

export type DatalistAutocompleteOptions = Omit<
  A11yAutocompleteOptions,
  "items" | "source" | "getItemLabel" | "getItemValue" | "filterItems" | "renderOption"
> & {
  datalist: string;
  filterItems?: ((context: DatalistAutocompleteFilterContext) => DatalistAutocompleteItem[]) | null;
  renderOption?: ((item: DatalistAutocompleteItem, context: AutocompleteRenderContext) => Node | string | null) | null;
};

export interface DatalistAutocompleteInstance extends Omit<
  A11yAutocompleteInstance,
  "init" | "getSelectedItem" | "setItems" | "refresh"
> {
  init(): DatalistAutocompleteInstance;
  getSelectedItem(): DatalistAutocompleteItem | null;
  refresh(options?: { source?: InteractionSource }): void;
}

interface PreparedDatalist {
  input: HTMLInputElement;
  datalist: HTMLDataListElement;
  listValue: string;
  items: DatalistAutocompleteItem[];
}

function normalizedText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function textMatchScore(value: string, query: string): number {
  const candidate = normalizedText(value);
  const normalizedQuery = normalizedText(query);
  if (!normalizedQuery || candidate === normalizedQuery) return 0;
  if (candidate.startsWith(normalizedQuery)) return 1;
  if (candidate.includes(normalizedQuery)) return 2;
  return Number.POSITIVE_INFINITY;
}

function defaultFilter({ items, query }: DatalistAutocompleteFilterContext): DatalistAutocompleteItem[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: Math.min(textMatchScore(item.value, query), textMatchScore(item.label, query))
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ item }) => item);
}

function defaultRenderOption(item: DatalistAutocompleteItem): Node | string {
  if (!item.label || item.label === item.value) return item.value;
  const fragment = document.createDocumentFragment();
  const value = document.createElement("span");
  value.className = "a11y-autocomplete__option-title";
  value.textContent = `${item.value} `;
  const label = document.createElement("span");
  label.className = "a11y-autocomplete__option-meta";
  label.textContent = item.label;
  fragment.append(value, label);
  return fragment;
}

function inputSelector(options: DatalistAutocompleteOptions): string {
  const selector = String(options.inputSelector ?? "").trim();
  return selector || DEFAULT_OPTIONS.inputSelector;
}

function queryInput(root: HTMLElement, options: DatalistAutocompleteOptions): HTMLInputElement {
  let input: Element | null;
  try {
    input = root.querySelector(inputSelector(options));
  } catch (error) {
    throw new Error("Datalist autocomplete received an invalid input selector.", { cause: error });
  }
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Datalist autocomplete markup is missing its configured input element.");
  }
  return input;
}

function queryDatalist(root: HTMLElement, selector: string): HTMLDataListElement {
  if (!selector.trim()) throw new Error("Datalist autocomplete requires a non-empty datalist selector.");
  let datalist: Element | null;
  try {
    datalist = root.ownerDocument.querySelector(selector);
  } catch (error) {
    throw new Error("Datalist autocomplete received an invalid datalist selector.", { cause: error });
  }
  if (!(datalist instanceof HTMLDataListElement)) {
    throw new Error("Datalist autocomplete could not resolve the configured HTMLDataListElement.");
  }
  return datalist;
}

function snapshotItems(datalist: HTMLDataListElement): DatalistAutocompleteItem[] {
  return Array.from(datalist.options)
    .filter((option) => !option.disabled && option.value !== "")
    .map((option) => ({
      value: option.value,
      label: option.getAttribute("label") ?? option.textContent ?? ""
    }));
}

function prepareDatalist(
  root: HTMLElement,
  options: DatalistAutocompleteOptions,
  current?: PreparedDatalist
): PreparedDatalist {
  const input = queryInput(root, options);
  if (current && input !== current.input) {
    throw new Error("Datalist autocomplete cannot refresh after its configured input element is replaced.");
  }

  const datalist = queryDatalist(root, options.datalist);
  const listValue = current?.listValue ?? input.getAttribute("list");
  if (!listValue) {
    throw new Error("Datalist autocomplete requires the input to have a list attribute.");
  }

  const initialAssociationMatches = !current && input.list === datalist;
  const refreshedAssociationMatches = Boolean(current)
    && datalist.id === listValue
    && root.ownerDocument.getElementById(listValue) === datalist
    && (!input.hasAttribute("list") || input.getAttribute("list") === listValue);
  if (!initialAssociationMatches && !refreshedAssociationMatches) {
    throw new Error("Datalist autocomplete requires the input list attribute to reference the configured datalist.");
  }

  return { input, datalist, listValue, items: snapshotItems(datalist) };
}

function coreOptions(
  options: DatalistAutocompleteOptions,
  items: DatalistAutocompleteItem[]
): A11yAutocompleteOptions {
  const {
    datalist: _datalist,
    filterItems,
    renderOption,
    ...baseOptions
  } = options;
  const resolvedFilter = filterItems ?? defaultFilter;
  const resolvedRenderer = renderOption ?? defaultRenderOption;

  return {
    ...baseOptions,
    items,
    source: null,
    getItemLabel: (item) => (item as DatalistAutocompleteItem).value,
    getItemValue: (item) => (item as DatalistAutocompleteItem).value,
    filterItems: (context: AutocompleteFilterContext) => resolvedFilter({
      items: context.items as DatalistAutocompleteItem[],
      query: context.query,
      instance: context.instance as DatalistAutocompleteInstance
    }),
    renderOption: (item, context) => resolvedRenderer(item as DatalistAutocompleteItem, context)
  };
}

class DatalistAutocomplete extends A11yAutocomplete {
  private static readonly datalistInstances = new WeakMap<HTMLElement, DatalistAutocomplete>();

  private readonly datalistOptions: DatalistAutocompleteOptions;
  private prepared: PreparedDatalist;
  private pendingPreparation: PreparedDatalist | null;

  static create(root: HTMLElement, options: DatalistAutocompleteOptions): DatalistAutocomplete {
    const existing = DatalistAutocomplete.datalistInstances.get(root);
    if (existing) return existing;
    if (DatalistAutocomplete.getRegisteredInstance(root)) {
      throw new Error("Datalist autocomplete cannot initialize a root that already has a core autocomplete instance.");
    }
    return new DatalistAutocomplete(root, options);
  }

  constructor(root: HTMLElement, options: DatalistAutocompleteOptions) {
    const prepared = prepareDatalist(root, options);
    super(root, coreOptions(options, prepared.items), false);
    this.datalistOptions = { ...options };
    this.prepared = prepared;
    this.pendingPreparation = prepared;
    this.init();
  }

  override init(): this {
    if (this.initialized) return this;
    const prepared = this.pendingPreparation ?? prepareDatalist(this.root, this.datalistOptions);
    this.pendingPreparation = null;
    this.prepared = prepared;
    this.replaceItemsSnapshot(this.prepared.items);
    super.init();
    return this;
  }

  protected override afterInitialize(): void {
    this.prepared.input.removeAttribute("list");
    DatalistAutocomplete.datalistInstances.set(this.root, this);
  }

  override destroy(): void {
    if (!this.initialized) return;
    DatalistAutocomplete.datalistInstances.delete(this.root);
    super.destroy();
  }

  override refresh({ source = "programmatic" }: { source?: InteractionSource } = {}): void {
    this.ensureInitialized();
    const prepared = prepareDatalist(this.root, this.datalistOptions, this.prepared);
    this.replaceItemsSnapshot(prepared.items);
    this.prepared = prepared;
    this.prepared.input.removeAttribute("list");
    this.refreshResults({ source });
  }

  override setItems(): void {
    throw new Error("Datalist autocomplete items are authored in the datalist. Update its options and call refresh().");
  }

  override getSelectedItem(): DatalistAutocompleteItem | null {
    return super.getSelectedItem() as DatalistAutocompleteItem | null;
  }
}

export function createDatalistAutocomplete(
  root: HTMLElement,
  options: DatalistAutocompleteOptions
): DatalistAutocompleteInstance {
  return DatalistAutocomplete.create(root, options);
}
