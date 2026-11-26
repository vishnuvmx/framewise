import { buildDesignBlueprint } from '@/core/blueprint';
import { extractColorPalette, extractElementColors } from '@/core/colors';
import { discoverComponents } from '@/core/components';
import { extractBoxModel, extractGeometry } from '@/core/geometry';
import { extractAncestors, extractDirectChildren } from '@/core/hierarchy';
import {
  extractContainerWidths,
  extractLayoutInfo,
  extractLayoutTree,
  extractViewportInfo,
} from '@/core/layout';
import { extractLayoutRelationships } from '@/core/layout/relationships';
import { isInsideShadowDom, scanVisibleElements } from '@/core/scanner';
import { buildCopyableCss, extractComputedGroups } from '@/core/styles';
import { extractTypography, extractTypographyScale } from '@/core/typography';
import type {
  ConsistencyIssue,
  DesignSystemSummary,
  ElementInspection,
  ScaleToken,
} from '@/shared/types';
import {
  buildShortSelector,
  buildUniqueSelector,
  colorDistance,
  formatPx,
  getElementClasses,
  parsePx,
  roundNumber,
} from '@/shared/utils/css';

function defaultGetStyle(el: Element): CSSStyleDeclaration {
  const win = el.ownerDocument?.defaultView ?? window;
  return win.getComputedStyle(el);
}

/**
 * Inspects a single DOM element on demand, returning a clean serializable contract
 * with zero DOM references attached.
 */
export function inspectElement(
  element: Element,
  getStyle: (el: Element) => CSSStyleDeclaration = defaultGetStyle
): ElementInspection {
  const style = getStyle(element);
  const parentStyle = element.parentElement ? getStyle(element.parentElement) : null;

  const selector = buildShortSelector(element);
  const id = buildUniqueSelector(element);
  const geometry = extractGeometry(element, style);
  const boxModel = extractBoxModel(element, style);
  const typography = extractTypography(style);
  const layout = extractLayoutInfo(element, style, parentStyle);
  const colors = extractElementColors(element, style, getStyle);
  const computedGroups = extractComputedGroups(style, geometry, boxModel, typography, layout);
  const copyableCss = buildCopyableCss(selector, computedGroups);
  const ancestors = extractAncestors(element, getStyle);
  const children = extractDirectChildren(element, getStyle);
  const relationships = extractLayoutRelationships(element, getStyle);

  const rawText = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const textPreview = rawText.length > 72 ? `${rawText.slice(0, 72)}…` : rawText;

  return {
    id,
    selector,
    tagName: element.tagName.toLowerCase(),
    idAttr: element.id || undefined,
    classes: getElementClasses(element),
    textPreview,
    childCount: element.children.length,
    inShadowDom: isInsideShadowDom(element),
    geometry,
    boxModel,
    typography,
    layout,
    colors,
    computedGroups,
    copyableCss,
    ancestors,
    children,
    relationships,
  };
}

function extractSpacingScale(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): ScaleToken[] {
  const counts = new Map<number, number>();

  const record = (raw: string) => {
    const px = roundNumber(parsePx(raw), 0);
    if (px <= 0 || px > 256) return;
    counts.set(px, (counts.get(px) ?? 0) + 1);
  };

  for (const el of elements) {
    const s = getStyle(el);
    if (s.display === 'none') continue;
    record(s.paddingTop);
    record(s.paddingRight);
    record(s.paddingBottom);
    record(s.paddingLeft);
    record(s.marginTop);
    record(s.marginBottom);
    record(s.rowGap);
    record(s.columnGap);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 20)
    .map(([valuePx, count], idx) => ({
      valuePx,
      value: formatPx(valuePx),
      count,
      suggestedName: `space-${idx + 1}`,
    }));
}

function extractRadiusScale(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): ScaleToken[] {
  const counts = new Map<number, number>();
  const names = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];

  for (const el of elements) {
    const s = getStyle(el);
    if (s.display === 'none') continue;
    const raw = s.borderTopLeftRadius;
    const px = roundNumber(parsePx(raw), 0);
    if (px <= 0) continue;
    const normalized = px >= 999 ? 9999 : px;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)
    .map(([valuePx, count], idx) => ({
      valuePx,
      value: valuePx >= 9999 ? '9999px' : formatPx(valuePx),
      count,
      suggestedName: `radius-${names[idx] ?? idx + 1}`,
    }));
}

