import type { ResumeDiffModel } from "./proposal";

const INLINE_ATTR = "data-resume-diff-inline";
const BLOCK_ATTR = "data-resume-diff-block";
const PAGE_ATTR = "data-resume-diff-page";

const unwrapInlineHighlights = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>(`span[${INLINE_ATTR}]`).forEach((element) => {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
  });
};

const clearElementAttributes = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}]`).forEach((element) => {
    element.removeAttribute(BLOCK_ATTR);
    element.classList.remove("resume-diff-block");
  });

  root.querySelectorAll<HTMLElement>(`[${PAGE_ATTR}]`).forEach((element) => {
    element.removeAttribute(PAGE_ATTR);
    element.classList.remove("resume-diff-page");
  });
};

const wrapTextMatch = (textNode: Text, value: string) => {
  const content = textNode.textContent ?? "";
  const index = content.indexOf(value);
  if (index === -1 || value.length === 0) {
    return false;
  }

  const match = textNode.splitText(index);
  match.splitText(value.length);

  const wrapper = document.createElement("span");
  wrapper.setAttribute(INLINE_ATTR, "true");
  wrapper.className = "resume-diff-inline";
  wrapper.textContent = value;
  match.parentNode?.replaceChild(wrapper, match);

  return true;
};

const highlightChangedBasics = (root: HTMLElement, values: string[]) => {
  if (values.length === 0) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".resume-diff-block")) return NodeFilter.FILTER_REJECT;
      if ((node.textContent ?? "").trim().length === 0) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const pending = [...values].sort((left, right) => right.length - left.length);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const value of pending) {
    for (const textNode of textNodes) {
      if (wrapTextMatch(textNode, value)) {
        break;
      }
    }
  }
};

const markBlock = (element: HTMLElement | null) => {
  if (!element) return;
  element.setAttribute(BLOCK_ATTR, "true");
  element.classList.add("resume-diff-block");
};

export const clearResumeDiffAnnotations = (root: HTMLElement | null) => {
  if (!root) return;
  unwrapInlineHighlights(root);
  clearElementAttributes(root);
};

export const applyResumeDiffAnnotations = (
  root: HTMLElement | null,
  model: ResumeDiffModel,
) => {
  if (!root) return;

  clearResumeDiffAnnotations(root);

  if (model.hasMetadataChanges) {
    root.querySelectorAll<HTMLElement>(".page").forEach((page) => {
      page.setAttribute(PAGE_ATTR, "changed");
      page.classList.add("resume-diff-page");
    });
  }

  for (const sectionId of model.changedSectionIds) {
    markBlock(root.querySelector<HTMLElement>(`section#${CSS.escape(sectionId)}`));
  }

  for (const itemId of model.changedItemIds) {
    markBlock(root.querySelector<HTMLElement>(`[data-resume-item-id="${CSS.escape(itemId)}"]`));
  }

  highlightChangedBasics(root, model.changedBasicValues);
};
