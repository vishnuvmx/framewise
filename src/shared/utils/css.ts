import type { ColorSwatch, Spacing } from '@/shared/types';

export function parsePx(value: string | null | undefined): number {
  if (!value || value === 'auto' || value === 'none' || value === 'normal') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? roundNumber(parsed) : 0;
}

export function roundNumber(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatPx(value: number): string {
  const rounded = roundNumber(value, 1);
  return Number.isInteger(rounded) ? `${rounded}px` : `${rounded.toFixed(1)}px`;
}

export function formatSpacingShorthand(spacing: Spacing): string {
  const { top, right, bottom, left } = spacing;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return '0px';
  if (top === right && right === bottom && bottom === left) return formatPx(top);
  if (top === bottom && left === right) return `${formatPx(top)} ${formatPx(right)}`;
  if (left === right) return `${formatPx(top)} ${formatPx(right)} ${formatPx(bottom)}`;
  return `${formatPx(top)} ${formatPx(right)} ${formatPx(bottom)} ${formatPx(left)}`;
}

export function hasNonZeroSpacing(spacing: Spacing): boolean {
  return spacing.top !== 0 || spacing.right !== 0 || spacing.bottom !== 0 || spacing.left !== 0;
}

export function parseRgbaString(raw: string): { r: number; g: number; b: number; a: number } | null {
  if (!raw || raw === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Matches rgb(r, g, b), rgba(r, g, b, a), rgb(r g b / a)
  const rgbMatch = raw.match(
    /rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i
  );
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, Math.round(Number(rgbMatch[1]))));
    const g = Math.min(255, Math.max(0, Math.round(Number(rgbMatch[2]))));
    const b = Math.min(255, Math.max(0, Math.round(Number(rgbMatch[3]))));
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? Number.parseFloat(rgbMatch[4]) / 100
        : Number.parseFloat(rgbMatch[4]);
    }
    return { r, g, b, a: Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1 };
  }

  // Matches #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexMatch = raw.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  return null;
}

export function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 0.995) {
    return `${base}${toHex(a * 255)}`.toUpperCase();
  }
  return base.toUpperCase();
}

export function normalizeColor(raw: string): ColorSwatch {
  const parsed = parseRgbaString(raw);
  if (!parsed) {
    return {
      raw: raw || 'transparent',
      hex: 'TRANSPARENT',
      rgba: 'rgba(0, 0, 0, 0)',
      opacity: 0,
    };
  }
  const opacity = roundNumber(parsed.a, 2);
  const rgba =
    opacity >= 1
      ? `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`
      : `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`;
  const hex = opacity === 0 ? 'TRANSPARENT' : rgbToHex(parsed.r, parsed.g, parsed.b, opacity);
  return { raw, hex, rgba, opacity };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function computeContrastRatio(
  fgRaw: string,
  bgRaw: string
): { ratio: number; grade: 'AAA' | 'AA' | 'AA Large' | 'Fail' } | null {
  const fg = parseRgbaString(fgRaw);
  const bg = parseRgbaString(bgRaw);
  if (!fg || !bg || fg.a === 0 || bg.a === 0) return null;

  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = roundNumber((lighter + 0.05) / (darker + 0.05), 2);

  let grade: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
  if (ratio >= 7) grade = 'AAA';
  else if (ratio >= 4.5) grade = 'AA';
  else if (ratio >= 3) grade = 'AA Large';

  return { ratio, grade };
}

export function getPrimaryFontFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0]?.trim() ?? '';
  return first.replace(/^["']|["']$/g, '') || 'system-ui';
}

export function getElementClasses(element: Element): string[] {
  if (!element.className) return [];
  const raw =
    typeof element.className === 'string'
      ? element.className
      : typeof (element.className as SVGAnimatedString).baseVal === 'string'
        ? (element.className as SVGAnimatedString).baseVal
        : '';
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function buildShortSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) {
    return `${tag}#${element.id}`;
  }
  const classes = getElementClasses(element).slice(0, 2);
  if (classes.length > 0) {
    return `${tag}.${classes.join('.')}`;
  }
  return tag;
}

export function buildUniqueSelector(element: Element): string {
  if (element.id) {
    return `#${CSS?.escape ? CSS.escape(element.id) : element.id}`;
  }
  const parts: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && current.nodeType === Node.ELEMENT_NODE && depth < 5) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') {
      parts.unshift(tag);
      break;
    }

    if (current.id) {
      parts.unshift(`${tag}#${current.id}`);
      break;
    }

    const classes = getElementClasses(current)
      .filter((c) => !c.startsWith('hover:') && !c.startsWith('focus:') && c.length < 32)
      .slice(0, 2);

    let segment = classes.length > 0 ? `${tag}.${classes.join('.')}` : tag;

    const parent: Element | null = current.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === current!.tagName
      );
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(segment);
    current = parent;
    depth++;
  }

  return parts.join(' > ');
}

export function colorDistance(hexA: string, hexB: string): number {
  const a = parseRgbaString(hexA);
  const b = parseRgbaString(hexB);
  if (!a || !b) return 999;
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}
