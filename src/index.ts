const COMPONENT_NAME = "a11y-autocomplete";

export type AutocompleteItem = string | { label: string; value?: string; [key: string]: unknown };
export interface AutocompleteGroup { label: string; items: AutocompleteItem[]; }
export type AutocompleteCollectionItem = AutocompleteItem | AutocompleteGroup;
export type InteractionSource = "input" | "keyboard" | "pointer" | "focus" | "blur" | "programmatic";
export type AutocompleteValidationMode = "standalone" | "external";

export interface AutocompleteMessages {
  results?: string | ((count: number) => string);
  noResults?: string | ((query: string) => string);
  loading?: string;
  error?: string;
  selected?: string | ((label: string) => string);
  cleared?: string;
  invalid?: string | ((label: string) => string);
}

export interface AutocompleteSourceContext {
  query: string;
  signal: AbortSignal;
  instance: A11yAutocompleteInstance;
}

export interface AutocompleteFilterContext {
  items: AutocompleteCollectionItem[];
  query: string;
  instance: A11yAutocompleteInstance;
}

export interface AutocompleteRenderContext {
  query: string;
  label: string;
  value: string;
  optionIndex: number;
}

export interface A11yAutocompleteOptions {
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

export interface A11yAutocompleteInstance {
  readonly root: HTMLElement;
  readonly validationMode: AutocompleteValidationMode;
  init(): A11yAutocompleteInstance;
  destroy(): void;
  open(): void;
  close(options?: { silent?: boolean }): void;
  clear(options?: { announce?: boolean; source?: InteractionSource }): void;
  setValue(value: string, options?: { silent?: boolean }): void;
  getValue(): string;
  getSelectedItem(): AutocompleteItem | null;
  setItems(items: AutocompleteCollectionItem[]): void;
  refresh(options?: { source?: InteractionSource }): void;
  checkValidity(): boolean;
  validate(options?: { announce?: boolean }): boolean;
  enable(): void;
  disable(): void;
}

interface NormalizedMessages {
  results: string | ((count: number) => string);
  noResults: string | ((query: string) => string);
  loading: string;
  error: string;
  selected: string | ((label: string) => string);
  cleared: string;
  invalid: string | ((label: string) => string);
}

interface NormalizedOptions {
  inputSelector: string;
  listSelector: string;
  popupSelector: string;
  statusSelector: string;
  clearSelector: string;
  hiddenValueSelector: string;
  clearLabel: string;
  items: AutocompleteCollectionItem[];
  source: ((context: AutocompleteSourceContext) => Promise<AutocompleteCollectionItem[]>) | null;
  minLength: number;
  maxResults: number;
  debounceDelay: number;
  strict: boolean;
  validationMode: AutocompleteValidationMode;
  openOnFocus: boolean;
  selectOnBlur: boolean;
  clearOnEscape: boolean;
  highlightFirst: boolean;
  autoComplete: "none" | "list";
  getItemLabel: (item: AutocompleteItem) => string;
  getItemValue: (item: AutocompleteItem) => string;
  filterItems: ((context: AutocompleteFilterContext) => AutocompleteCollectionItem[]) | null;
  renderOption: ((item: AutocompleteItem, context: AutocompleteRenderContext) => Node | string | null) | null;
  messages: NormalizedMessages;
}

interface OptionEntry {
  type: "option";
  item: AutocompleteItem;
  label: string;
  value: string;
  optionIndex: number;
  id: string;
}

interface GroupEntry { type: "group"; label: string; id: string; itemCount: number; }
type Entry = OptionEntry | GroupEntry;

interface InitialState {
  rootClassName: string;
  root: Record<string, string | null>;
  input: Record<string, string | null>;
  list: Record<string, string | null>;
  popupHidden: boolean;
  clear: Record<string, string | null> | null;
  hiddenValue: string | null;
  status: Record<string, string | null>;
  listChildren: ChildNode[];
  statusText: string | null;
  errorText: string | null;
  error: Record<string, string | null> | null;
}

const DEFAULT_MESSAGES = Object.freeze<NormalizedMessages>({
  results: (count) => `${count} suggestion${count === 1 ? "" : "s"} available.`,
  noResults: (query) => query ? `No suggestions found for ${query}.` : "No suggestions available.",
  loading: "Loading suggestions.",
  error: "Suggestions could not be loaded.",
  selected: (label) => `${label} selected.`,
  cleared: "Input cleared.",
  invalid: "Select a value from the suggestions list."
});

const DEFAULT_OPTIONS = Object.freeze({
  inputSelector: "[data-autocomplete-input]",
  listSelector: "[data-autocomplete-list]",
  popupSelector: "[data-autocomplete-popup]",
  statusSelector: "[data-autocomplete-status]",
  clearSelector: "[data-autocomplete-clear]",
  hiddenValueSelector: "[data-autocomplete-hidden-value]",
  clearLabel: "Clear autocomplete input",
  minLength: 1,
  maxResults: 8,
  debounceDelay: 200,
  strict: false,
  validationMode: "standalone" as const,
  openOnFocus: false,
  selectOnBlur: false,
  clearOnEscape: false,
  highlightFirst: false,
  autoComplete: "list" as const
});

const SELECTORS = Object.freeze({
  root: "[data-a11y-autocomplete], .js-autocomplete",
  option: "[data-autocomplete-option]",
  error: "[data-autocomplete-error]"
});

const CLASSES = Object.freeze({
  initialized: "is-initialized",
  open: "is-open",
  loading: "is-loading",
  results: "has-results",
  noResults: "has-no-results",
  value: "has-value",
  invalid: "is-invalid",
  error: "has-error",
  disabled: "is-disabled"
});

const RESULTS_STATUS_CLASS = "has-results-status";

const ATTRIBUTES = Object.freeze({
  initialized: "data-a11y-autocomplete-initialized",
  expanded: "aria-expanded",
  activeDescendant: "aria-activedescendant",
  busy: "aria-busy",
  selected: "aria-selected"
});

const EVENTS = Object.freeze({
  init: `${COMPONENT_NAME}:init`,
  open: `${COMPONENT_NAME}:open`,
  close: `${COMPONENT_NAME}:close`,
  input: `${COMPONENT_NAME}:input`,
  results: `${COMPONENT_NAME}:results`,
  select: `${COMPONENT_NAME}:select`,
  clear: `${COMPONENT_NAME}:clear`,
  error: `${COMPONENT_NAME}:error`,
  destroy: `${COMPONENT_NAME}:destroy`
});

let instanceCount = 0;

function toSafeBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function toSafeInteger(value: number | string | undefined, fallback: number, limits: { min?: number; max?: number } = {}): number {
  const serialized = typeof value === "string" ? value.trim() : value;
  const parsed = typeof serialized === "number"
    ? serialized
    : typeof serialized === "string" && /^-?\d+$/.test(serialized)
      ? Number(serialized)
      : Number.NaN;
  if (!Number.isSafeInteger(parsed)) return fallback;
  if (limits.min !== undefined && parsed < limits.min) return fallback;
  if (limits.max !== undefined && parsed > limits.max) return fallback;
  return parsed;
}

function toSafeString(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function toSafeAutocomplete(value: unknown): "none" | "list" {
  return value === "none" ? "none" : "list";
}

function toSafeValidationMode(value: unknown): AutocompleteValidationMode {
  return value === "external" ? "external" : "standalone";
}

function uniqueDocumentId(base: string, current?: Element): string {
  const normalized = base.trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-") || COMPONENT_NAME;
  let candidate = normalized;
  let suffix = 2;
  const conflicts = (id: string) => Array.from(document.querySelectorAll<HTMLElement>("[id]"))
    .some((element) => element !== current && element.id === id);
  while (conflicts(candidate)) candidate = `${normalized}-${suffix++}`;
  return candidate;
}

function isGroup(item: AutocompleteCollectionItem): item is AutocompleteGroup {
  return typeof item === "object" && item !== null && "items" in item && Array.isArray(item.items);
}

function defaultItemLabel(item: AutocompleteItem): string {
  return typeof item === "string" ? item : item.label;
}

function defaultItemValue(item: AutocompleteItem): string {
  return typeof item === "string" ? item : String(item.value ?? item.label);
}

function normalizeOptions(root: HTMLElement, options: A11yAutocompleteOptions): NormalizedOptions {
  return {
    inputSelector: toSafeString(options.inputSelector, DEFAULT_OPTIONS.inputSelector),
    listSelector: toSafeString(options.listSelector, DEFAULT_OPTIONS.listSelector),
    popupSelector: toSafeString(options.popupSelector, DEFAULT_OPTIONS.popupSelector),
    statusSelector: toSafeString(options.statusSelector, DEFAULT_OPTIONS.statusSelector),
    clearSelector: toSafeString(options.clearSelector, DEFAULT_OPTIONS.clearSelector),
    hiddenValueSelector: toSafeString(options.hiddenValueSelector, DEFAULT_OPTIONS.hiddenValueSelector),
    clearLabel: toSafeString(options.clearLabel, DEFAULT_OPTIONS.clearLabel),
    items: Array.isArray(options.items) ? options.items : [],
    source: typeof options.source === "function" ? options.source : null,
    minLength: toSafeInteger(options.minLength ?? root.dataset.minLength, DEFAULT_OPTIONS.minLength, { min: 0 }),
    maxResults: toSafeInteger(options.maxResults ?? root.dataset.maxResults, DEFAULT_OPTIONS.maxResults, { min: 1 }),
    debounceDelay: toSafeInteger(options.debounceDelay ?? root.dataset.debounceDelay, DEFAULT_OPTIONS.debounceDelay, { min: 0 }),
    strict: toSafeBoolean(options.strict ?? root.dataset.strict, DEFAULT_OPTIONS.strict),
    validationMode: toSafeValidationMode(options.validationMode ?? root.dataset.validationMode),
    openOnFocus: toSafeBoolean(options.openOnFocus ?? root.dataset.openOnFocus, DEFAULT_OPTIONS.openOnFocus),
    selectOnBlur: toSafeBoolean(options.selectOnBlur ?? root.dataset.selectOnBlur, DEFAULT_OPTIONS.selectOnBlur),
    clearOnEscape: toSafeBoolean(options.clearOnEscape ?? root.dataset.clearOnEscape, DEFAULT_OPTIONS.clearOnEscape),
    highlightFirst: toSafeBoolean(options.highlightFirst ?? root.dataset.highlightFirst, DEFAULT_OPTIONS.highlightFirst),
    autoComplete: toSafeAutocomplete(options.autoComplete ?? DEFAULT_OPTIONS.autoComplete),
    getItemLabel: options.getItemLabel ?? defaultItemLabel,
    getItemValue: options.getItemValue ?? defaultItemValue,
    filterItems: options.filterItems ?? null,
    renderOption: options.renderOption ?? null,
    messages: { ...DEFAULT_MESSAGES, ...options.messages }
  };
}

function attributeState(element: Element, names: string[]): Record<string, string | null> {
  return Object.fromEntries(names.map((name) => [name, element.hasAttribute(name) ? element.getAttribute(name) : null]));
}

function restoreAttributes(element: Element, state: Record<string, string | null>): void {
  for (const [name, value] of Object.entries(state)) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}

function closestOption(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(SELECTORS.option) : null;
}

export class A11yAutocomplete implements A11yAutocompleteInstance {
  private static readonly instances = new WeakMap<HTMLElement, A11yAutocomplete>();

  readonly root!: HTMLElement;
  readonly validationMode!: AutocompleteValidationMode;
  private readonly options!: NormalizedOptions;
  private input!: HTMLInputElement;
  private list!: HTMLElement;
  private popup!: HTMLElement;
  private resultsSummary: HTMLElement | null = null;
  private statusElement!: HTMLElement;
  private clearButton: HTMLButtonElement | null = null;
  private hiddenValueInput: HTMLInputElement | null = null;
  private form: HTMLFormElement | null = null;
  private baseId = "";
  private errorId = "";
  private entries: Entry[] = [];
  private visibleOptions: OptionEntry[] = [];
  private selectedItem: AutocompleteItem | null = null;
  private activeIndex = -1;
  private pendingNavigationDirection: 1 | -1 | null = null;
  private isOpen = false;
  protected initialized = false;
  private createdErrorElement = false;
  private addedErrorDescriptionId: string | null = null;
  private lastStatusMessage = "";
  private lastResolvedItems: AutocompleteCollectionItem[] = [];
  private requestId = 0;
  private abortController: AbortController | null = null;
  private debounceTimer: number | undefined;
  private blurTimer: number | undefined;
  private isComposing = false;
  private initialState!: InitialState;

  constructor(root: HTMLElement, options: A11yAutocompleteOptions = {}, initialize = true) {
    const existing = A11yAutocomplete.instances.get(root);
    if (existing) return existing;

    this.root = root;
    this.options = normalizeOptions(root, options);
    this.validationMode = this.options.validationMode;

    this.handleInput = this.handleInput.bind(this);
    this.handleCompositionStart = this.handleCompositionStart.bind(this);
    this.handleCompositionEnd = this.handleCompositionEnd.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleOptionPointerDown = this.handleOptionPointerDown.bind(this);
    this.handleOptionClick = this.handleOptionClick.bind(this);
    this.handleOptionPointerMove = this.handleOptionPointerMove.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleReset = this.handleReset.bind(this);

    if (initialize) {
      try {
        this.init();
      } catch (error) {
        A11yAutocomplete.instances.delete(root);
        throw error;
      }
    }
  }

  protected static getRegisteredInstance(root: HTMLElement): A11yAutocomplete | undefined {
    return A11yAutocomplete.instances.get(root);
  }

  init(): this {
    if (this.initialized) return this;
    const registered = A11yAutocomplete.instances.get(this.root);
    if (registered && registered !== this) {
      throw new Error("A11yAutocomplete already has another initialized instance for this root.");
    }

    const input = this.root.querySelector(this.options.inputSelector);
    const list = this.root.querySelector(this.options.listSelector);
    const popup = this.root.querySelector(this.options.popupSelector);
    const status = this.root.querySelector(this.options.statusSelector);
    if (!(input instanceof HTMLInputElement) || !(list instanceof HTMLElement) || !(popup instanceof HTMLElement) || !(status instanceof HTMLElement)) {
      throw new Error("A11yAutocomplete markup is missing a required input, list, popup, or status element.");
    }
    if (input.type !== "text" && input.type !== "search") {
      throw new Error("A11yAutocomplete requires an input with type text or search.");
    }
    const clearButton = this.root.querySelector(this.options.clearSelector);
    if (clearButton && !(clearButton instanceof HTMLButtonElement)) {
      throw new Error("A11yAutocomplete clear control must be a button element.");
    }
    const hiddenValueInput = this.root.querySelector(this.options.hiddenValueSelector);
    if (hiddenValueInput && !(hiddenValueInput instanceof HTMLInputElement)) {
      throw new Error("A11yAutocomplete hidden value control must be an input element.");
    }

    this.input = input;
    this.list = list;
    this.popup = popup;
    this.statusElement = status;
    this.clearButton = clearButton;
    this.hiddenValueInput = hiddenValueInput;
    this.form = this.input.form ?? this.root.closest("form");

    const existingError = this.root.querySelector<HTMLElement>(SELECTORS.error);
    this.initialState = {
      rootClassName: this.root.className,
      root: attributeState(this.root, [ATTRIBUTES.initialized]),
      input: attributeState(this.input, ["id", "role", "autocomplete", "aria-autocomplete", "aria-expanded", "aria-controls", "aria-haspopup", "aria-invalid", "aria-activedescendant", "aria-describedby", "disabled", "list"]),
      list: attributeState(this.list, ["id", "role", "aria-busy"]),
      popupHidden: Boolean(this.popup.hidden),
      clear: this.clearButton ? attributeState(this.clearButton, ["type", "aria-label", "aria-hidden", "disabled", "hidden"]) : null,
      hiddenValue: this.hiddenValueInput?.value ?? null,
      status: attributeState(this.statusElement, ["role", "aria-live", "aria-atomic"]),
      listChildren: Array.from(this.list.childNodes),
      statusText: this.statusElement.textContent,
      errorText: existingError?.textContent ?? null,
      error: existingError ? attributeState(existingError, ["id"]) : null
    };

    instanceCount += 1;
    this.baseId = `${this.input.id || COMPONENT_NAME}-${instanceCount}`;
    this.errorId = `${this.baseId}-error`;
    if (!this.input.id) this.input.id = uniqueDocumentId(this.baseId, this.input);
    if (!this.list.id || /\s/.test(this.list.id) || Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .some((element) => element !== this.list && element.id === this.list.id)) {
      this.list.id = uniqueDocumentId(`${this.baseId}-listbox`, this.list);
    }

    if (!this.input.hasAttribute("autocomplete")) this.input.setAttribute("autocomplete", "off");
    this.input.setAttribute("role", "combobox");
    this.input.setAttribute("aria-autocomplete", this.options.autoComplete);
    this.input.setAttribute(ATTRIBUTES.expanded, "false");
    this.input.setAttribute("aria-controls", this.list.id);
    this.input.setAttribute("aria-haspopup", "listbox");
    if (this.validationMode === "standalone") this.input.setAttribute("aria-invalid", "false");
    this.input.removeAttribute(ATTRIBUTES.activeDescendant);
    this.list.setAttribute("role", "listbox");
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    if (!this.statusElement.hasAttribute("role")) this.statusElement.setAttribute("role", "status");
    if (!this.statusElement.hasAttribute("aria-live") && this.statusElement.getAttribute("role") !== "alert") {
      this.statusElement.setAttribute("aria-live", "polite");
    }
    if (!this.statusElement.hasAttribute("aria-atomic") && this.statusElement.getAttribute("role") === "status") {
      this.statusElement.setAttribute("aria-atomic", "true");
    }
    this.resultsSummary = document.createElement("div");
    this.resultsSummary.className = "a11y-autocomplete__results-summary";
    this.resultsSummary.dataset.autocompleteResultsSummary = "";
    this.resultsSummary.setAttribute("aria-hidden", "true");
    this.resultsSummary.hidden = true;
    this.popup.prepend(this.resultsSummary);
    this.popup.hidden = true;

    this.input.addEventListener("input", this.handleInput);
    this.input.addEventListener("compositionstart", this.handleCompositionStart);
    this.input.addEventListener("compositionend", this.handleCompositionEnd);
    this.input.addEventListener("compositioncancel", this.handleCompositionEnd);
    this.input.addEventListener("focus", this.handleFocus);
    this.input.addEventListener("blur", this.handleBlur);
    this.input.addEventListener("keydown", this.handleKeydown);
    this.list.addEventListener("pointerdown", this.handleOptionPointerDown);
    this.list.addEventListener("click", this.handleOptionClick);
    this.list.addEventListener("pointermove", this.handleOptionPointerMove);
    document.addEventListener("pointerdown", this.handleDocumentPointerDown);

    if (this.clearButton) {
      if (!this.clearButton.hasAttribute("type")) this.clearButton.type = "button";
      this.clearButton.setAttribute("aria-label", this.options.clearLabel);
      this.clearButton.addEventListener("click", this.handleClear);
    }
    if (this.form) {
      if (this.validationMode === "standalone") this.form.addEventListener("submit", this.handleSubmit);
      this.form.addEventListener("reset", this.handleReset);
    }

    this.root.classList.add(CLASSES.initialized);
    this.root.setAttribute(ATTRIBUTES.initialized, "true");
    this.initialized = true;
    this.createdErrorElement = false;
    this.addedErrorDescriptionId = null;
    this.lastStatusMessage = this.statusElement.textContent ?? "";
    this.lastResolvedItems = [];
    this.isComposing = false;
    A11yAutocomplete.instances.set(this.root, this);
    this.syncDisabledState();
    this.syncValueState();
    this.clearError();
    this.close({ silent: true });
    this.afterInitialize();
    this.emit(EVENTS.init);
    return this;
  }

  protected afterInitialize(): void { /* Optional addon lifecycle hook. */ }

  destroy(): void {
    if (!this.initialized) return;
    this.abortRequest();
    window.clearTimeout(this.debounceTimer);
    window.clearTimeout(this.blurTimer);
    this.input.removeEventListener("input", this.handleInput);
    this.input.removeEventListener("compositionstart", this.handleCompositionStart);
    this.input.removeEventListener("compositionend", this.handleCompositionEnd);
    this.input.removeEventListener("compositioncancel", this.handleCompositionEnd);
    this.input.removeEventListener("focus", this.handleFocus);
    this.input.removeEventListener("blur", this.handleBlur);
    this.input.removeEventListener("keydown", this.handleKeydown);
    this.list.removeEventListener("pointerdown", this.handleOptionPointerDown);
    this.list.removeEventListener("click", this.handleOptionClick);
    this.list.removeEventListener("pointermove", this.handleOptionPointerMove);
    document.removeEventListener("pointerdown", this.handleDocumentPointerDown);
    this.clearButton?.removeEventListener("click", this.handleClear);
    this.form?.removeEventListener("submit", this.handleSubmit);
    this.form?.removeEventListener("reset", this.handleReset);

    this.list.replaceChildren(...this.initialState.listChildren);
    this.statusElement.textContent = this.initialState.statusText;
    this.resultsSummary?.remove();
    this.resultsSummary = null;
    this.root.className = this.initialState.rootClassName;
    restoreAttributes(this.root, this.initialState.root);
    this.popup.hidden = this.initialState.popupHidden;
    restoreAttributes(this.input, this.initialState.input);
    restoreAttributes(this.list, this.initialState.list);
    restoreAttributes(this.statusElement, this.initialState.status);
    if (this.clearButton && this.initialState.clear) restoreAttributes(this.clearButton, this.initialState.clear);

    const errorElement = this.root.querySelector<HTMLElement>(SELECTORS.error);
    if (this.createdErrorElement) errorElement?.remove();
    else if (errorElement && this.initialState.errorText !== null) {
      errorElement.textContent = this.initialState.errorText;
      if (this.initialState.error) restoreAttributes(errorElement, this.initialState.error);
    }

    this.initialized = false;
    this.isOpen = false;
    this.activeIndex = -1;
    this.pendingNavigationDirection = null;
    this.entries = [];
    this.visibleOptions = [];
    this.selectedItem = null;
    this.lastResolvedItems = [];
    this.lastStatusMessage = "";
    this.isComposing = false;
    A11yAutocomplete.instances.delete(this.root);
    this.emit(EVENTS.destroy);
  }

  open(): void {
    this.ensureInitialized();
    if (this.input.disabled) return;
    if (this.isOpen || !this.list.childElementCount) return;
    this.popup.hidden = false;
    this.input.setAttribute(ATTRIBUTES.expanded, "true");
    this.root.classList.add(CLASSES.open);
    this.isOpen = true;
    this.emit(EVENTS.open);
  }

  close({ silent = false }: { silent?: boolean } = {}): void {
    this.ensureInitialized();
    const wasOpen = this.isOpen;
    this.popup.hidden = true;
    this.input.setAttribute(ATTRIBUTES.expanded, "false");
    this.activeIndex = -1;
    this.updateActiveOption();
    this.root.classList.remove(CLASSES.open);
    this.isOpen = false;
    if (!silent && wasOpen) this.emit(EVENTS.close);
  }

  clear({ announce = true, source = "programmatic" }: { announce?: boolean; source?: InteractionSource } = {}): void {
    this.ensureInitialized();
    this.abortRequest();
    window.clearTimeout(this.debounceTimer);
    this.input.value = "";
    this.selectedItem = null;
    this.lastResolvedItems = [];
    this.setHiddenValue("");
    this.clearError();
    this.syncValueState();
    this.resetResults();
    if (announce) this.announce(this.message("cleared"));
    this.emit(EVENTS.clear, { source, item: null });
  }

  setValue(value: string, { silent = false }: { silent?: boolean } = {}): void {
    this.ensureInitialized();
    this.input.value = value ?? "";
    this.selectedItem = null;
    this.lastResolvedItems = [];
    this.setHiddenValue("");
    this.clearError();
    this.syncValueState();
    if (!silent) this.refreshResults();
  }

  getValue(): string { return this.input.value; }
  getSelectedItem(): AutocompleteItem | null { return this.selectedItem; }

  setItems(items: AutocompleteCollectionItem[]): void {
    this.ensureInitialized();
    this.replaceItemsSnapshot(items);
    this.refreshResults();
  }

  refresh({ source = "programmatic" }: { source?: InteractionSource } = {}): void {
    this.ensureInitialized();
    this.refreshResults({ source });
  }

  protected replaceItemsSnapshot(items: AutocompleteCollectionItem[]): void {
    this.options.items = Array.isArray(items) ? items : [];
  }

  protected refreshResults({ source = "programmatic" }: { source?: InteractionSource } = {}): void {
    if (this.input.disabled) {
      this.abortRequest();
      this.resetResults();
      return;
    }
    const query = this.query();
    if (query.length < this.options.minLength) {
      this.abortRequest();
      this.lastResolvedItems = [];
      this.resetResults();
      return;
    }
    if (this.options.source) {
      this.scheduleAsyncRefresh(query, source);
      return;
    }
    try {
      this.renderCollection(this.filteredItems(query), query, source, this.shouldOpenAutomatically());
    } catch (error: unknown) {
      this.handleResultsError(error, source);
    }
  }

  checkValidity(): boolean {
    this.ensureInitialized();
    if (!this.options.strict) return true;
    const value = this.query();
    if (!value) return true;
    const selectedMatch = this.selectedItem && this.itemMatchesValue(this.selectedItem, value) ? this.selectedItem : null;
    return Boolean(selectedMatch ?? this.findExactMatch(value));
  }

  validate({ announce = true }: { announce?: boolean } = {}): boolean {
    this.ensureInitialized();
    if (!this.options.strict) {
      this.clearError();
      return true;
    }
    const value = this.query();
    if (!value) {
      this.clearError();
      return true;
    }
    const selectedMatch = this.selectedItem && this.itemMatchesValue(this.selectedItem, value) ? this.selectedItem : null;
    const match = selectedMatch ?? this.findExactMatch(value);
    if (match) {
      if (this.selectedItem !== match) this.selectItem(match, "programmatic", false);
      this.clearError();
      return true;
    }
    if (this.validationMode === "standalone") this.showError(this.message("invalid", this.fieldLabel()), announce);
    return false;
  }

  enable(): void {
    this.ensureInitialized();
    this.input.disabled = false;
    this.syncDisabledState();
  }

  disable(): void {
    this.ensureInitialized();
    this.abortRequest();
    window.clearTimeout(this.debounceTimer);
    this.input.disabled = true;
    this.syncDisabledState();
    this.resetResults();
  }

  private handleInput(): void {
    this.selectedItem = null;
    this.setHiddenValue("");
    this.syncValueState();
    this.clearError();
    if (this.isComposing) return;
    this.emit(EVENTS.input, { source: "input" });
    this.refreshResults({ source: "input" });
  }

  private handleCompositionStart(): void { this.isComposing = true; }

  private handleCompositionEnd(): void {
    if (!this.isComposing) return;
    this.isComposing = false;
    this.emit(EVENTS.input, { source: "input" });
    this.refreshResults({ source: "input" });
  }

  private handleFocus(): void {
    if (this.options.openOnFocus) this.refreshResults({ source: "focus" });
  }

  private handleBlur(): void {
    const wasLoading = this.root.classList.contains(CLASSES.loading);
    this.abortRequest();
    window.clearTimeout(this.debounceTimer);
    this.root.classList.remove(CLASSES.loading);
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    if (wasLoading) {
      this.statusElement.textContent = "";
      this.lastStatusMessage = "";
    }
    this.pendingNavigationDirection = null;
    window.clearTimeout(this.blurTimer);
    this.blurTimer = window.setTimeout(() => {
      const active = this.visibleOptions[this.activeIndex];
      if (!this.initialized) return;
      if (this.options.selectOnBlur && active) this.selectItem(active.item, "blur");
      else {
        this.close();
        if (this.options.strict && this.validationMode === "standalone") this.validate();
      }
    }, 0);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveActive(-1);
    } else if (event.key === "Enter") {
      const active = this.visibleOptions[this.activeIndex];
      if (this.isOpen && active) {
        event.preventDefault();
        this.selectItem(active.item, "keyboard");
      }
    } else if (event.key === "Escape") {
      if (this.isOpen) {
        event.preventDefault();
        this.close();
      } else if (this.options.clearOnEscape) this.clear({ source: "keyboard" });
    } else if (event.key === "Tab" && (!this.options.selectOnBlur || this.activeIndex < 0)) this.close();
  }

  private handleClear(): void { this.clear({ source: "pointer" }); this.input.focus(); }
  private handleDocumentPointerDown(event: PointerEvent): void { if (!this.root.contains(event.target as Node | null)) this.close(); }
  private handleOptionPointerDown(event: PointerEvent): void { if (closestOption(event.target)) event.preventDefault(); }

  private handleOptionClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const option = closestOption(event.target);
    if (!option) return;
    const entry = this.visibleOptions[Number(option.dataset.index)];
    if (entry) this.selectItem(entry.item, "pointer");
  }

