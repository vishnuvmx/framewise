import type { TypographyInfo, TypographyToken } from '@/shared/types';
import { getPrimaryFontFamily, normalizeColor, parsePx, roundNumber } from '@/shared/utils/css';

export function extractTypography(style: CSSStyleDeclaration): TypographyInfo {
  const fontSizePx = parsePx(style.fontSize) || 16;
  const lineHeightPx = parsePx(style.lineHeight);
  const lineHeightRatio =
    lineHeightPx > 0 && fontSizePx > 0 ? roundNumber(lineHeightPx / fontSizePx, 2) : null;
  const colorSwatch = normalizeColor(style.color);

  return {
    fontFamily: style.fontFamily || 'system-ui',
    primaryFont: getPrimaryFontFamily(style.fontFamily || 'system-ui'),
    fontSize: style.fontSize || '16px',
    fontSizePx,
    fontWeight: style.fontWeight || '400',
    lineHeight: style.lineHeight || 'normal',
    lineHeightRatio,
    letterSpacing: style.letterSpacing || 'normal',
    textAlign: style.textAlign || 'start',
    textTransform: style.textTransform || 'none',
    color: style.color || 'rgb(0, 0, 0)',
    colorHex: colorSwatch.hex,
  };
}

function hasDirectTextContent(element: Element): boolean {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

function inferTypographyRole(sizePx: number, weight: string, tags: Set<string>): string {
  if (tags.has('h1') || sizePx >= 36) return 'display';
  if (tags.has('h2') || sizePx >= 28) return 'heading-1';
  if (tags.has('h3') || sizePx >= 22) return 'heading-2';
  if (tags.has('h4') || tags.has('h5') || sizePx >= 18) return 'heading-3';
  if (tags.has('code') || tags.has('pre')) return 'code';
  if (sizePx <= 12) return 'caption';
  if (sizePx <= 14) return Number(weight) >= 600 ? 'label' : 'body-sm';
  return Number(weight) >= 600 ? 'subtitle' : 'body';
}

export function extractTypographyScale(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): {
  tokens: TypographyToken[];
  fontFamilies: Array<{ name: string; stack: string; count: number }>;
} {
  const map = new Map<
    string,
    {
      fontFamily: string;
      primaryFont: string;
      fontSize: string;
      fontSizePx: number;
      fontWeight: string;
      lineHeight: string;
      letterSpacing: string;
      count: number;
      tags: Set<string>;
    }
  >();

  const familyMap = new Map<string, { name: string; stack: string; count: number }>();

  for (const el of elements) {
    if (!hasDirectTextContent(el)) continue;
    const style = getStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const info = extractTypography(style);
    const key = `${info.primaryFont}|${info.fontSizePx}|${info.fontWeight}|${info.lineHeight}`;

    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.tags.add(el.tagName.toLowerCase());
    } else {
      map.set(key, {
        fontFamily: info.fontFamily,
        primaryFont: info.primaryFont,
        fontSize: info.fontSize,
        fontSizePx: info.fontSizePx,
        fontWeight: info.fontWeight,
        lineHeight: info.lineHeight,
        letterSpacing: info.letterSpacing,
        count: 1,
        tags: new Set([el.tagName.toLowerCase()]),
      });
    }

    const famKey = info.primaryFont.toLowerCase();
    const fam = familyMap.get(famKey);
    if (fam) {
      fam.count++;
    } else {
      familyMap.set(famKey, {
        name: info.primaryFont,
        stack: info.fontFamily,
        count: 1,
      });
    }
  }

  const roleCounters = new Map<string, number>();
  const tokens: TypographyToken[] = Array.from(map.entries())
    .sort((a, b) => b[1].fontSizePx - a[1].fontSizePx || b[1].count - a[1].count)
    .slice(0, 24)
    .map(([key, item]) => {
      const baseRole = inferTypographyRole(item.fontSizePx, item.fontWeight, item.tags);
      const count = (roleCounters.get(baseRole) ?? 0) + 1;
      roleCounters.set(baseRole, count);
      const suggestedRole = count === 1 ? baseRole : `${baseRole}-${count}`;

      return {
        id: key,
        fontFamily: item.fontFamily,
        primaryFont: item.primaryFont,
        fontSize: item.fontSize,
        fontSizePx: item.fontSizePx,
        fontWeight: item.fontWeight,
        lineHeight: item.lineHeight,
        letterSpacing: item.letterSpacing,
        count: item.count,
        sampleTags: Array.from(item.tags).slice(0, 4),
        suggestedRole,
      };
    });

  const fontFamilies = Array.from(familyMap.values()).sort((a, b) => b.count - a.count);

  return { tokens, fontFamilies };
}