function detectConsistencyIssues(
  colors: DesignSystemSummary['colors'],
  spacing: ScaleToken[],
  typography: DesignSystemSummary['typography'],
  radii: ScaleToken[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // Detect near-duplicate colors (Euclidean RGB distance < 18)
  const nearDuplicatePairs: string[] = [];
  for (let i = 0; i < Math.min(colors.length, 16); i++) {
    for (let j = i + 1; j < Math.min(colors.length, 16); j++) {
      const dist = colorDistance(colors[i].hex, colors[j].hex);
      if (dist > 0 && dist < 18) {
        nearDuplicatePairs.push(`${colors[i].hex} ≈ ${colors[j].hex}`);
      }
    }
  }
  if (nearDuplicatePairs.length > 0) {
    issues.push({
      category: 'color',
      severity: 'warning',
      message: `${nearDuplicatePairs.length} near-duplicate color pair(s) detected that could be consolidated.`,
      values: nearDuplicatePairs.slice(0, 5),
    });
  }

  // Detect off-4px-grid spacing values (like 5px, 7px, 13px, 15px, 19px)
  const offGrid = spacing
    .filter((t) => t.valuePx > 2 && t.valuePx % 4 !== 0 && t.valuePx % 2 !== 0)
    .map((t) => t.value);
  if (offGrid.length > 0) {
    issues.push({
      category: 'spacing',
      severity: 'info',
      message: `Found ${offGrid.length} odd pixel spacing value(s) outside a 4px/2px rhythm.`,
      values: offGrid.slice(0, 8),
    });
  }

  // Detect too many unique font sizes
  const uniqueSizes = Array.from(new Set(typography.map((t) => t.fontSizePx)));
  if (uniqueSizes.length > 10) {
    issues.push({
      category: 'typography',
      severity: 'info',
      message: `${uniqueSizes.length} distinct font sizes found; a typical type scale uses 6–9 steps.`,
      values: uniqueSizes.slice(0, 10).map((s) => `${s}px`),
    });
  }

  // Detect near-duplicate border radii (e.g., 5px and 6px)
  const closeRadii: string[] = [];
  for (let i = 1; i < radii.length; i++) {
    const diff = radii[i].valuePx - radii[i - 1].valuePx;
    if (diff === 1 && radii[i].valuePx < 32) {
      closeRadii.push(`${radii[i - 1].value} / ${radii[i].value}`);
    }
  }
  if (closeRadii.length > 0) {
    issues.push({
      category: 'radius',
      severity: 'info',
      message: 'Closely spaced border-radius values detected (1px apart).',
      values: closeRadii.slice(0, 5),
    });
  }

  return issues;
}

/**
 * Performs a bounded page-wide design system scan (on-demand, never on pointer move).
 */
export function analyzeDesignSystem(
  doc: Document = document,
  win: Window = window,
  getStyle: (el: Element) => CSSStyleDeclaration = defaultGetStyle
): DesignSystemSummary {
  const elements = scanVisibleElements(doc);
  const viewport = extractViewportInfo(win, doc);
  const colors = extractColorPalette(elements, getStyle);
  const { tokens: typography, fontFamilies } = extractTypographyScale(elements, getStyle);
  const spacing = extractSpacingScale(elements, getStyle);
  const radii = extractRadiusScale(elements, getStyle);
  const containers = extractContainerWidths(elements, getStyle, viewport.width);
  const layoutTree = extractLayoutTree(elements, getStyle);
  const issues = detectConsistencyIssues(colors, spacing, typography, radii);
  const { components, consistencyReports } = discoverComponents(elements, getStyle);
  const blueprint = buildDesignBlueprint({
    viewport,
    colors,
    typography,
    fontFamilies,
    spacing,
    containers,
    layoutTree,
    components,
  });

  return {
    url: viewport.url,
    title: viewport.title,
    scannedElements: elements.length,
    timestamp: new Date().toISOString(),
    viewport,
    colors,
    typography,
    fontFamilies,
    spacing,
    radii,
    containers,
    layoutTree,
    issues,
    components,
    consistencyReports,
    blueprint,
  };
}