  private handleOptionPointerMove(event: PointerEvent): void {
    const option = closestOption(event.target);
    const index = Number(option?.dataset.index);
    if (option && Number.isInteger(index)) this.setActiveIndex(index);
  }

  private handleSubmit(event: SubmitEvent): void {
    if (!this.validate()) {
      event.preventDefault();
      this.input.focus();
    }
  }
  private handleReset(): void {
    this.abortRequest();
    window.clearTimeout(this.debounceTimer);
    window.setTimeout(() => {
      if (!this.initialized) return;
      this.selectedItem = null;
      this.lastResolvedItems = [];
      if (this.hiddenValueInput) this.hiddenValueInput.value = this.initialState.hiddenValue ?? "";
      this.clearError();
      this.syncValueState();
      this.resetResults();
    }, 0);
  }

  private moveActive(direction: 1 | -1): void {
    if (!this.isOpen) {
      this.pendingNavigationDirection = direction;
      this.refreshResults({ source: "keyboard" });
      return;
    }
    if (!this.visibleOptions.length) return;
    const lastIndex = this.visibleOptions.length - 1;
    const next = this.activeIndex < 0
      ? direction === 1 ? 0 : lastIndex
      : Math.min(lastIndex, Math.max(0, this.activeIndex + direction));
    if (next !== this.activeIndex) this.setActiveIndex(next);
  }

