import { ATTRIBUTES, DEFAULT_OPTIONS, SELECTORS } from "./index.js";
import type { A11yAutocompleteOptions } from "./index.js";

type DiagnosticSelectorOptions = Pick<
  A11yAutocompleteOptions,
  "inputSelector" | "listSelector" | "popupSelector" | "statusSelector" | "clearSelector"
>;

export interface AutocompleteDiagnosticOptions extends DiagnosticSelectorOptions {
  log?: boolean;
  inspectRenderedOptions?: boolean;
}

export type AutocompleteDiagnosticIssueCode =
  | "input-accessible-name-missing"
  | "input-type-unsupported"
  | "duplicate-id"
  | "id-reference-broken"
  | "clear-control-not-button"
  | "clear-control-type-invalid"
  | "clear-control-name-missing"
  | "status-region-misplaced"
  | "option-descendant-focusable"
  | "initialized-root-conflict";

export interface AutocompleteDiagnosticIssue {
  code: AutocompleteDiagnosticIssueCode;
  message: string;
  elements: readonly Element[];
}

interface NormalizedDiagnosticOptions {
  inputSelector: string;
  listSelector: string;
  popupSelector: string;
  statusSelector: string;
  clearSelector: string;
  log: boolean;
  inspectRenderedOptions: boolean;
}

interface IdReference {
  attribute: string;
  element: Element;
  id: string;
}

const ID_REFERENCE_ATTRIBUTES = Object.freeze([
  "for",
  "list",
  "form",
  "headers",
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns"
]);

function normalizedSelector(value: string | undefined, fallback: string): string {
  return String(value ?? "").trim() || fallback;
}

function normalizeOptions(options: AutocompleteDiagnosticOptions): NormalizedDiagnosticOptions {
  return {
    inputSelector: normalizedSelector(options.inputSelector, DEFAULT_OPTIONS.inputSelector),
    listSelector: normalizedSelector(options.listSelector, DEFAULT_OPTIONS.listSelector),
    popupSelector: normalizedSelector(options.popupSelector, DEFAULT_OPTIONS.popupSelector),
    statusSelector: normalizedSelector(options.statusSelector, DEFAULT_OPTIONS.statusSelector),
    clearSelector: normalizedSelector(options.clearSelector, DEFAULT_OPTIONS.clearSelector),
    log: options.log === true,
    inspectRenderedOptions: options.inspectRenderedOptions === true
  };
}

function scopeElements(root: HTMLElement): Element[] {
  return [root, ...root.querySelectorAll("*")];
}

function idIndex(root: HTMLElement, elements: Element[]): Map<string, Element[]> {
  const index = new Map<string, Element[]>();
  const seen = new Set<Element>();
  const add = (element: Element) => {
    if (seen.has(element) || !element.id) return;
    seen.add(element);
    const matches = index.get(element.id) ?? [];
    matches.push(element);
    index.set(element.id, matches);
  };

  for (const element of root.ownerDocument.querySelectorAll("[id]")) add(element);
  for (const element of elements) add(element);
  return index;
}

function idReferences(elements: Element[]): IdReference[] {
  const references: IdReference[] = [];
  for (const element of elements) {
    for (const attribute of ID_REFERENCE_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const ids = new Set((element.getAttribute(attribute) ?? "").trim().split(/\s+/).filter(Boolean));
      for (const id of ids) references.push({ attribute, element, id });
    }
  }
  return references;
}

function normalizedText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasValidLabelledBy(element: Element, ids: Map<string, Element[]>): boolean {
  const references = (element.getAttribute("aria-labelledby") ?? "").trim().split(/\s+/).filter(Boolean);
  if (!references.length) return false;

  const labels = references.map((id) => ids.get(id) ?? []);
  return labels.every((matches) => matches.length === 1)
    && normalizedText(labels.map(([match]) => match?.textContent ?? "").join(" ")).length > 0;
}

