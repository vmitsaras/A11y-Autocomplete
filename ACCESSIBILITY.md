# Accessibility evidence

A11y Autocomplete is designed around the WAI-ARIA editable combobox pattern. This file records package-level evidence and remaining manual checks; it is not a claim of complete WCAG conformance for every consuming application.

## Automated evidence

- Vitest covers semantic initialization, ARIA state, the generated visual result summary, empty-query focus opening, stopped first/last-option arrow boundaries, keyboard behavior, standalone and externally owned strict validation, duplicate initialization, destroy/reinit, malformed and unnamed options, unlabeled groups, Unicode input, mixed pointer/keyboard selection, grouped result limits, async interruption and ordering, IME composition, callback recovery, form reset, text-safe rendering, validator addon cleanup, tag-input composition, and datalist conversion and lifecycle behavior.
- Playwright exercises the connected input and popup geometry, hint placement, visual and live result-count synchronization, empty-query focus opening, stopped first/last-option arrow boundaries, keyboard selection, two-stage Escape clearing, select-on-blur focus behavior, interrupted async work, form validator summary ownership, datalist enhancement and fallback markup, 320 CSS-pixel reflow with text-spacing overrides, 44px controls, and reduced-motion styling in Chromium, Firefox, and WebKit.
- Axe checks expanded, strict-invalid, empty-focus, form validator summary, enhanced datalist, and every shipped page's initial state in all three browser engines.
- Default token measurements include 5.98:1 for the focus/active indicator against the surface, 4.83:1 for borders, 6.57:1 for errors, and 10.31:1 for muted text. The pale active background is supplemented by the focus-colored inset indicator and is not the sole state cue.

## Expected screen-reader information

The following matrix records state and status behavior verified in the DOM and automated tests. The “Expected information” column describes the information a screen reader should expose, not guaranteed wording or ordering in a specific assistive-technology and browser combination. VoiceOver and NVDA behavior remains pending manual verification in the release matrix below.

| Interaction | Verified DOM and ARIA sequence | Default status text | Expected information | Verification |
|---|---|---|---|---|
| Suggestions expand | Matching results are rendered, an `aria-hidden` visual count is shown outside the listbox, the popup becomes visible, and the input changes to `aria-expanded="true"`. The persistent status contains the same count and DOM focus remains on the input. | Result-count message | The combobox is expanded and suggestions are available. The visual header is excluded from the accessibility tree. | DOM and browser tests; screen reader pending |
| Active option changes | Arrow keys update `aria-activedescendant`; the referenced real option receives `aria-selected="true"`. Navigation stops at the first and last options, and a repeated boundary key leaves the active descendant, selected state, input value, focus, and status unchanged. The visual count is not an option and DOM focus remains on the input. | No additional status update | The active option’s label and selected/position context, as exposed by the browser and screen reader. | DOM and browser tests; screen reader pending |
| Async loading starts | Existing options are removed, the popup closes, the input has `aria-expanded="false"`, and the listbox has `aria-busy="true"`. | `Loading suggestions.` | Loading has started without moving focus. | DOM and browser tests; screen reader pending |
| Results resolve | The listbox returns to `aria-busy="false"`; while the input remains focused, available results open and update the expanded state. | `N suggestions available.` | Loading has completed, the result count, and the expanded combobox state. | DOM and browser tests; screen reader pending |
| An option is selected | The input and optional hidden value are updated, the popup closes, active-descendant state is removed, and focus remains on the input for keyboard/pointer selection. | `<label> selected.` | The selected value and collapsed combobox state. | DOM and browser tests; screen reader pending |
| The value is cleared | The input and optional hidden value are emptied, results and invalid state are reset, and the popup closes. | `Input cleared.` | The field is empty and the combobox is collapsed. | DOM and browser tests; screen reader pending |
| Standalone strict validation fails | The input receives `aria-invalid="true"`; the error is populated and associated through `aria-describedby`. Failed form submission focuses the input. | `Select a value from the suggestions list.` | The field is invalid, the reason for the error, and the field that needs correction. | DOM, browser, and axe tests; screen reader pending |
| Externally owned strict validation fails | Autocomplete does not write validation ARIA or render an error. A11y Form Validator applies `aria-invalid`, associates its inline error, adds one summary link, and follows its configured submit focus policy. | No autocomplete validation announcement | One form error owner exposes the field error and summary without a competing autocomplete message or focus move. | DOM, browser, and axe tests; screen reader pending |
| A datalist is enhanced | The authored `list` association is removed after the custom combobox is ready. The existing status and listbox contract then applies. | No initialization message | The labeled field is a collapsed custom combobox without a second native popup. | DOM and browser tests; screen reader pending |
| Datalist options refresh | The current snapshot is replaced only after `refresh()` succeeds. Focus stays on the input and the existing result count is updated. | Result-count or no-results message | The updated result count and current expanded state without a new live region. | DOM and browser tests; screen reader pending |
| The datalist adapter is destroyed | Custom ARIA state is restored and the exact authored `list` value is reattached without moving focus. | No destroy message | The field returns to its native input and datalist exposure. | DOM and browser tests; screen reader pending |

