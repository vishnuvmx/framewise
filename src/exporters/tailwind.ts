import type { DesignSystemSummary, ElementInspection, Spacing } from '@/shared/types';
import { formatPx, parsePx, roundNumber } from '@/shared/utils/css';

const TW_SPACING: Array<[number, string]> = [
  [0, '0'],
  [2, '0.5'],
  [4, '1'],
  [6, '1.5'],
  [8, '2'],
  [10, '2.5'],
  [12, '3'],
  [14, '3.5'],
  [16, '4'],
  [20, '5'],
  [24, '6'],
  [28, '7'],
  [32, '8'],
  [36, '9'],
  [40, '10'],
  [44, '11'],
  [48, '12'],
  [56, '14'],
  [64, '16'],
  [80, '20'],
  [96, '24'],
];

function toTwScale(px: number): string {
  const rounded = Math.round(px);
  const match = TW_SPACING.find(([v]) => v === rounded);
  if (match) return match[1];
  return `[${formatPx(px)}]`;
}

function spacingClasses(prefix: 'p' | 'm', s: Spacing): string[] {
  const { top, right, bottom, left } = s;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return [];
  if (top === right && right === bottom && bottom === left) {
    return [`${prefix}-${toTwScale(top)}`];
  }
  const out: string[] = [];
  if (top === bottom) {
    if (top > 0) out.push(`${prefix}y-${toTwScale(top)}`);
  } else {
    if (top > 0) out.push(`${prefix}t-${toTwScale(top)}`);
    if (bottom > 0) out.push(`${prefix}b-${toTwScale(bottom)}`);
  }
  if (left === right) {
    if (left > 0) out.push(`${prefix}x-${toTwScale(left)}`);
  } else {
    if (left > 0) out.push(`${prefix}l-${toTwScale(left)}`);
    if (right > 0) out.push(`${prefix}r-${toTwScale(right)}`);
  }
  return out;
}

function toTwFontSize(px: number): string {
  const map: Record<number, string> = {
    12: 'text-xs',
    14: 'text-sm',
    16: 'text-base',
    18: 'text-lg',
    20: 'text-xl',
    24: 'text-2xl',
    30: 'text-3xl',
    36: 'text-4xl',
    48: 'text-5xl',
  };
  return map[Math.round(px)] ?? `text-[${formatPx(px)}]`;
}

function toTwWeight(weight: string): string | null {
  const map: Record<string, string> = {
    '300': 'font-light',
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
  };
  return map[weight] ?? null;
}

function toTwRadius(raw: string): string | null {
  const px = Math.round(parsePx(raw));
  if (px <= 0) return null;
  if (px >= 999) return 'rounded-full';
  const map: Record<number, string> = {
    2: 'rounded-xs',
    4: 'rounded-sm',
    6: 'rounded-md',
    8: 'rounded-lg',
    12: 'rounded-xl',
    16: 'rounded-2xl',
    24: 'rounded-3xl',
  };
  return map[px] ?? `rounded-[${px}px]`;
}

