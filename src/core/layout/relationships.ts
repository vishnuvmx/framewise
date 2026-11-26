import type { LayoutRelationship } from '@/shared/types';
import {
  buildShortSelector,
  buildUniqueSelector,
  formatPx,
  parsePx,
  roundNumber,
} from '@/shared/utils/css';

function humanize(value: string): string {
  return value.replace(/-/g, ' ');
}

/**
 * Explains WHY an element occupies its current position and dimensions
 * by tracing its positioning context, immediate Flex/Grid parent, width-constraining
 * ancestor, overflow clipping boundary, and sibling order.
 */
export function extractLayoutRelationships(
  element: Element,
  getStyle: (el: Element) => CSSStyleDeclaration
): LayoutRelationship[] {
  const results: LayoutRelationship[] = [];
  const style = getStyle(element);
  const selfSelector = buildUniqueSelector(element);
  const parent = element.parentElement;
  const parentStyle = parent ? getStyle(parent) : null;

  // 1. Self positioning / Flex or Grid item behavior
  if (style.position && style.position !== 'static') {
    const offsets = [
      style.top !== 'auto' ? `top ${style.top}` : '',
      style.right !== 'auto' ? `right ${style.right}` : '',
      style.bottom !== 'auto' ? `bottom ${style.bottom}` : '',
      style.left !== 'auto' ? `left ${style.left}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    results.push({
      role: 'self',
      summary: `Positioned ${style.position}`,
      detail: offsets || (style.zIndex !== 'auto' ? `z-index ${style.zIndex}` : 'Out of normal flow'),
      selector: selfSelector,
    });
  }

  // 2. Immediate parent layout container
  if (parent && parentStyle) {
    const pd = parentStyle.display;
    const parentShort = buildShortSelector(parent);
    const parentUnique = buildUniqueSelector(parent);

    if (pd === 'flex' || pd === 'inline-flex') {
      const dir = parentStyle.flexDirection || 'row';
      const gap = parsePx(parentStyle.rowGap) || parsePx(parentStyle.columnGap);
      const flexItemNotes: string[] = [];
      if (style.flexGrow && style.flexGrow !== '0') flexItemNotes.push(`grow ${style.flexGrow}`);
      if (style.flexShrink === '0') flexItemNotes.push('no-shrink');

      const parts = [
        dir.startsWith('column') ? 'Column flex' : 'Row flex',
        gap > 0 ? `gap ${formatPx(gap)}` : '',
        parentStyle.alignItems && parentStyle.alignItems !== 'normal'
          ? `align ${humanize(parentStyle.alignItems)}`
          : '',
        parentStyle.justifyContent && parentStyle.justifyContent !== 'normal'
          ? `justify ${humanize(parentStyle.justifyContent)}`
          : '',
        ...flexItemNotes,
      ].filter(Boolean);

      results.push({
        role: 'parent',
        summary: `Placed by ${parentShort}`,
        detail: parts.join(' · '),
        selector: parentUnique,
      });
    } else if (pd === 'grid' || pd === 'inline-grid') {
      const cols = (parentStyle.gridTemplateColumns || '')
        .trim()
        .split(/\s+/)
        .filter((t) => Number.isFinite(Number.parseFloat(t))).length;
      const gap = parsePx(parentStyle.columnGap) || parsePx(parentStyle.rowGap);
      const colSpan = style.gridColumn && style.gridColumn !== 'auto' ? ` · col ${style.gridColumn}` : '';

      results.push({
        role: 'parent',
        summary: `Placed in ${parentShort}`,
        detail: `${cols > 0 ? `${cols}-column grid` : 'CSS Grid'}${gap > 0 ? ` · gap ${formatPx(gap)}` : ''}${colSpan}`,
        selector: parentUnique,
      });
    }

    // Sibling index context
    const siblingCount = parent.children.length;
    if (siblingCount > 1) {
      const idx = Array.from(parent.children).indexOf(element) + 1;
      results.push({
        role: 'siblings',
        summary: `Child ${idx} of ${siblingCount}`,
        detail: `Inside ${parentShort}`,
        selector: parentUnique,
      });
    }
  }

  // 3. Nearest width-constraining ancestor, containing block (for absolute), and overflow boundary
  let ancestor = parent;
  let foundContainer = false;
  let foundContainingBlock = style.position !== 'absolute';
  let foundOverflow = false;
  let depth = 0;

  while (ancestor && ancestor.tagName !== 'HTML' && depth < 10) {
    const aStyle = getStyle(ancestor);
    const aShort = buildShortSelector(ancestor);
    const aUnique = buildUniqueSelector(ancestor);

    if (
      !foundContainingBlock &&
      ((aStyle.position && aStyle.position !== 'static') ||
        (aStyle.transform && aStyle.transform !== 'none'))
    ) {
      results.push({
        role: 'container',
        summary: `Anchored to ${aShort}`,
        detail:
          aStyle.transform && aStyle.transform !== 'none'
            ? 'Containing block via transform'
            : `Containing block (${aStyle.position})`,
        selector: aUnique,
      });
      foundContainingBlock = true;
    }

    if (!foundContainer) {
      const maxW = aStyle.maxWidth;
      const maxWPx = parsePx(maxW);
      if (maxW && maxW !== 'none' && maxW !== '100%' && maxWPx >= 200) {
        const ml = parsePx(aStyle.marginLeft);
        const mr = parsePx(aStyle.marginRight);
        const centered = ml > 8 && Math.abs(ml - mr) <= 4;
        results.push({
          role: 'container',
          summary: `Constrained by ${aShort}`,
          detail: `max-width ${formatPx(roundNumber(maxWPx))}${centered ? ' · centered' : ''}`,
          selector: aUnique,
        });
        foundContainer = true;
      }
    }

    if (
      !foundOverflow &&
      (aStyle.overflow === 'hidden' ||
        aStyle.overflow === 'clip' ||
        aStyle.overflowX === 'auto' ||
        aStyle.overflowY === 'auto' ||
        aStyle.overflowY === 'scroll')
    ) {
      results.push({
        role: 'overflow',
        summary: `Overflow boundary on ${aShort}`,
        detail: `overflow: ${aStyle.overflow}`,
        selector: aUnique,
      });
      foundOverflow = true;
    }

    if (foundContainer && foundContainingBlock && foundOverflow) break;
    ancestor = ancestor.parentElement;
    depth++;
  }

  return results;
}
