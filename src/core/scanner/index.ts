import {
  DRAWER_HOST_ID,
  MAX_SCAN_ELEMENTS,
  OVERLAY_DATA_ATTR,
  OVERLAY_HOST_ID,
  REFERENCE_HOST_ID,
  SKIPPED_TAGS,
} from '@/shared/constants';

export function isOverlayElement(node: Node | null | undefined): boolean {
  if (!node) return false;
  if (node instanceof ShadowRoot) {
    return (
      node.host?.id === OVERLAY_HOST_ID ||
      node.host?.id === DRAWER_HOST_ID ||
      node.host?.id === REFERENCE_HOST_ID
    );
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const el = node as Element;
  if (el.id === OVERLAY_HOST_ID || el.id === DRAWER_HOST_ID || el.id === REFERENCE_HOST_ID) {
    return true;
  }
  if (typeof el.hasAttribute === 'function' && el.hasAttribute(OVERLAY_DATA_ATTR)) return true;

  const root = el.getRootNode?.();
  if (
    root instanceof ShadowRoot &&
    (root.host?.id === OVERLAY_HOST_ID ||
      root.host?.id === DRAWER_HOST_ID ||
      root.host?.id === REFERENCE_HOST_ID)
  ) {
    return true;
  }
  return Boolean(
    typeof el.closest === 'function' &&
      el.closest(
        `#${OVERLAY_HOST_ID}, #${DRAWER_HOST_ID}, #${REFERENCE_HOST_ID}, [${OVERLAY_DATA_ATTR}]`
      )
  );
}

export function isInspectableElement(node: Node | null | undefined): node is Element {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = node as Element;
  if (isOverlayElement(element)) return false;
  if (SKIPPED_TAGS.has(element.tagName.toUpperCase())) return false;
  if (element === document.documentElement) return false;
  return true;
}

/**
 * Resolves the deepest inspectable element at viewport coordinates (x, y),
 * piercing open Shadow DOM roots while ignoring Framewise's own overlay & drawer hosts.
 */
export function getElementAtPoint(x: number, y: number, doc: Document = document): Element | null {
  const stack = doc.elementsFromPoint(x, y);
  for (const candidate of stack) {
    if (!isInspectableElement(candidate)) continue;
    return pierceOpenShadowRoot(candidate, x, y);
  }
  return null;
}

function pierceOpenShadowRoot(element: Element, x: number, y: number): Element {
  let current: Element = element;
  let guard = 0;

  while (current.shadowRoot && guard < 8) {
    const inner = current.shadowRoot.elementsFromPoint?.(x, y) ?? [];
    const next = inner.find((el) => el !== current && isInspectableElement(el));
    if (!next) break;
    current = next;
    guard++;
  }

  return current;
}

export function isInsideShadowDom(element: Element): boolean {
  return element.getRootNode() instanceof ShadowRoot;
}

/**
 * Traverses visible, rendered elements on the page up to MAX_SCAN_ELEMENTS
 * using a fast TreeWalker (safely traversing open shadow roots encountered).
 */
export function scanVisibleElements(
  root: Document | Element = document,
  maxElements: number = MAX_SCAN_ELEMENTS
): Element[] {
  const results: Element[] = [];
  const startNode = root instanceof Document ? root.body : root;
  if (!startNode) return results;

  const walkSubtree = (container: Node) => {
    if (results.length >= maxElements) return;

    const ownerDoc = container instanceof Document ? container : container.ownerDocument ?? document;
    const walker = ownerDoc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);

    // If container itself is not an Element (e.g. ShadowRoot / DocumentFragment), advance to first Element child
    let node: Node | null =
      container.nodeType === Node.ELEMENT_NODE ? walker.currentNode : walker.nextNode();

    while (node && results.length < maxElements) {
      if (isInspectableElement(node)) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          results.push(node);
        }
        if (
          node.shadowRoot &&
          node.id !== OVERLAY_HOST_ID &&
          node.id !== DRAWER_HOST_ID
        ) {
          walkSubtree(node.shadowRoot);
        }
      }
      node = walker.nextNode();
    }
  };

  walkSubtree(startNode);
  return results;
}
