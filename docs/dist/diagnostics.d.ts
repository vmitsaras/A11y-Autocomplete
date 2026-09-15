import { A11yAutocompleteOptions } from "./index.js";
//#region src/diagnostics.d.ts
type DiagnosticSelectorOptions = Pick<A11yAutocompleteOptions, "inputSelector" | "listSelector" | "popupSelector" | "statusSelector" | "clearSelector">;
interface AutocompleteDiagnosticOptions extends DiagnosticSelectorOptions {
  log?: boolean;
  inspectRenderedOptions?: boolean;
}
type AutocompleteDiagnosticIssueCode = "input-accessible-name-missing" | "input-type-unsupported" | "duplicate-id" | "id-reference-broken" | "clear-control-not-button" | "clear-control-type-invalid" | "clear-control-name-missing" | "status-region-misplaced" | "option-descendant-focusable" | "initialized-root-conflict";
interface AutocompleteDiagnosticIssue {
  code: AutocompleteDiagnosticIssueCode;
  message: string;
  elements: readonly Element[];
}
declare function diagnoseAutocomplete(root: HTMLElement, options?: AutocompleteDiagnosticOptions): AutocompleteDiagnosticIssue[];
//#endregion
export { AutocompleteDiagnosticIssue, AutocompleteDiagnosticIssueCode, AutocompleteDiagnosticOptions, diagnoseAutocomplete };
//# sourceMappingURL=diagnostics.d.ts.map