export function exportElementTailwind(el: ElementInspection): string {
  const classes: string[] = [];
  const { layout, boxModel, typography, colors, geometry } = el;

  if (layout.isFlex) {
    classes.push(layout.display === 'inline-flex' ? 'inline-flex' : 'flex');
    if (layout.flexDirection === 'column') classes.push('flex-col');
    else if (layout.flexDirection === 'row-reverse') classes.push('flex-row-reverse');
    else if (layout.flexDirection === 'column-reverse') classes.push('flex-col-reverse');
    if (layout.flexWrap === 'wrap') classes.push('flex-wrap');
  } else if (layout.isGrid) {
    classes.push(layout.display === 'inline-grid' ? 'inline-grid' : 'grid');
    if (layout.grid && layout.grid.columns.length > 0) {
      classes.push(`grid-cols-${layout.grid.columns.length}`);
    }
  } else if (layout.display === 'inline-block') {
    classes.push('inline-block');
  }

  const justifyMap: Record<string, string> = {
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
    'flex-end': 'justify-end',
    end: 'justify-end',
  };
  const alignMap: Record<string, string> = {
    center: 'items-center',
    'flex-start': 'items-start',
    start: 'items-start',
    'flex-end': 'items-end',
    end: 'items-end',
    baseline: 'items-baseline',
  };
  if (layout.justifyContent && justifyMap[layout.justifyContent]) {
    classes.push(justifyMap[layout.justifyContent]);
  }
  if (layout.alignItems && alignMap[layout.alignItems]) {
    classes.push(alignMap[layout.alignItems]);
  }

  if (layout.rowGap > 0 || layout.columnGap > 0) {
    if (layout.rowGap === layout.columnGap) {
      classes.push(`gap-${toTwScale(layout.rowGap)}`);
    } else {
      if (layout.rowGap > 0) classes.push(`gap-y-${toTwScale(layout.rowGap)}`);
      if (layout.columnGap > 0) classes.push(`gap-x-${toTwScale(layout.columnGap)}`);
    }
  }

  classes.push(...spacingClasses('p', boxModel.padding));
  classes.push(...spacingClasses('m', boxModel.margin));

  const radius = toTwRadius(layout.borderRadius);
  if (radius) classes.push(radius);

  if (colors.background.opacity > 0) {
    classes.push(`bg-[${colors.background.hex}]`);
  }
  if (colors.borderColor.opacity > 0 && boxModel.border.top > 0) {
    classes.push(
      boxModel.border.top === 1 ? 'border' : `border-[${formatPx(boxModel.border.top)}]`,
      `border-[${colors.borderColor.hex}]`
    );
  }

  classes.push(toTwFontSize(typography.fontSizePx));
  const weight = toTwWeight(typography.fontWeight);
  if (weight && weight !== 'font-normal') classes.push(weight);
  if (colors.color.opacity > 0) {
    classes.push(`text-[${colors.color.hex}]`);
  }

  if (geometry.width > 0) {
    classes.push(`w-[${roundNumber(geometry.width, 0)}px]`);
  }

  return `<${el.tagName} class="${classes.join(' ')}">\n  <!-- ${el.selector} -->\n</${el.tagName}>`;
}

export function exportTailwindTheme(summary: DesignSystemSummary): string {
  const lines: string[] = [
    `/* LayoutLens Tailwind v4 Theme — ${summary.title || summary.url} */`,
    '@theme {',
  ];

  if (summary.colors.length > 0) {
    lines.push('  /* Colors */');
    for (const c of summary.colors.slice(0, 16)) {
      lines.push(`  --color-${c.suggestedName}: ${c.hex};`);
    }
  }

  if (summary.fontFamilies.length > 0) {
    lines.push('');
    lines.push('  /* Fonts */');
    summary.fontFamilies.slice(0, 4).forEach((f, idx) => {
      const name = idx === 0 ? 'sans' : idx === 1 ? 'display' : `alt-${idx + 1}`;
      lines.push(`  --font-${name}: ${f.stack};`);
    });
  }

  if (summary.typography.length > 0) {
    lines.push('');
    lines.push('  /* Type Scale */');
    for (const t of summary.typography.slice(0, 10)) {
      lines.push(`  --text-${t.suggestedRole}: ${t.fontSize};`);
    }
  }

  if (summary.spacing.length > 0) {
    lines.push('');
    lines.push('  /* Spacing */');
    for (const s of summary.spacing.slice(0, 12)) {
      lines.push(`  --spacing-${s.suggestedName}: ${s.value};`);
    }
  }

  if (summary.radii.length > 0) {
    lines.push('');
    lines.push('  /* Border Radii */');
    for (const r of summary.radii.slice(0, 8)) {
      lines.push(`  --radius-${r.suggestedName.replace(/^radius-/, '')}: ${r.value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
