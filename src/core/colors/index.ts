import type { ColorToken, ElementColors } from '@/shared/types';
import { computeContrastRatio, normalizeColor, parsePx, parseRgbaString } from '@/shared/utils/css';

/**
 * Walks up the DOM tree to resolve the effective opaque background behind an element
 * so contrast ratios remain meaningful even on transparent text elements.
 */
export function resolveEffectiveBackground(
  element: Element,
  getStyle: (el: Element) => CSSStyleDeclaration
): string {
  let current: Element | null = element;
  let guard = 0;

  while (current && guard < 20) {
    const bg = getStyle(current).backgroundColor;
    const parsed = parseRgbaString(bg);
    if (parsed && parsed.a > 0.15) {
      return bg;
    }
    current = current.parentElement;
    guard++;
  }

  return 'rgb(255, 255, 255)';
}

export function extractElementColors(
  element: Element,
  style: CSSStyleDeclaration,
  getStyle: (el: Element) => CSSStyleDeclaration
): ElementColors {
  const color = normalizeColor(style.color);
  const background = normalizeColor(style.backgroundColor);
  const hasBorder =
    parsePx(style.borderTopWidth) > 0 ||
    parsePx(style.borderRightWidth) > 0 ||
    parsePx(style.borderBottomWidth) > 0 ||
    parsePx(style.borderLeftWidth) > 0;
  const borderColor = hasBorder
    ? normalizeColor(style.borderTopColor)
    : { raw: 'transparent', hex: 'TRANSPARENT', rgba: 'rgba(0, 0, 0, 0)', opacity: 0 };
  const hasOutline = parsePx(style.outlineWidth) > 0 && style.outlineStyle !== 'none';
  const outlineColor = hasOutline
    ? normalizeColor(style.outlineColor)
    : { raw: 'transparent', hex: 'TRANSPARENT', rgba: 'rgba(0, 0, 0, 0)', opacity: 0 };

  const effectiveBg =
    background.opacity > 0.15 ? style.backgroundColor : resolveEffectiveBackground(element, getStyle);
  const contrast = computeContrastRatio(style.color, effectiveBg);

  return {
    color,
    background,
    borderColor,
    outlineColor,
    contrastRatio: contrast?.ratio ?? null,
    contrastGrade: contrast?.grade ?? null,
  };
}

function suggestColorName(
  hex: string,
  roles: Set<'text' | 'background' | 'border'>,
  index: number
): string {
  const parsed = parseRgbaString(hex);
  if (!parsed) return `color-${index + 1}`;
  const { r, g, b } = parsed;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  if (sat < 0.12) {
    if (lum > 0.94) return 'surface-light';
    if (lum > 0.75) return 'neutral-200';
    if (lum > 0.45) return 'neutral-500';
    if (lum > 0.18) return 'neutral-800';
    return 'surface-dark';
  }

  if (roles.has('background') && !roles.has('text')) {
    return `accent-bg-${index + 1}`;
  }
  if (roles.has('text') && !roles.has('background')) {
    return `accent-text-${index + 1}`;
  }
  return `brand-${index + 1}`;
}

export function extractColorPalette(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): ColorToken[] {
  const map = new Map<
    string,
    { hex: string; rgba: string; count: number; roles: Set<'text' | 'background' | 'border'> }
  >();

  const record = (raw: string, role: 'text' | 'background' | 'border') => {
    const swatch = normalizeColor(raw);
    if (swatch.opacity === 0 || swatch.hex === 'TRANSPARENT') return;

    const existing = map.get(swatch.hex);
    if (existing) {
      existing.count++;
      existing.roles.add(role);
    } else {
      map.set(swatch.hex, {
        hex: swatch.hex,
        rgba: swatch.rgba,
        count: 1,
        roles: new Set([role]),
      });
    }
  };

  for (const el of elements) {
    const style = getStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    record(style.backgroundColor, 'background');
    record(style.color, 'text');
    if (parsePx(style.borderTopWidth) > 0) {
      record(style.borderTopColor, 'border');
    }
  }

  const usedNames = new Map<string, number>();

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 32)
    .map((entry, idx) => {
      const base = suggestColorName(entry.hex, entry.roles, idx);
      const seen = (usedNames.get(base) ?? 0) + 1;
      usedNames.set(base, seen);
      const suggestedName = seen === 1 ? base : `${base}-${seen}`;

      return {
        hex: entry.hex,
        rgba: entry.rgba,
        count: entry.count,
        roles: Array.from(entry.roles),
        suggestedName,
      };
    });
}
