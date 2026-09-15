# Async destination search

A real-world autocomplete example that waits for someone to start typing, fetches a local JSON response, and exposes loading, cancellation, no-results, failure, and retry states.

## What this example shows

- An async `source({ query, signal })` that forwards the plugin-owned `AbortSignal` to a delay and `fetch()`.
- `minLength: 1`, so focusing an empty field stays idle and the first typed character starts loading.
- A zero-request initial state: data is not fetched during page initialization.
- Deterministic error and retry controls without an API key or third-party dependency.
- Object items whose visible labels and submitted airport codes remain distinct.
- A text input plus the authored clear button, avoiding the browser-native search × and duplicate clear controls.

## How to run

Build the package first:

```bash
npm run build
```

Then serve the repository root rather than opening the file directly, because browsers do not reliably allow `fetch()` from `file:` URLs:

```bash
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/examples/async-data/>.

## What to try

- Focus the empty field and confirm the request count remains zero with no suggestions shown.
- Type `ber`, `greece`, or `lhr` to start the first request.
- Type quickly and confirm stale requests are canceled before results appear.
- Use “Fail the next request,” then retry and confirm focus returns to the input.
- Type `zzzz` to expose the no-results message.

## Accessibility notes

- A native labeled search field is usable before enhancement; JavaScript adds the editable combobox behavior.
- Loading, result counts, no results, errors, selection, and clearing share one polite status region.
- DOM focus stays on the input while arrow keys update `aria-activedescendant`; Enter chooses the active option.
- The list exposes `aria-busy` during async work, and retry visibly returns focus to the field.
- Demo and package styles preserve visible focus, narrow reflow, forced colors, and reduced-motion preferences.
- A production endpoint still owns authorization, privacy, query limits, localized messages, and safe result content.

## Adapting this to an application API

Replace the local `fetch("./destinations.json", { signal })` call with an application-owned endpoint and encode the query:

```js
const url = new URL("/api/destinations", window.location.origin);
url.searchParams.set("query", query);
const response = await fetch(url, { signal });
```

Return a small, already filtered JSON array shaped like `{ "label": "Berlin Brandenburg — Germany", "value": "BER" }`. Do not embed secrets in browser code; apply authorization, throttling, validation, and privacy controls on the server.

## Developer notes

- Root selector: `[data-a11y-autocomplete]`.
- Child selectors: `[data-autocomplete-input]`, `[data-autocomplete-popup]`, `[data-autocomplete-list]`, `[data-autocomplete-status]`, `[data-autocomplete-clear]`, and `[data-autocomplete-hidden-value]`.
- Imports: `../../dist/index.js` and `../../dist/styles.css`.
- Options: `source`, `minLength: 1`, `debounceDelay: 300`, `maxResults: 6`, `clearOnEscape: true`, `clearLabel: "Clear destination"`, and custom async messages.
- The artificial 650 ms delay exists only to make the loading and cancellation states easy to inspect.

## Files

- `index.html`
- `styles.css`
- `destinations.json`