function hasExplicitInputName(input: HTMLInputElement, ids: Map<string, Element[]>): boolean {
  if (normalizedText(input.getAttribute("aria-label"))) return true;
  if (hasValidLabelledBy(input, ids)) return true;
  return Array.from(input.labels ?? []).some((label) => normalizedText(label.textContent).length > 0);
}

function hasExplicitButtonName(button: HTMLButtonElement, ids: Map<string, Element[]>): boolean {
  return normalizedText(button.getAttribute("aria-label")).length > 0
    || hasValidLabelledBy(button, ids)
    || normalizedText(button.textContent).length > 0;
}

function isHtmlInput(element: Element | null): element is HTMLInputElement {
  return element?.namespaceURI === "http://www.w3.org/1999/xhtml" && element.localName === "input";
}

function isHtmlButton(element: Element | null): element is HTMLButtonElement {
  return element?.namespaceURI === "http://www.w3.org/1999/xhtml" && element.localName === "button";
}

function isInsideHiddenOrInert(element: Element, option: Element): boolean {
  let current: Element | null = element;
  while (current && current !== option) {
    if (current.hasAttribute("hidden") || current.hasAttribute("inert")) return true;
    current = current.parentElement;
  }
  return option.hasAttribute("hidden") || option.hasAttribute("inert");
}

function isDisabledControl(element: Element): boolean {
  if (!element.matches("button, input, select, textarea, option, optgroup, fieldset")) return false;
  try {
    return element.matches(":disabled");
  } catch {
    return element.hasAttribute("disabled");
  }
}

function isPotentialFocusTarget(element: Element, option: Element): boolean {
  if (isInsideHiddenOrInert(element, option) || isDisabledControl(element)) return false;

  if (element.hasAttribute("tabindex")) {
    const tabIndex = Number(element.getAttribute("tabindex"));
    return Number.isFinite(tabIndex) && tabIndex >= 0;
  }

  if (element.matches("a[href], area[href], button, select, textarea, iframe, object, embed, summary")) return true;
  if (element.matches("input:not([type='hidden']), audio[controls], video[controls]")) return true;
  const editable = element.getAttribute("contenteditable");
  return editable === "" || editable === "true" || editable === "plaintext-only";
}

function uniqueElements(elements: Iterable<Element>): Element[] {
  return Array.from(new Set(elements));
}

function nearestStatusContainer(
  status: Element,
  root: HTMLElement,
  list: Element | null,
  popup: Element | null
): Element | null {
  if (list?.contains(status)) return list;
  if (popup?.contains(status)) return popup;
  const container = status.closest("[role='listbox'], [role='group'], [role='option'], [data-autocomplete-option]");
  return container && root.contains(container) ? container : null;
}

function initializedRootsNear(root: HTMLElement): Element[] {
  const selector = `[${ATTRIBUTES.initialized}]`;
  const candidates = new Set<Element>(root.ownerDocument.querySelectorAll(selector));
  if (root.matches(selector)) candidates.add(root);
  for (const element of root.querySelectorAll(selector)) candidates.add(element);
  return Array.from(candidates).filter((element) => (
    element === root || root.contains(element) || element.contains(root)
  ));
}