  private selectItem(item: AutocompleteItem, source: InteractionSource, announce = true): void {
    const label = this.itemLabel(item);
    this.selectedItem = item;
    this.input.value = label;
    this.setHiddenValue(this.itemValue(item));
    this.syncValueState();
    this.clearError();
    this.close();
    this.input.setSelectionRange(label.length, label.length);
    if (announce) this.announce(this.message("selected", label));
    this.emit(EVENTS.select, { item, source });
  }

  private scheduleAsyncRefresh(query: string, source: InteractionSource): void {
    window.clearTimeout(this.debounceTimer);
    this.abortRequest();
    this.lastResolvedItems = [];
    this.entries = [];
    this.visibleOptions = [];
    this.list.replaceChildren();
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    this.root.classList.remove(CLASSES.loading, CLASSES.results, CLASSES.noResults, CLASSES.error);
    this.updateResultsSummary("");
    this.updateStatus("", false, false);
    this.close({ silent: true });
    this.debounceTimer = window.setTimeout(() => void this.loadAsyncResults(query, source), this.options.debounceDelay);
  }

  private async loadAsyncResults(query: string, source: InteractionSource): Promise<void> {
    if (!this.options.source || !this.initialized || this.input.disabled) return;
    this.abortRequest();
    const requestId = ++this.requestId;
    this.abortController = new AbortController();
    this.root.classList.add(CLASSES.loading);
    this.list.setAttribute(ATTRIBUTES.busy, "true");
    this.entries = [];
    this.visibleOptions = [];
    this.list.replaceChildren();
    this.updateResultsSummary("");
    this.close({ silent: true });
    this.announce(this.message("loading"), true);
    try {
      const results = await this.options.source({ query, signal: this.abortController.signal, instance: this });
      if (requestId !== this.requestId || !this.initialized || this.input.disabled) return;
      const collection = this.limitCollection(Array.isArray(results) ? results : []);
      this.lastResolvedItems = collection;
      this.renderCollection(collection, query, source, this.shouldOpenAutomatically());
    } catch (error: unknown) {
      if ((error instanceof DOMException && error.name === "AbortError") || requestId !== this.requestId) return;
      this.handleResultsError(error, source);
    } finally {
      if (requestId === this.requestId) this.abortController = null;
    }
  }

