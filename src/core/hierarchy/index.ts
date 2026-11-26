import type { HierarchyNode } from '@/shared/types';
import { buildShortSelector, buildUniqueSelector, getElementClasses, roundNumber } from '@/shared/utils/css';

function toHierarchyNode(
  element: Element,
  depth: number,
  getStyle: (el: Element) => CSSStyleDeclaration,
  isSelected = false
): HierarchyNode {
  const style = getStyle(element);
  const rect = element.getBoundingClientRect();
  const display = style.display || 'block';

  return {
    id: buildUniqueSelector(element),
    selector: buildShortSelector(element),
    tagName: element.tagName.toLowerCase(),
    idAttr: element.id || undefined,
    classes: getElementClasses(element),
    display,
    isFlex: display === 'flex' || display === 'inline-flex',
    isGrid: display === 'grid' || display === 'inline-grid',
    width: roundNumber(rect.width),
    height: roundNumber(rect.height),
    depth,
    isSelected,
  };
}

export function extractAncestors(
  element: Element,
  getStyle: (el: Element) => CSSStyleDeclaration,
  maxDepth = 8
): HierarchyNode[] {
  const chain: Element[] = [];
  let current: Element | null = element;

  while (current && chain.length < maxDepth) {
    chain.unshift(current);
    if (current.tagName === 'BODY') break;
    current = current.parentElement;
  }

  return chain.map((el, index) => toHierarchyNode(el, index, getStyle, el === element));
}

export function extractDirectChildren(
  element: Element,
  getStyle: (el: Element) => CSSStyleDeclaration,
  maxChildren = 20
): HierarchyNode[] {
  return Array.from(element.children)
    .slice(0, maxChildren)
    .map((child) => toHierarchyNode(child, 1, getStyle, false));
}
