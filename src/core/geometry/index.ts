import type { BoxModel, DistanceMeasurement, ElementGeometry, Rect, Spacing } from '@/shared/types';
import { buildShortSelector, parsePx, roundNumber } from '@/shared/utils/css';

export function extractRect(element: Element): Rect {
  const r = element.getBoundingClientRect();
  return {
    x: roundNumber(r.left),
    y: roundNumber(r.top),
    width: roundNumber(r.width),
    height: roundNumber(r.height),
    top: roundNumber(r.top),
    right: roundNumber(r.right),
    bottom: roundNumber(r.bottom),
    left: roundNumber(r.left),
  };
}

export function extractBoxModel(element: Element, style: CSSStyleDeclaration): BoxModel {
  const rect = extractRect(element);

  const margin: Spacing = {
    top: parsePx(style.marginTop),
    right: parsePx(style.marginRight),
    bottom: parsePx(style.marginBottom),
    left: parsePx(style.marginLeft),
  };

  const border: Spacing = {
    top: parsePx(style.borderTopWidth),
    right: parsePx(style.borderRightWidth),
    bottom: parsePx(style.borderBottomWidth),
    left: parsePx(style.borderLeftWidth),
  };

  const padding: Spacing = {
    top: parsePx(style.paddingTop),
    right: parsePx(style.paddingRight),
    bottom: parsePx(style.paddingBottom),
    left: parsePx(style.paddingLeft),
  };

  const contentWidth = Math.max(
    0,
    roundNumber(rect.width - border.left - border.right - padding.left - padding.right)
  );
  const contentHeight = Math.max(
    0,
    roundNumber(rect.height - border.top - border.bottom - padding.top - padding.bottom)
  );

  return {
    margin,
    border,
    padding,
    content: {
      width: contentWidth,
      height: contentHeight,
    },
    boxSizing: style.boxSizing || 'content-box',
  };
}

export function extractGeometry(element: Element, style: CSSStyleDeclaration): ElementGeometry {
  const rect = extractRect(element);
  const box = extractBoxModel(element, style);
  const transform = style.transform && style.transform !== 'none' ? style.transform : 'none';
  const win = element.ownerDocument?.defaultView;

  return {
    ...rect,
    scrollX: roundNumber(win?.scrollX ?? 0),
    scrollY: roundNumber(win?.scrollY ?? 0),
    contentWidth: box.content.width,
    contentHeight: box.content.height,
    isTransformed: transform !== 'none',
    transform,
    aspectRatio: rect.height > 0 ? roundNumber(rect.width / rect.height, 2) : 0,
  };
}

/**
 * Computes precise element-to-element spacing and alignment guides
 * between a selected (anchor) element and a target (hovered) element.
 */
export function measureBetweenElements(
  source: Element,
  target: Element
): DistanceMeasurement | null {
  if (source === target) return null;

  const a = extractRect(source);
  const b = extractRect(target);

  const bInsideA =
    b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom;
  const aInsideB =
    a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;

  if (bInsideA || aInsideB) {
    const outer = bInsideA ? a : b;
    const inner = bInsideA ? b : a;
    return {
      targetSelector: buildShortSelector(target),
      targetRect: b,
      horizontal: null,
      vertical: null,
      isContained: true,
      innerOffsets: {
        top: Math.max(0, roundNumber(inner.top - outer.top)),
        right: Math.max(0, roundNumber(outer.right - inner.right)),
        bottom: Math.max(0, roundNumber(outer.bottom - inner.bottom)),
        left: Math.max(0, roundNumber(inner.left - outer.left)),
      },
    };
  }

  let horizontal: DistanceMeasurement['horizontal'] = null;
  const midY =
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
      ? roundNumber((Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2)
      : roundNumber(a.top + a.height / 2);

  if (a.right <= b.left) {
    horizontal = {
      distance: roundNumber(b.left - a.right),
      fromX: a.right,
      toX: b.left,
      y: midY,
      overlap: false,
    };
  } else if (b.right <= a.left) {
    horizontal = {
      distance: roundNumber(a.left - b.right),
      fromX: b.right,
      toX: a.left,
      y: midY,
      overlap: false,
    };
  } else {
    horizontal = {
      distance: roundNumber(Math.abs(a.left - b.left)),
      fromX: Math.min(a.left, b.left),
      toX: Math.max(a.left, b.left),
      y: midY,
      overlap: true,
    };
  }

  let vertical: DistanceMeasurement['vertical'] = null;
  const midX =
    Math.min(a.right, b.right) > Math.max(a.left, b.left)
      ? roundNumber((Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2)
      : roundNumber(a.left + a.width / 2);

  if (a.bottom <= b.top) {
    vertical = {
      distance: roundNumber(b.top - a.bottom),
      fromY: a.bottom,
      toY: b.top,
      x: midX,
      overlap: false,
    };
  } else if (b.bottom <= a.top) {
    vertical = {
      distance: roundNumber(a.top - b.bottom),
      fromY: b.bottom,
      toY: a.top,
      x: midX,
      overlap: false,
    };
  } else {
    vertical = {
      distance: roundNumber(Math.abs(a.top - b.top)),
      fromY: Math.min(a.top, b.top),
      toY: Math.max(a.top, b.top),
      x: midX,
      overlap: true,
    };
  }

  return {
    targetSelector: buildShortSelector(target),
    targetRect: b,
    horizontal,
    vertical,
    isContained: false,
    innerOffsets: null,
  };
}
