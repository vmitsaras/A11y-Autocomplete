import { createAutocomplete } from "../index.js";
import { A11yTagInput, createTagInput } from "a11y-tag-input";
//#region src/addons/tag-input.ts
const FIELD_ATTRIBUTE = "data-autocomplete-tag-input-field";
const POPUP_ATTRIBUTE = "data-autocomplete-tag-input-popup";
const LIST_ATTRIBUTE = "data-autocomplete-tag-input-list";
const STATUS_ATTRIBUTE = "data-autocomplete-tag-input-status";
const DEFAULT_INSTRUCTIONS = "Type to filter suggestions. Use Arrow Down and Arrow Up to review them. Press Enter to add the active suggestion, or press Enter with no active suggestion to add your text. Press Escape to close suggestions; when suggestions are closed, Escape clears your text. From an empty field, use Backspace to move to the last tag.";
const instances = /* @__PURE__ */ new WeakMap();
function defaultToTag(item) {
	return typeof item === "string" ? item : item.label;
}
function createIntegrationMarkup(document) {
	const popup = document.createElement("div");
	popup.className = "a11y-autocomplete__popup";
	popup.hidden = true;
	popup.setAttribute(POPUP_ATTRIBUTE, "");
	const list = document.createElement("ul");
	list.className = "a11y-autocomplete__list";
	list.setAttribute(LIST_ATTRIBUTE, "");
	popup.append(list);
	const status = document.createElement("p");
	status.className = "a11y-autocomplete__status";
	status.setAttribute(STATUS_ATTRIBUTE, "");
	return {
		popup,
		list,
		status
	};
}
function createAutocompleteTagInput(source, options = {}) {
	const existing = instances.get(source);
	if (existing) return existing;
	if (!(source instanceof HTMLInputElement) && !(source instanceof HTMLTextAreaElement)) throw new TypeError("The autocomplete tag input addon requires an input or textarea source element.");
	if (A11yTagInput.getInstance(source)) throw new Error("The autocomplete tag input addon must initialize the tag input so it can coordinate keyboard behavior and cleanup.");
	let suppressDraftCommit = false;
	const consumerBeforeAdd = options.tagInput?.hooks?.beforeAdd;
	const tagInputOptions = {
		...options.tagInput,
		messages: {
			instructions: DEFAULT_INSTRUCTIONS,
			...options.tagInput?.messages
		},
		hooks: {
			...options.tagInput?.hooks,
			beforeAdd(value, context) {
				if (suppressDraftCommit) {
					suppressDraftCommit = false;
					return false;
				}
				return consumerBeforeAdd?.(value, context);
			}
		}
	};
	const tagInput = createTagInput(source, tagInputOptions);
	const { root, control, field } = tagInput;
	if (root.dataset.a11yAutocompleteInitialized === "true") {
		tagInput.destroy();
		throw new Error("The autocomplete tag input root already has an autocomplete instance.");
	}
	const removeUnsupportedGroupReadonly = () => {
		control.removeAttribute("aria-readonly");
	};
	const disableTagInput = tagInput.disable.bind(tagInput);
	const enableTagInput = tagInput.enable.bind(tagInput);
	const setTagInputReadonly = tagInput.readonly.bind(tagInput);
	tagInput.disable = () => {
		disableTagInput();
		removeUnsupportedGroupReadonly();
	};
	tagInput.enable = () => {
		enableTagInput();
		removeUnsupportedGroupReadonly();
	};
	tagInput.readonly = (value) => {
		setTagInputReadonly(value);
		removeUnsupportedGroupReadonly();
	};
	removeUnsupportedGroupReadonly();
	const hadAutocompleteClass = root.classList.contains("a11y-autocomplete");
	const hadControlClass = control.classList.contains("a11y-autocomplete__control");
	const hadFieldAttribute = field.hasAttribute(FIELD_ATTRIBUTE);
	const { popup, list, status } = createIntegrationMarkup(source.ownerDocument);
	root.classList.add("a11y-autocomplete");
	control.classList.add("a11y-autocomplete__control");
	field.setAttribute(FIELD_ATTRIBUTE, "");
	control.append(popup);
	root.append(status);
	let autocomplete;
	const canAcceptTag = () => {
		if (tagInput.state.isDisabled || tagInput.state.isReadonly) return false;
		const maximum = tagInput.options.maxTags;
		return !Number.isFinite(maximum) || tagInput.getTags().length < maximum;
	};
	try {
		autocomplete = createAutocomplete(root, {
			...options.autocomplete,
			inputSelector: `[${FIELD_ATTRIBUTE}]`,
			popupSelector: `[${POPUP_ATTRIBUTE}]`,
			listSelector: `[${LIST_ATTRIBUTE}]`,
			statusSelector: `[${STATUS_ATTRIBUTE}]`,
			clearSelector: "[data-autocomplete-tag-input-clear]",
			hiddenValueSelector: "[data-autocomplete-tag-input-hidden-value]",
			strict: false,
			validationMode: "external",
			selectOnBlur: false,
			clearOnEscape: false,
			messages: {
				...options.autocomplete?.messages,
				selected: ""
			}
		});
	} catch (error) {
		popup.remove();
		status.remove();
		if (!hadFieldAttribute) field.removeAttribute(FIELD_ATTRIBUTE);
		if (!hadControlClass) control.classList.remove("a11y-autocomplete__control");
		if (!hadAutocompleteClass) root.classList.remove("a11y-autocomplete");
		tagInput.destroy();
		throw error;
	}
	const toTag = options.toTag ?? defaultToTag;
	const handleAutocompleteSelect = (event) => {
		const item = event.detail?.item;
		if (item === null || item === void 0) return;
		const value = toTag(item, {
			autocomplete,
			tagInput
		});
		tagInput.addTag(value);
	};
	const handleTagAdd = () => {
		autocomplete.clear({
			announce: false,
			source: "programmatic"
		});
	};
	const handleAutocompleteResults = () => {
		if (!canAcceptTag()) autocomplete.clear({
			announce: false,
			source: "programmatic"
		});
	};
	const handleFocusCapture = (event) => {
		if (event.target !== field) return;
		if (canAcceptTag()) return;
		event.stopImmediatePropagation();
		tagInput.focus();
		autocomplete.clear({
			announce: false,
			source: "programmatic"
		});
	};
	const handleKeydownCapture = (event) => {
		if (event.target !== field) return;
		if (event.isComposing || event.keyCode === 229) return;
		if (event.key === "Escape" && field.getAttribute("aria-expanded") === "true") {
			event.preventDefault();
			event.stopImmediatePropagation();
			autocomplete.close();
			return;
		}
		if (!canAcceptTag() && (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp")) {
			event.preventDefault();
			event.stopImmediatePropagation();
			autocomplete.close({ silent: true });
			return;
		}
		if (event.key === "Enter" && field.hasAttribute("aria-activedescendant")) {
			suppressDraftCommit = true;
			source.ownerDocument.defaultView?.setTimeout(() => {
				suppressDraftCommit = false;
			}, 0);
			return;
		}
	};
	root.addEventListener("a11y-autocomplete:select", handleAutocompleteSelect);
	root.addEventListener("a11y-autocomplete:results", handleAutocompleteResults);
	source.addEventListener("a11y-tag-input:add", handleTagAdd);
	source.addEventListener("a11y-tag-input:render", removeUnsupportedGroupReadonly);
	root.addEventListener("focus", handleFocusCapture, { capture: true });
	root.addEventListener("keydown", handleKeydownCapture, { capture: true });
	let destroyed = false;
	const instance = {
		source,
		root,
		autocomplete,
		tagInput,
		destroy() {
			if (destroyed) return;
			root.removeEventListener("a11y-autocomplete:select", handleAutocompleteSelect);
			root.removeEventListener("a11y-autocomplete:results", handleAutocompleteResults);
			source.removeEventListener("a11y-tag-input:add", handleTagAdd);
			source.removeEventListener("a11y-tag-input:render", removeUnsupportedGroupReadonly);
			root.removeEventListener("focus", handleFocusCapture, { capture: true });
			root.removeEventListener("keydown", handleKeydownCapture, { capture: true });
			autocomplete.destroy();
			popup.remove();
			status.remove();
			if (!hadFieldAttribute) field.removeAttribute(FIELD_ATTRIBUTE);
			if (!hadControlClass) control.classList.remove("a11y-autocomplete__control");
			if (!hadAutocompleteClass) root.classList.remove("a11y-autocomplete");
			tagInput.destroy();
			instances.delete(source);
			destroyed = true;
		}
	};
	instances.set(source, instance);
	return instance;
}
//#endregion
export { createAutocompleteTagInput, createAutocompleteTagInput as default };

//# sourceMappingURL=tag-input.js.map