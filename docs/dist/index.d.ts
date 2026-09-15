//#region src/index.d.ts
type AutocompleteItem = string | {
  label: string;
  value?: string;
  [key: string]: unknown;
};
interface AutocompleteGroup {
  label: string;
  items: AutocompleteItem[];
}
type AutocompleteCollectionItem = AutocompleteItem | AutocompleteGroup;
type InteractionSource = "input" | "keyboard" | "pointer" | "focus" | "blur" | "programmatic";
type AutocompleteValidationMode = "standalone" | "external";
interface AutocompleteMessages {
  results?: string | ((count: number) => string);
  noResults?: string | ((query: string) => string);
  loading?: string;
  error?: string;
  selected?: string | ((label: string) => string);
  cleared?: string;
  invalid?: string | ((label: string) => string);
}
interface AutocompleteSourceContext {
  query: string;
  signal: AbortSignal;
  instance: A11yAutocompleteInstance;
}
interface AutocompleteFilterContext {
  items: AutocompleteCollectionItem[];
  query: string;
  instance: A11yAutocompleteInstance;
}
interface AutocompleteRenderContext {
  query: string;
  label: string;
  value: string;
  optionIndex: number;
}
interface A11yAutocompleteOptions {
  inputSelector?: string;
  listSelector?: string;
  popupSelector?: string;
  statusSelector?: string;
  clearSelector?: string;
  hiddenValueSelector?: string;
  clearLabel?: string;
  items?: AutocompleteCollectionItem[];
  source?: ((context: AutocompleteSourceContext) => Promise<AutocompleteCollectionItem[]>) | null;
  minLength?: number | string;
  maxResults?: number | string;
  debounceDelay?: number | string;
  strict?: boolean | string;
  validationMode?: AutocompleteValidationMode;
  openOnFocus?: boolean | string;
  selectOnBlur?: boolean | string;
  clearOnEscape?: boolean | string;
  highlightFirst?: boolean | string;
  autoComplete?: "none" | "list";
  getItemLabel?: (item: AutocompleteItem) => string;
  getItemValue?: (item: AutocompleteItem) => string;
  filterItems?: ((context: AutocompleteFilterContext) => AutocompleteCollectionItem[]) | null;
  renderOption?: ((item: AutocompleteItem, context: AutocompleteRenderContext) => Node | string | null) | null;
  messages?: AutocompleteMessages;
}
interface A11yAutocompleteInstance {
  readonly root: HTMLElement;
  readonly validationMode: AutocompleteValidationMode;
  init(): A11yAutocompleteInstance;
  destroy(): void;
  open(): void;
  close(options?: {
    silent?: boolean;
  }): void;
  clear(options?: {
    announce?: boolean;
    source?: InteractionSource;
  }): void;
  setValue(value: string, options?: {
    silent?: boolean;
  }): void;
  getValue(): string;
  getSelectedItem(): AutocompleteItem | null;
  setItems(items: AutocompleteCollectionItem[]): void;
  refresh(options?: {
    source?: InteractionSource;
  }): void;
  checkValidity(): boolean;
  validate(options?: {
    announce?: boolean;
  }): boolean;
  enable(): void;
  disable(): void;
}
declare const DEFAULT_OPTIONS: Readonly<{
  inputSelector: "[data-autocomplete-input]";
  listSelector: "[data-autocomplete-list]";
  popupSelector: "[data-autocomplete-popup]";
  statusSelector: "[data-autocomplete-status]";
  clearSelector: "[data-autocomplete-clear]";
  hiddenValueSelector: "[data-autocomplete-hidden-value]";
  clearLabel: "Clear autocomplete input";
  minLength: 1;
  maxResults: 8;
  debounceDelay: 200;
  strict: false;
  validationMode: "standalone";
  openOnFocus: false;
  selectOnBlur: false;
  clearOnEscape: false;
  highlightFirst: false;
  autoComplete: "list";
}>;
declare const SELECTORS: Readonly<{
  root: "[data-a11y-autocomplete], .js-autocomplete";
  option: "[data-autocomplete-option]";
  error: "[data-autocomplete-error]";
}>;
declare const CLASSES: Readonly<{
  initialized: "is-initialized";
  open: "is-open";
  loading: "is-loading";
  results: "has-results";
  noResults: "has-no-results";
  value: "has-value";
  invalid: "is-invalid";
  error: "has-error";
  disabled: "is-disabled";
}>;
declare const ATTRIBUTES: Readonly<{
  initialized: "data-a11y-autocomplete-initialized";
  expanded: "aria-expanded";
  activeDescendant: "aria-activedescendant";
  busy: "aria-busy";
  selected: "aria-selected";
}>;
declare const EVENTS: Readonly<{
  init: "a11y-autocomplete:init";
  open: "a11y-autocomplete:open";
  close: "a11y-autocomplete:close";
  input: "a11y-autocomplete:input";
  results: "a11y-autocomplete:results";
  select: "a11y-autocomplete:select";
  clear: "a11y-autocomplete:clear";
  error: "a11y-autocomplete:error";
  destroy: "a11y-autocomplete:destroy";
}>;
declare class A11yAutocomplete implements A11yAutocompleteInstance {
  private static readonly instances;
  readonly root: HTMLElement;
  readonly validationMode: AutocompleteValidationMode;
  private readonly options;
  private input;
  private list;
  private popup;
  private resultsSummary;
  private statusElement;
  private clearButton;
  private hiddenValueInput;
  private form;
  private baseId;
  private errorId;
  private entries;
  private visibleOptions;
  private selectedItem;
  private activeIndex;
  private pendingNavigationDirection;
  private isOpen;
  protected initialized: boolean;
  private createdErrorElement;
  private addedErrorDescriptionId;
  private lastStatusMessage;
  private lastResolvedItems;
  private requestId;
  private abortController;
  private debounceTimer;
  private blurTimer;
  private isComposing;
  private initialState;
  constructor(root: HTMLElement, options?: A11yAutocompleteOptions, initialize?: boolean);
  protected static getRegisteredInstance(root: HTMLElement): A11yAutocomplete | undefined;
  init(): this;
  protected afterInitialize(): void;
  destroy(): void;
  open(): void;
  close({ silent }?: {
    silent?: boolean;
  }): void;
  clear({ announce, source }?: {
    announce?: boolean;
    source?: InteractionSource;
  }): void;
  setValue(value: string, { silent }?: {
    silent?: boolean;
  }): void;
  getValue(): string;
  getSelectedItem(): AutocompleteItem | null;
  setItems(items: AutocompleteCollectionItem[]): void;
  refresh({ source }?: {
    source?: InteractionSource;
  }): void;
  protected replaceItemsSnapshot(items: AutocompleteCollectionItem[]): void;
  protected refreshResults({ source }?: {
    source?: InteractionSource;
  }): void;
  checkValidity(): boolean;
  validate({ announce }?: {
    announce?: boolean;
  }): boolean;
  enable(): void;
  disable(): void;
  private handleInput;
  private handleCompositionStart;
  private handleCompositionEnd;
  private handleFocus;
  private handleBlur;
  private handleKeydown;
  private handleClear;
  private handleDocumentPointerDown;
  private handleOptionPointerDown;
  private handleOptionClick;
  private handleOptionPointerMove;
  private handleSubmit;
  private handleReset;
  private moveActive;
  private selectItem;
  private scheduleAsyncRefresh;
  private loadAsyncResults;
  private abortRequest;
  private filteredItems;
  private filterFlat;
  private limitCollection;
  private matchScore;
  private renderCollection;
  private buildEntries;
  private optionEntry;
  private groupElement;
  private optionElement;
  private setActiveIndex;
  private updateActiveOption;
  private resetResults;
  private showError;
  private clearError;
  private syncDescribedBy;
  private syncValueState;
  private syncDisabledState;
  private itemLabel;
  private itemValue;
  private fieldLabel;
  private query;
  private normalizeText;
  private findExactMatch;
  private itemMatchesValue;
  private message;
  private updateResultsSummary;
  private announce;
  private updateStatus;
  private shouldOpenAutomatically;
  private handleResultsError;
  protected ensureInitialized(): void;
  private setHiddenValue;
  private emit;
}
declare function createAutocomplete(root: HTMLElement, options?: A11yAutocompleteOptions): A11yAutocompleteInstance;
declare function initAutocompleteAll(options?: A11yAutocompleteOptions): A11yAutocompleteInstance[];
//#endregion
export { A11yAutocomplete, A11yAutocompleteInstance, A11yAutocompleteOptions, ATTRIBUTES, AutocompleteCollectionItem, AutocompleteFilterContext, AutocompleteGroup, AutocompleteItem, AutocompleteMessages, AutocompleteRenderContext, AutocompleteSourceContext, AutocompleteValidationMode, CLASSES, DEFAULT_OPTIONS, EVENTS, InteractionSource, SELECTORS, createAutocomplete, initAutocompleteAll };
//# sourceMappingURL=index.d.ts.map