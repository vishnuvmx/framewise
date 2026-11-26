import type {
  ComponentCategory,
  ComponentConsistencyReport,
  ComponentOutlier,
  ComponentPattern,
} from '@/shared/types';
import {
  buildUniqueSelector,
  formatPx,
  normalizeColor,
  parsePx,
  roundNumber,
} from '@/shared/utils/css';

interface CandidateInstance {
  element: Element;
  selector: string;
  label: string;
  category: ComponentCategory;
  width: number;
  height: number;
  bgHex: string;
  textHex: string;
  hasBorder: boolean;
  radiusPx: number;
  fontSizePx: number;
  fontWeight: string;
  structureSig: string;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  button: 'Buttons',
  'icon-button': 'Icon buttons',
  card: 'Cards',
  input: 'Inputs',
  badge: 'Badges',
  'nav-link': 'Navigation links',
};

function getStructureSignature(el: Element): string {
  const childTags = Array.from(el.children)
    .slice(0, 6)
    .map((c) => c.tagName.toLowerCase());
  return `${el.tagName.toLowerCase()}[${childTags.join(',')}]`;
}

function getShortLabel(el: Element, fallback: string): string {
  const aria = el.getAttribute('aria-label')?.trim();
  const title = el.getAttribute('title')?.trim();
  const placeholder = el.getAttribute('placeholder')?.trim();
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const candidate = text || aria || title || placeholder || fallback;
  return candidate.length > 28 ? `${candidate.slice(0, 28)}…` : candidate;
}

function classifyElement(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect
): ComponentCategory | null {
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  if (rect.width < 16 || rect.height < 14) return null;

  const tag = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') ?? '').toLowerCase();
  const bg = normalizeColor(style.backgroundColor);
  const borderW = parsePx(style.borderTopWidth);
  const hasBorder = borderW > 0 && style.borderTopStyle !== 'none';
  const hasShadow = Boolean(style.boxShadow && style.boxShadow !== 'none');
  const radiusPx = Math.round(parsePx(style.borderTopLeftRadius));
  const padX = parsePx(style.paddingLeft) + parsePx(style.paddingRight);
  const padY = parsePx(style.paddingTop) + parsePx(style.paddingBottom);
  const textLen = (el.textContent ?? '').replace(/\s+/g, ' ').trim().length;

  // 1. Form Inputs
  if (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    role === 'textbox' ||
    role === 'combobox' ||
    role === 'searchbox'
  ) {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    if (type === 'hidden' || type === 'checkbox' || type === 'radio') return null;
    return 'input';
  }

  // 2. Buttons: separate Icon-only buttons from Text buttons to avoid false outlier baselines
  if (tag === 'button' || role === 'button') {
    if (rect.width <= 520 && rect.height <= 96) {
      if (textLen === 0 && rect.width <= 52 && rect.height <= 52) {
        return 'icon-button';
      }
      return 'button';
    }
  }
  if (
    tag === 'a' &&
    (bg.opacity > 0.1 || hasBorder) &&
    padX >= 12 &&
    padY >= 4 &&
    rect.height >= 26 &&
    rect.height <= 68 &&
    rect.width <= 360 &&
    textLen > 0 &&
    textLen <= 40
  ) {
    return 'button';
  }

  // 3. Nav links inside <nav> or <header>
  if (
    (tag === 'a' || role === 'menuitem' || role === 'tab') &&
    Boolean(el.closest('nav, header')) &&
    rect.height <= 56 &&
    textLen > 0 &&
    textLen <= 36
  ) {
    return 'nav-link';
  }

  // 4. Badges / Pills
  if (
    (tag === 'span' || tag === 'div' || tag === 'a') &&
    (bg.opacity > 0.08 || hasBorder) &&
    radiusPx >= 4 &&
    rect.height >= 16 &&
    rect.height <= 34 &&
    rect.width >= 24 &&
    rect.width <= 200 &&
    el.children.length <= 2 &&
    textLen > 0 &&
    textLen <= 28
  ) {
    return 'badge';
  }

  // 5. Cards (bounded container with >= 2 children and clear visual surface)
  if (
    (tag === 'article' || tag === 'div' || tag === 'li' || tag === 'section' || tag === 'a') &&
    el.children.length >= 2 &&
    el.children.length <= 14 &&
    rect.width >= 150 &&
    rect.width <= 760 &&
    rect.height >= 90 &&
    rect.height <= 760 &&
    (bg.opacity > 0.06 || hasBorder || hasShadow) &&
    (radiusPx >= 4 || hasBorder || hasShadow)
  ) {
    return 'card';
  }

  return null;
}