  private abortRequest(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.requestId += 1;
  }

  private filteredItems(query: string): AutocompleteCollectionItem[] {
    if (this.options.autoComplete === "none") return this.limitCollection(this.options.items);
    if (this.options.filterItems) {
      const filtered = this.options.filterItems({ items: this.options.items, query, instance: this });
      return this.limitCollection(Array.isArray(filtered) ? filtered : []);
    }
    if (!this.options.items.some(isGroup)) {
      return this.filterFlat(this.options.items.filter((item): item is AutocompleteItem => !isGroup(item)), query, this.options.maxResults);
    }

    let remaining = this.options.maxResults;
    const results: AutocompleteCollectionItem[] = [];
    for (const item of this.options.items) {
      if (remaining <= 0) break;
      if (isGroup(item)) {
        const matches = this.filterFlat(item.items, query, remaining);
        if (matches.length) {
          results.push({ label: item.label, items: matches });
          remaining -= matches.length;
        }
      } else if (Number.isFinite(this.matchScore(item, query))) {
        results.push(item);
        remaining -= 1;
      }
    }
    return results;
  }

  private filterFlat(items: AutocompleteItem[], query: string, limit: number): AutocompleteItem[] {
    return items
      .map((item, index) => ({ item, index, score: this.matchScore(item, query) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => left.score - right.score || left.index - right.index)
      .slice(0, limit)
      .map(({ item }) => item);
  }

  private limitCollection(items: AutocompleteCollectionItem[]): AutocompleteCollectionItem[] {
    let remaining = this.options.maxResults;
    const limited: AutocompleteCollectionItem[] = [];
    for (const item of items) {
      if (remaining <= 0) break;
      if (isGroup(item)) {
        const children = item.items.filter((child) => Boolean(this.itemLabel(child))).slice(0, remaining);
        if (children.length) {
          limited.push({ label: item.label, items: children });
          remaining -= children.length;
        }
      } else if (this.itemLabel(item)) {
        limited.push(item);
        remaining -= 1;
      }
    }
    return limited;
  }

  private matchScore(item: AutocompleteItem, query: string): number {
    const itemLabel = this.itemLabel(item);
    if (!itemLabel) return Number.POSITIVE_INFINITY;
    const label = this.normalizeText(itemLabel);
    const normalized = this.normalizeText(query);
    if (!normalized || label === normalized) return 0;
    if (label.startsWith(normalized)) return 1;
    if (label.includes(normalized)) return 2;
    return Number.POSITIVE_INFINITY;
  }

  private renderCollection(items: AutocompleteCollectionItem[], query: string, source: InteractionSource, shouldOpen: boolean): void {
    this.root.classList.remove(CLASSES.loading, CLASSES.error);
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    this.entries = this.buildEntries(items);
    this.visibleOptions = this.entries.filter((entry): entry is OptionEntry => entry.type === "option");
    this.list.replaceChildren();
    if (!this.visibleOptions.length) {
      this.pendingNavigationDirection = null;
      this.root.classList.remove(CLASSES.results);
      this.root.classList.add(CLASSES.noResults);
      this.updateResultsSummary("");
      const message = this.message("noResults", query);
      this.close({ silent: true });
      this.announce(message);
      this.emit(EVENTS.results, { results: [], source });
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < this.entries.length; index += 1) {
      const entry = this.entries[index];
      if (entry.type === "option") {
        fragment.append(this.optionElement(entry));
        continue;
      }

      const group = this.groupElement(entry);
      const groupOptions = group.querySelector<HTMLElement>("[data-autocomplete-group-options]");
      for (let offset = 1; offset <= entry.itemCount; offset += 1) {
        const optionEntry = this.entries[index + offset];
        if (optionEntry?.type === "option") groupOptions?.append(this.optionElement(optionEntry));
      }
      fragment.append(group);
      index += entry.itemCount;
    }
    this.list.append(fragment);
    const resultsMessage = this.message("results", this.visibleOptions.length);
    this.updateResultsSummary(resultsMessage);
    this.root.classList.add(CLASSES.results);
    this.root.classList.remove(CLASSES.noResults);
    if (shouldOpen) {
      this.open();
      if (this.pendingNavigationDirection !== null) {
        this.setActiveIndex(this.pendingNavigationDirection === 1 ? 0 : this.visibleOptions.length - 1);
        this.pendingNavigationDirection = null;
      } else this.setActiveIndex(this.options.highlightFirst ? 0 : -1);
    } else {
      this.pendingNavigationDirection = null;
      this.close({ silent: true });
      this.setActiveIndex(-1);
    }
    this.updateStatus(resultsMessage, false, true);
    this.emit(EVENTS.results, { results: this.visibleOptions.map(({ item }) => item), source });
  }

  private buildEntries(items: AutocompleteCollectionItem[]): Entry[] {
    const entries: Entry[] = [];
    let optionIndex = 0;
    let groupIndex = 0;
    const namedOptionEntry = (item: AutocompleteItem): OptionEntry | null => {
      const entry = this.optionEntry(item, optionIndex);
      if (!entry.label) return null;
      optionIndex += 1;
      return entry;
    };
    for (const item of items) {
      if (isGroup(item)) {
        const options = item.items
          .map((child) => namedOptionEntry(child))
          .filter((entry): entry is OptionEntry => entry !== null);
        if (!options.length) continue;
        const label = String(item.label ?? "").trim();
        if (label) {
          entries.push({
            type: "group",
            label,
            id: `${this.baseId}-group-${groupIndex}`,
            itemCount: options.length
          });
          groupIndex += 1;
        }
        entries.push(...options);
      } else {
        const entry = namedOptionEntry(item);
        if (entry) entries.push(entry);
      }
    }
    return entries;
  }

  private optionEntry(item: AutocompleteItem, optionIndex: number): OptionEntry {
    return { type: "option", item, label: this.itemLabel(item), value: this.itemValue(item), optionIndex, id: `${this.baseId}-option-${optionIndex}` };
  }

  private groupElement(entry: GroupEntry): HTMLElement {
    const group = document.createElement("li");
    group.className = "a11y-autocomplete__group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-labelledby", entry.id);
    const label = document.createElement("div");
    label.className = "a11y-autocomplete__group-label";
    label.id = entry.id;
    label.textContent = entry.label;
    const options = document.createElement("ul");
    options.className = "a11y-autocomplete__group-options";
    options.setAttribute("role", "presentation");
    options.dataset.autocompleteGroupOptions = "";
    group.append(label, options);
    return group;
  }

  private optionElement(entry: OptionEntry): HTMLElement {
    const option = document.createElement("li");
    option.className = "a11y-autocomplete__option";
    option.id = entry.id;
    option.setAttribute("role", "option");
    option.setAttribute(ATTRIBUTES.selected, "false");
    option.dataset.autocompleteOption = "";
    option.dataset.index = String(entry.optionIndex);
    const rendered = this.options.renderOption?.(entry.item, { query: this.query(), label: entry.label, value: entry.value, optionIndex: entry.optionIndex });
    if (rendered instanceof Node) option.append(rendered);
    else option.textContent = typeof rendered === "string" ? rendered : entry.label;
    if (option.querySelector("a[href], button, input, select, textarea, [contenteditable='true'], [tabindex]:not([tabindex='-1'])")) {
      throw new Error("A11yAutocomplete renderOption must not add interactive descendants inside an option.");
    }
    return option;
  }

  private setActiveIndex(index: number): void { this.activeIndex = index; this.updateActiveOption(); }

  private updateActiveOption(): void {
    for (const option of this.list.querySelectorAll<HTMLElement>(SELECTORS.option)) {
      const active = Number(option.dataset.index) === this.activeIndex;
      option.setAttribute(ATTRIBUTES.selected, String(active));
      if (active) {
        this.input.setAttribute(ATTRIBUTES.activeDescendant, option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    }
    if (this.activeIndex < 0) this.input.removeAttribute(ATTRIBUTES.activeDescendant);
  }

  private resetResults(): void {
    this.entries = [];
    this.visibleOptions = [];
    this.lastResolvedItems = [];
    this.pendingNavigationDirection = null;
    this.list.replaceChildren();
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    this.root.classList.remove(CLASSES.loading, CLASSES.results, RESULTS_STATUS_CLASS, CLASSES.noResults, CLASSES.error);
    this.updateResultsSummary("");
    this.updateStatus("", false, false);
    this.close({ silent: true });
  }

  private showError(message: string, announce: boolean): void {
    let error = this.root.querySelector<HTMLElement>(SELECTORS.error);
    if (!error) {
      error = document.createElement("p");
      error.className = "a11y-autocomplete__error";
      error.id = this.errorId;
      error.dataset.autocompleteError = "";
      this.root.append(error);
      this.createdErrorElement = true;
    }
    error.textContent = message;
    this.root.classList.add(CLASSES.invalid, CLASSES.error);
    this.input.setAttribute("aria-invalid", "true");
    if (!error.id) error.id = this.errorId;
    const describedBy = (this.input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    if (!describedBy.includes(error.id)) {
      this.addedErrorDescriptionId = error.id;
      this.syncDescribedBy(error.id, true);
    }
    if (announce) this.announce(message);
  }

  private clearError(): void {
    if (this.validationMode === "external") return;
    const error = this.root.querySelector<HTMLElement>(SELECTORS.error);
    if (error) error.textContent = "";
    this.root.classList.remove(CLASSES.invalid, CLASSES.error);
    this.input?.setAttribute("aria-invalid", "false");
    if (this.input && this.addedErrorDescriptionId) {
      this.syncDescribedBy(this.addedErrorDescriptionId, false);
      this.addedErrorDescriptionId = null;
    }
  }

  private syncDescribedBy(id: string, include: boolean): void {
    const tokens = (this.input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean).filter((token) => token !== id);
    if (include) tokens.push(id);
    if (tokens.length) this.input.setAttribute("aria-describedby", tokens.join(" "));
    else this.input.removeAttribute("aria-describedby");
  }

  private syncValueState(): void {
    const hasValue = Boolean(this.input.value);
    this.root.classList.toggle(CLASSES.value, hasValue);
    if (this.clearButton) {
      this.clearButton.hidden = !hasValue;
      this.clearButton.setAttribute("aria-hidden", String(!hasValue));
    }
  }

  private syncDisabledState(): void {
    this.root.classList.toggle(CLASSES.disabled, this.input.disabled);
    if (this.clearButton) this.clearButton.disabled = this.input.disabled;
  }

  private itemLabel(item: AutocompleteItem): string { return String(this.options.getItemLabel(item) ?? "").trim(); }
  private itemValue(item: AutocompleteItem): string { return String(this.options.getItemValue(item) ?? ""); }
  private fieldLabel(): string { return this.input.labels?.[0]?.textContent?.trim() || "value"; }
  private query(): string { return this.input.value.trim(); }
  private normalizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  private findExactMatch(value: string): AutocompleteItem | null {
    const normalized = this.normalizeText(value);
    const candidates = [...this.options.items, ...this.lastResolvedItems]
      .flatMap((item) => isGroup(item) ? item.items : [item]);
    return candidates.find((item) => {
      return this.normalizeText(this.itemLabel(item)) === normalized || this.normalizeText(this.itemValue(item)) === normalized;
    }) ?? null;
  }

  private itemMatchesValue(item: AutocompleteItem, value: string): boolean {
    const normalized = this.normalizeText(value);
    return this.normalizeText(this.itemLabel(item)) === normalized || this.normalizeText(this.itemValue(item)) === normalized;
  }

  private message(key: keyof NormalizedMessages, value?: string | number): string {
    const resolve = (message: NormalizedMessages[typeof key]): string => {
      if (typeof message !== "function") return String(message ?? "");
      return String((message as (argument: never) => string)(value as never) ?? "");
    };
    try { return resolve(this.options.messages[key]); }
    catch { return resolve(DEFAULT_MESSAGES[key]); }
  }

  private updateResultsSummary(message: string): void {
    if (!this.resultsSummary) return;
    this.resultsSummary.textContent = message;
    this.resultsSummary.hidden = !message;
  }

  private announce(message: string, force = false): void {
    this.updateStatus(message, force, false);
  }

  private updateStatus(message: string, force: boolean, isResultsMessage: boolean): void {
    this.root.classList.toggle(RESULTS_STATUS_CLASS, isResultsMessage && Boolean(message));
    if (!message) {
      this.statusElement.textContent = "";
      this.lastStatusMessage = "";
      return;
    }
    if (!force && message === this.lastStatusMessage) return;
    if (force && message === this.lastStatusMessage) this.statusElement.textContent = "";
    this.lastStatusMessage = message;
    this.statusElement.textContent = message;
  }

  private shouldOpenAutomatically(): boolean {
    return !this.input.disabled && document.activeElement === this.input;
  }

  private handleResultsError(error: unknown, source: InteractionSource): void {
    if (!this.initialized) return;
    this.abortController = null;
    this.lastResolvedItems = [];
    this.pendingNavigationDirection = null;
    this.entries = [];
    this.visibleOptions = [];
    this.root.classList.remove(CLASSES.loading, CLASSES.results, CLASSES.noResults);
    this.root.classList.add(CLASSES.error);
    this.list.setAttribute(ATTRIBUTES.busy, "false");
    this.list.replaceChildren();
    this.updateResultsSummary("");
    this.close({ silent: true });
    let errorMessage = DEFAULT_MESSAGES.error;
    try { errorMessage = this.message("error"); } catch { /* Use the stable fallback. */ }
    this.announce(errorMessage, true);
    this.emit(EVENTS.error, { error, source });
  }

  protected ensureInitialized(): void {
    if (!this.initialized) throw new Error("A11yAutocomplete instance is not initialized. Call init() before using this method.");
  }

  private setHiddenValue(value: string): void { if (this.hiddenValueInput) this.hiddenValueInput.value = value; }

  private emit(name: string, detail: Record<string, unknown> = {}): void {
    this.root.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      detail: {
        instance: this,
        query: this.query(),
        item: this.selectedItem,
        value: this.getValue(),
        results: this.visibleOptions.map(({ item }) => item),
        source: "programmatic",
        ...detail
      }
    }));
  }
}

export function createAutocomplete(root: HTMLElement, options: A11yAutocompleteOptions = {}): A11yAutocompleteInstance {
  return new A11yAutocomplete(root, options);
}

export function initAutocompleteAll(options: A11yAutocompleteOptions = {}): A11yAutocompleteInstance[] {
  return Array.from(document.querySelectorAll(SELECTORS.root))
    .filter((root): root is HTMLElement => root instanceof HTMLElement)
    .map((root) => createAutocomplete(root, options));
}

export { ATTRIBUTES, CLASSES, DEFAULT_OPTIONS, EVENTS, SELECTORS };