## Manual release matrix

Record the tester, date, browser/assistive-technology version, and result before publishing.

| Check | Minimum environment | Status |
|---|---|---|
| Accessible name, role, value, expanded state, empty-query focus opening, option movement, selection, loading, empty, error, and clearing announcements | VoiceOver with Safari on macOS | Pending manual verification |
| Same combobox and status sequence, including local and async first-focus result counts announced once, the visual header excluded from option navigation, and active options announced correctly | NVDA with Firefox on Windows | Pending manual verification |
| Native and enhanced datalist name, role, value, option value plus label, selection, empty results, refresh, and destroy sequence | VoiceOver with Safari and NVDA with Firefox | Pending manual verification |
| Form validator summary, summary link focus, corrected selection, and absence of duplicate strict error announcements | VoiceOver with Safari and NVDA with Firefox | Pending manual verification |
| Suggested and custom tag creation, Escape ordering, removal, limits, readonly, disabled, and announcement ownership | VoiceOver with Safari and NVDA with Firefox | Pending manual verification |
| Keyboard-only local, grouped, strict, and async flows | Current stable desktop browsers | Automated; manual smoke check pending |
| 200% and 400% zoom, text spacing, long localized labels, and 320 CSS-pixel reflow | Desktop browser zoom and responsive mode | Automated baseline; manual zoom pending |
| Active, focus, invalid, disabled, loading, and selected states | Windows forced colors | Pending manual verification |
| Touch exploration, swipe navigation, option activation, clearing, dismissal, and scrolling | VoiceOver with Safari on iOS | Pending manual verification |
| Touch exploration, swipe navigation, option activation, clearing, dismissal, and scrolling | TalkBack with Chrome on Android | Pending manual verification |
| Reduced motion | Operating-system reduced-motion preference | Automated style check; manual smoke check pending |
| Multiple instances, injected roots, duplicate initialization, refresh, destroy/reinitialize, listener cleanup, and authored markup restoration | Current stable desktop browser with a dynamic-content integration | Automated baseline; manual integration check pending |

## Manual scenario protocol

Use the examples and browser fixtures to execute the following bounded scenarios. Capture the starting state, exact actions, visible result, focus location, spoken output when applicable, environment, and result.

1. **Keyboard-only:** Exercise local, grouped, async, empty, strict, reset, and disabled states. Down Arrow enters at the first suggestion, Up Arrow enters at the last, repeated boundary keys do not wrap, Enter commits, Escape closes before optional clearing, and Tab follows the page order without trapping focus.
2. **Desktop screen reader:** With VoiceOver/Safari and NVDA/Firefox, verify the input name, combobox role, value, expanded, busy, and invalid states; option and group context; one useful result-count announcement; loading, empty, error, selection, and clearing feedback; and input focus retention.
3. **Adapters and compositions:** Compare the native no-JavaScript datalist with its enhanced, refreshed, and destroyed states. Verify one validation error owner in the form-validator example and coordinated suggestion, custom-tag, Escape, removal, limit, readonly, and disabled behavior in the tag-input example.
4. **Low vision and motor:** At 200% and 400% zoom and with text spacing overrides, verify reflow, long labels, visible focus, 44 CSS-pixel controls, pointer cancellation, and recoverable activation without horizontal page scrolling.
5. **Mobile screen reader:** With VoiceOver/Safari on iOS and TalkBack/Chrome on Android, use touch exploration, swipe navigation, and activation to enter the field, review and choose options, clear the value, dismiss the popup, and scroll without losing context.
6. **Visual preferences:** In Windows forced colors, verify focus, active, invalid, disabled, loading, and selected states. With reduced motion enabled, verify the popup changes state without a transition and without losing visible or semantic feedback.
7. **Developer and CMS lifecycle:** Initialize multiple and dynamically inserted roots, attempt duplicate initialization, refresh data, destroy and reinitialize, and confirm listeners, generated UI, authored attributes, fallback content, and focus are restored as documented.

## Evidence log

### Automated verification

Record the final command results after implementation. Automated browser results describe Chromium, Firefox, and WebKit behavior; they do not establish screen-reader output.