function nameVariant(category: ComponentCategory, sample: CandidateInstance, index: number): string {
  if (category === 'icon-button') {
    return index === 0 ? 'Icon button' : `Icon button ${index + 1}`;
  }
  if (category === 'button') {
    if (sample.bgHex !== 'TRANSPARENT') {
      return index === 0 ? 'Primary button' : `Filled button ${index + 1}`;
    }
    if (sample.hasBorder) return 'Outlined button';
    return 'Ghost button';
  }
  if (category === 'card') {
    return index === 0 ? 'Card pattern' : `Card variant ${index + 1}`;
  }
  if (category === 'input') {
    return index === 0 ? 'Text input' : `Input variant ${index + 1}`;
  }
  if (category === 'badge') {
    return index === 0 ? 'Badge / pill' : `Badge variant ${index + 1}`;
  }
  return index === 0 ? 'Nav item' : `Nav item ${index + 1}`;
}

function buildFrequencyMap<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const val of values) {
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return counts;
}

function findMode<T>(counts: Map<T, number>, fallback: T): T {
  let best = fallback;
  let bestCount = 0;
  for (const [val, count] of counts.entries()) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Discovers repeated UI component patterns (Buttons, Icon buttons, Cards, Inputs, Badges, Nav links)
 * and computes cross-element consistency reports while distinguishing intentional repeated variants
 * (>= 3 occurrences) from genuine one-off style drift.
 */
export function discoverComponents(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): {
  components: ComponentPattern[];
  consistencyReports: ComponentConsistencyReport[];
} {
  const byCategory = new Map<ComponentCategory, CandidateInstance[]>();

  for (const el of elements) {
    const style = getStyle(el);
    const rect = el.getBoundingClientRect();
    const category = classifyElement(el, style, rect);
    if (!category) continue;

    const bg = normalizeColor(style.backgroundColor);
    const fg = normalizeColor(style.color);
    const borderW = parsePx(style.borderTopWidth);
    const hasBorder = borderW > 0 && style.borderTopStyle !== 'none';
    const radiusPx = Math.round(parsePx(style.borderTopLeftRadius));
    const fontSizePx = Math.round(parsePx(style.fontSize) || 14);
    const selector = buildUniqueSelector(el);

    const candidate: CandidateInstance = {
      element: el,
      selector,
      label: getShortLabel(el, selector),
      category,
      width: roundNumber(rect.width, 0),
      height: roundNumber(rect.height, 0),
      bgHex: bg.hex,
      textHex: fg.hex,
      hasBorder,
      radiusPx,
      fontSizePx,
      fontWeight: style.fontWeight || '400',
      structureSig: getStructureSignature(el),
    };

    const list = byCategory.get(category) ?? [];
    list.push(candidate);
    byCategory.set(category, list);
  }

  const components: ComponentPattern[] = [];
  const consistencyReports: ComponentConsistencyReport[] = [];

  const categoryOrder: ComponentCategory[] = [
    'button',
    'icon-button',
    'card',
    'input',
    'badge',
    'nav-link',
  ];

  for (const category of categoryOrder) {
    const instances = byCategory.get(category) ?? [];
    if (instances.length === 0) continue;

    // Cluster into variants by visual/structural signature
    const clusters = new Map<string, CandidateInstance[]>();
    for (const inst of instances) {
      const heightBucket = Math.round(inst.height / 4) * 4;
      const radiusBucket = inst.radiusPx >= 999 ? 999 : Math.round(inst.radiusPx / 2) * 2;
      const key =
        category === 'card'
          ? `${inst.bgHex}|${inst.hasBorder ? 'b' : 'n'}|r${radiusBucket}|${inst.structureSig}`
          : `${inst.bgHex}|${inst.textHex}|${inst.hasBorder ? 'b' : 'n'}|h${heightBucket}|r${radiusBucket}|f${inst.fontSizePx}`;
      const group = clusters.get(key) ?? [];
      group.push(inst);
      clusters.set(key, group);
    }

    const sortedClusters = Array.from(clusters.entries())
      .filter(([, group]) => group.length >= (category === 'card' || category === 'badge' ? 2 : 1))
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    sortedClusters.forEach(([key, group], idx) => {
      const sample = group[0];
      components.push({
        id: `${category}:${key}`,
        category,
        name: nameVariant(category, sample, idx),
        count: group.length,
        selectors: group.map((g) => g.selector),
        sampleSize: { width: sample.width, height: sample.height },
        backgroundHex: sample.bgHex,
        textHex: sample.textHex,
        borderRadius: sample.radiusPx >= 999 ? '9999px' : formatPx(sample.radiusPx),
        fontSize: formatPx(sample.fontSizePx),
      });
    });

    // Cross-element consistency & outlier detection (requires >= 3 instances of the same archetype)
    if (
      instances.length >= 3 &&
      (category === 'button' ||
        category === 'icon-button' ||
        category === 'input' ||
        category === 'card' ||
        category === 'badge')
    ) {
      const heightBuckets = instances.map((i) => Math.round(i.height / 2) * 2);
      const radiusValues = instances.map((i) => (i.radiusPx >= 999 ? 9999 : Math.round(i.radiusPx)));
      const fontValues = instances.map((i) => i.fontSizePx);

      const heightCounts = buildFrequencyMap(heightBuckets);
      const radiusCounts = buildFrequencyMap(radiusValues);
      const fontCounts = buildFrequencyMap(fontValues);

      const baselineHeight = findMode(heightCounts, heightBuckets[0]);
      const baselineRadius = findMode(radiusCounts, radiusValues[0]);
      const baselineFont = findMode(fontCounts, fontValues[0]);

      // Any value appearing >= 3 times is treated as an intentional size/style variant, not drift
      const INTENTIONAL_VARIANT_THRESHOLD = 3;

      const outliers: ComponentOutlier[] = [];
      for (const inst of instances) {
        const reasons: string[] = [];
        const hBucket = Math.round(inst.height / 2) * 2;
        const normRadius = inst.radiusPx >= 999 ? 9999 : Math.round(inst.radiusPx);

        if (
          category !== 'card' &&
          Math.abs(inst.height - baselineHeight) >= 4 &&
          (heightCounts.get(hBucket) ?? 0) < INTENTIONAL_VARIANT_THRESHOLD
        ) {
          reasons.push(`height ${inst.height}px vs ${baselineHeight}px`);
        }

        if (
          normRadius !== baselineRadius &&
          Math.abs(normRadius - baselineRadius) >= 2 &&
          (radiusCounts.get(normRadius) ?? 0) < INTENTIONAL_VARIANT_THRESHOLD
        ) {
          reasons.push(
            `radius ${normRadius >= 9999 ? 'full' : `${normRadius}px`} vs ${
              baselineRadius >= 9999 ? 'full' : `${baselineRadius}px`
            }`
          );
        }

        if (
          category !== 'card' &&
          category !== 'icon-button' &&
          Math.abs(inst.fontSizePx - baselineFont) >= 2 &&
          (fontCounts.get(inst.fontSizePx) ?? 0) < INTENTIONAL_VARIANT_THRESHOLD
        ) {
          reasons.push(`font ${inst.fontSizePx}px vs ${baselineFont}px`);
        }

        if (reasons.length > 0) {
          outliers.push({
            selector: inst.selector,
            label: inst.label,
            reasons,
          });
        }
      }

      if (outliers.length > 0) {
        consistencyReports.push({
          category,
          categoryLabel: CATEGORY_LABELS[category],
          totalInstances: instances.length,
          baseline: {
            heightPx: baselineHeight,
            borderRadius: baselineRadius >= 9999 ? '9999px' : formatPx(baselineRadius),
            fontSize: formatPx(baselineFont),
          },
          outliers: outliers.slice(0, 8),
        });
      }
    }
  }

  return { components, consistencyReports };
}
