import { A11yAutocomplete, DEFAULT_OPTIONS } from "./index.js";
//#region src/datalist.ts
function normalizedText(value) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function textMatchScore(value, query) {
	const candidate = normalizedText(value);
	const normalizedQuery = normalizedText(query);
	if (!normalizedQuery || candidate === normalizedQuery) return 0;
	if (candidate.startsWith(normalizedQuery)) return 1;
	if (candidate.includes(normalizedQuery)) return 2;
	return Number.POSITIVE_INFINITY;
}
function defaultFilter({ items, query }) {
	return items.map((item, index) => ({
		item,
		index,
		score: Math.min(textMatchScore(item.value, query), textMatchScore(item.label, query))
	})).filter(({ score }) => Number.isFinite(score)).sort((left, right) => left.score - right.score || left.index - right.index).map(({ item }) => item);
}
function defaultRenderOption(item) {
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
function inputSelector(options) {
	return String(options.inputSelector ?? "").trim() || DEFAULT_OPTIONS.inputSelector;
}
function queryInput(root, options) {
	let input;
	try {
		input = root.querySelector(inputSelector(options));
	} catch (error) {
		throw new Error("Datalist autocomplete received an invalid input selector.", { cause: error });
	}
	if (!(input instanceof HTMLInputElement)) throw new Error("Datalist autocomplete markup is missing its configured input element.");
	return input;
}
function queryDatalist(root, selector) {
	if (!selector.trim()) throw new Error("Datalist autocomplete requires a non-empty datalist selector.");
	let datalist;
	try {
		datalist = root.ownerDocument.querySelector(selector);
	} catch (error) {
		throw new Error("Datalist autocomplete received an invalid datalist selector.", { cause: error });
	}
	if (!(datalist instanceof HTMLDataListElement)) throw new Error("Datalist autocomplete could not resolve the configured HTMLDataListElement.");
	return datalist;
}
function snapshotItems(datalist) {
	return Array.from(datalist.options).filter((option) => !option.disabled && option.value !== "").map((option) => ({
		value: option.value,
		label: option.getAttribute("label") ?? option.textContent ?? ""
	}));
}
function prepareDatalist(root, options, current) {
	const input = queryInput(root, options);
	if (current && input !== current.input) throw new Error("Datalist autocomplete cannot refresh after its configured input element is replaced.");
	const datalist = queryDatalist(root, options.datalist);
	const listValue = current?.listValue ?? input.getAttribute("list");
	if (!listValue) throw new Error("Datalist autocomplete requires the input to have a list attribute.");
	const initialAssociationMatches = !current && input.list === datalist;
	const refreshedAssociationMatches = Boolean(current) && datalist.id === listValue && root.ownerDocument.getElementById(listValue) === datalist && (!input.hasAttribute("list") || input.getAttribute("list") === listValue);
	if (!initialAssociationMatches && !refreshedAssociationMatches) throw new Error("Datalist autocomplete requires the input list attribute to reference the configured datalist.");
	return {
		input,
		datalist,
		listValue,
		items: snapshotItems(datalist)
	};
}
function coreOptions(options, items) {
	const { datalist: _datalist, filterItems, renderOption, ...baseOptions } = options;
	const resolvedFilter = filterItems ?? defaultFilter;
	const resolvedRenderer = renderOption ?? defaultRenderOption;
	return {
		...baseOptions,
		items,
		source: null,
		getItemLabel: (item) => item.value,
		getItemValue: (item) => item.value,
		filterItems: (context) => resolvedFilter({
			items: context.items,
			query: context.query,
			instance: context.instance
		}),
		renderOption: (item, context) => resolvedRenderer(item, context)
	};
}
var DatalistAutocomplete = class DatalistAutocomplete extends A11yAutocomplete {
	static datalistInstances = /* @__PURE__ */ new WeakMap();
	datalistOptions;
	prepared;
	pendingPreparation;
	static create(root, options) {
		const existing = DatalistAutocomplete.datalistInstances.get(root);
		if (existing) return existing;
		if (DatalistAutocomplete.getRegisteredInstance(root)) throw new Error("Datalist autocomplete cannot initialize a root that already has a core autocomplete instance.");
		return new DatalistAutocomplete(root, options);
	}
	constructor(root, options) {
		const prepared = prepareDatalist(root, options);
		super(root, coreOptions(options, prepared.items), false);
		this.datalistOptions = { ...options };
		this.prepared = prepared;
		this.pendingPreparation = prepared;
		this.init();
	}
	init() {
		if (this.initialized) return this;
		const prepared = this.pendingPreparation ?? prepareDatalist(this.root, this.datalistOptions);
		this.pendingPreparation = null;
		this.prepared = prepared;
		this.replaceItemsSnapshot(this.prepared.items);
		super.init();
		return this;
	}
	afterInitialize() {
		this.prepared.input.removeAttribute("list");
		DatalistAutocomplete.datalistInstances.set(this.root, this);
	}
	destroy() {
		if (!this.initialized) return;
		DatalistAutocomplete.datalistInstances.delete(this.root);
		super.destroy();
	}
	refresh({ source = "programmatic" } = {}) {
		this.ensureInitialized();
		const prepared = prepareDatalist(this.root, this.datalistOptions, this.prepared);
		this.replaceItemsSnapshot(prepared.items);
		this.prepared = prepared;
		this.prepared.input.removeAttribute("list");
		this.refreshResults({ source });
	}
	setItems() {
		throw new Error("Datalist autocomplete items are authored in the datalist. Update its options and call refresh().");
	}
	getSelectedItem() {
		return super.getSelectedItem();
	}
};
function createDatalistAutocomplete(root, options) {
	return DatalistAutocomplete.create(root, options);
}
//#endregion
export { createDatalistAutocomplete };

//# sourceMappingURL=datalist.js.map