| Date | Runner | Environment | Commands | Result |
|---|---|---|---|---|
| 2026-08-31 | Codex automated run | macOS 26.6.2; Node 24.19.0; npm 11.17.0; Playwright 1.62.1 | `npm run typecheck`, `npm test`, `npm run test:a11y`, `npm run test:e2e`, `npm run build`, `npm run pack:check` | Passed: typecheck; 98 Vitest tests; 15 axe checks; 85 Playwright tests with 2 expected non-Chromium forced-colors skips; build; 30-file package dry run |
| 2026-09-13 | Codex automated release-gate run | macOS; Node 24.19.0; npm 11.17.0; Playwright 1.62.1 | `npm run typecheck`, `npm test`, `npm run test:a11y`, `npm run test:e2e`, `npm run build`, `npm run test:exports`, `npm run pack:check` | Passed: typecheck; 106 Vitest tests; 42 axe-focused Playwright checks; 139 full Playwright tests with 2 expected non-Chromium forced-colors skips; build; export-boundary check; 30-file package dry run |

### Manual assistive-technology evidence

No manual assistive-technology session was executed during the automated release-gate work on 2026-09-13. The pending rows below prevent an “evidence closed” status and must be replaced with actual tester, version, spoken-output, and result records when those environments are available.

| Date | Tester | Environment | Scenario and state | Observed speech or behavior | Result | Finding ID |
|---|---|---|---|---|---|---|
| Not run as of 2026-09-13 | Unassigned | VoiceOver with Safari on macOS | Core, datalist, validator, and tag-input scenarios | Not observed | Pending | — |
| Not run as of 2026-09-13 | Unassigned | NVDA with Firefox on Windows | Core, datalist, validator, and tag-input scenarios | Not observed | Pending | — |
| Not run as of 2026-09-13 | Unassigned | VoiceOver with Safari on iOS | Core touch and mobile-screen-reader scenario | Not observed | Pending | — |
| Not run as of 2026-09-13 | Unassigned | TalkBack with Chrome on Android | Core touch and mobile-screen-reader scenario | Not observed | Pending | — |

## Integration responsibilities and known limitations

- Authors must provide a meaningful visible label or another valid accessible name for the input.
- Put optional help text immediately after the label, associate it with `aria-describedby`, nest the popup inside the control for the connected presentation, and keep the persistent status outside the popup. Legacy popup placement remains behaviorally supported but does not receive the fully connected geometry.
- The generated `data-autocomplete-results-summary` element is a visual duplicate of the result count. It is `aria-hidden`, sits outside the listbox, is never referenced by `aria-activedescendant`, and is removed during teardown. The persistent polite status remains the sole announcement source for result counts.
- The optional `a11y-autocomplete/diagnostics` scan can identify a conservative set of common integration mistakes without changing DOM, focus, announcements, or runtime state. It runs only when called and installs no observers or polling.
- Diagnostics inspect current light-DOM markup rather than the computed accessibility tree. They do not enter closed shadow roots or iframes, account for CSS visibility, predict assistive-technology output, validate a consuming theme, or prove WCAG conformance.
- The package verifies its default colors, not custom properties overridden by a consuming brand theme.
- `autoComplete: "none"` keeps local items query-independent. A custom async source must honor the same semantic contract.
- `openOnFocus: true` does not bypass `minLength`. When paired with `minLength: 0`, focusing the field before typing may call an async source with `query: ""`; apply the same authorization, privacy, request-rate and volume, cancellation, and result-content policies as any other request.
- `renderOption` supports presentational content only. Interactive descendants inside a listbox option are rejected.
- Items with empty trimmed labels are omitted, empty groups are omitted, and children of an unlabeled group are exposed as ordinary ungrouped options so every rendered option has usable text and no empty group label is referenced.
- Native datalist presentation and announcements vary across browser and assistive-technology combinations. The adapter preserves the authored fallback but does not make both paths sound or look identical.
- The datalist adapter preserves every eligible authored suggestion, including duplicate values. Authors should manually review repeated option names for useful context.
- External validation mode requires one validator to own strict errors, validation ARIA, summary updates, and invalid submit focus. Do not combine it with a second custom error renderer for the same field.
- The form validator addon requires A11y Form Validator as an optional peer dependency. Destroy the validator before its mapped autocomplete instances so the addon can remove its listeners and rule.
- Remote sources remain responsible for authorization, privacy, suitable result content, and service-level retry policy.
- The component does not provide inline completion, a remote data service, a required-field policy, or validation for an application’s broader form flow.
- Automated axe results cannot prove keyboard usability, announcement quality, zoom behavior, or complete WCAG conformance.