export function diagnoseAutocomplete(
  root: HTMLElement,
  options: AutocompleteDiagnosticOptions = {}
): AutocompleteDiagnosticIssue[] {
  if (!root || root.nodeType !== 1 || root.namespaceURI !== "http://www.w3.org/1999/xhtml") {
    throw new TypeError("diagnoseAutocomplete requires an HTMLElement root.");
  }

  const normalized = normalizeOptions(options);
  const elements = scopeElements(root);
  const ids = idIndex(root, elements);
  const references = idReferences(elements);
  const issues: AutocompleteDiagnosticIssue[] = [];

  const input = root.querySelector(normalized.inputSelector);
  if (isHtmlInput(input) && (input.type === "text" || input.type === "search")) {
    if (!hasExplicitInputName(input, ids)) {
      issues.push({
        code: "input-accessible-name-missing",
        message: "The autocomplete input needs an explicit accessible name from a label, aria-label, or valid aria-labelledby references.",
        elements: [input]
      });
    }
  } else {
    issues.push({
      code: "input-type-unsupported",
      message: "The configured input selector must resolve to an input with type text or search.",
      elements: input ? [input] : [root]
    });
  }

  const relevantIds = new Set([
    ...elements.map((element) => element.id).filter(Boolean),
    ...references.map(({ id }) => id)
  ]);
  for (const [id, matches] of ids) {
    if (relevantIds.has(id) && matches.length > 1) {
      issues.push({
        code: "duplicate-id",
        message: `The id "${id}" is used by ${matches.length} elements and cannot be referenced unambiguously.`,
        elements: matches
      });
    }
  }

  for (const reference of references) {
    if (!ids.has(reference.id)) {
      issues.push({
        code: "id-reference-broken",
        message: `The ${reference.attribute} reference "${reference.id}" does not match an element in this document.`,
        elements: [reference.element]
      });
    }
  }

  const clear = root.querySelector(normalized.clearSelector);
  if (clear && !isHtmlButton(clear)) {
    issues.push({
      code: "clear-control-not-button",
      message: "The autocomplete clear control must be a button element.",
      elements: [clear]
    });
  } else if (isHtmlButton(clear)) {
    if (clear.type !== "button") {
      issues.push({
        code: "clear-control-type-invalid",
        message: "The autocomplete clear button must use type=\"button\" to avoid submitting or resetting a form.",
        elements: [clear]
      });
    }
    if (!hasExplicitButtonName(clear, ids)) {
      issues.push({
        code: "clear-control-name-missing",
        message: "The autocomplete clear button needs visible text, aria-label, or valid aria-labelledby references.",
        elements: [clear]
      });
    }
  }

  const list = root.querySelector(normalized.listSelector);
  const popup = root.querySelector(normalized.popupSelector);
  const statusCandidates = uniqueElements([
    ...root.querySelectorAll(normalized.statusSelector),
    ...root.querySelectorAll("[role='status'], [role='alert'], [aria-live]:not([aria-live='off'])")
  ]);
  for (const status of statusCandidates) {
    const container = nearestStatusContainer(status, root, list, popup);
    if (container) {
      issues.push({
        code: "status-region-misplaced",
        message: "Status and live regions must be outside the autocomplete popup, listbox, groups, and options.",
        elements: uniqueElements([status, container])
      });
    }
  }

  if (normalized.inspectRenderedOptions) {
    const renderedOptions = uniqueElements(root.querySelectorAll(`${SELECTORS.option}, [role='option']`));
    for (const option of renderedOptions) {
      const focusTargets = Array.from(option.querySelectorAll("*")).filter((element) => isPotentialFocusTarget(element, option));
      if (focusTargets.length) {
        issues.push({
          code: "option-descendant-focusable",
          message: "Rendered autocomplete options must not contain focusable descendants.",
          elements: [option, ...focusTargets]
        });
      }
    }
  }

  const initializedRoots = initializedRootsNear(root);
  for (let index = 0; index < initializedRoots.length; index += 1) {
    for (let comparison = index + 1; comparison < initializedRoots.length; comparison += 1) {
      const first = initializedRoots[index];
      const second = initializedRoots[comparison];
      const ancestor = first.contains(second) ? first : second.contains(first) ? second : null;
      if (!ancestor) continue;
      const descendant = ancestor === first ? second : first;
      issues.push({
        code: "initialized-root-conflict",
        message: "Initialized autocomplete roots must not be nested because their ownership boundaries overlap.",
        elements: [ancestor, descendant]
      });
    }
  }

  if (normalized.log && issues.length) {
    console.warn(`[a11y-autocomplete] Integration diagnostics found ${issues.length} issue${issues.length === 1 ? "" : "s"}.`, issues);
  }
  return issues;
}
