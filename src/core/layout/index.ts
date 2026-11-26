import type {
  ContainerWidthToken,
  FlexContainerInfo,
  GridTrackInfo,
  LayoutInfo,
  LayoutInsight,
  LayoutNodeSummary,
  ViewportInfo,
} from '@/shared/types';
import { buildShortSelector, formatPx, parsePx, roundNumber } from '@/shared/utils/css';

function humanizeKeyword(value: string): string {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function parseGridTracks(template: string): number[] {
  if (!template || template === 'none') return [];
  return template
    .trim()
    .split(/\s+/)
    .map((token) => Number.parseFloat(token))
    .filter((num) => Number.isFinite(num) && num > 0)
    .map((num) => roundNumber(num));
}

export function extractLayoutInfo(
  element: Element,
  style: CSSStyleDeclaration,
  parentStyle: CSSStyleDeclaration | null
): LayoutInfo {
  const display = style.display || 'block';
  const isFlex = display === 'flex' || display === 'inline-flex';
  const isGrid = display === 'grid' || display === 'inline-grid';
  const parentDisplay = parentStyle?.display ?? '';
  const isFlexItem = parentDisplay === 'flex' || parentDisplay === 'inline-flex';
  const isGridItem = parentDisplay === 'grid' || parentDisplay === 'inline-grid';

  const rowGap = parsePx(style.rowGap);
  const columnGap = parsePx(style.columnGap);
  const gap =
    rowGap === 0 && columnGap === 0
      ? '0px'
      : rowGap === columnGap
        ? formatPx(rowGap)
        : `${formatPx(rowGap)} ${formatPx(columnGap)}`;

  const insights: LayoutInsight[] = [];
  let flex: FlexContainerInfo | undefined;
  let grid: GridTrackInfo | undefined;

  if (isFlex) {
    flex = {
      direction: style.flexDirection || 'row',
      wrap: style.flexWrap || 'nowrap',
      justifyContent: style.justifyContent || 'normal',
      alignItems: style.alignItems || 'normal',
      alignContent: style.alignContent || 'normal',
      gap,
      rowGap,
      columnGap,
      childCount: element.children.length,
    };

    insights.push({ label: 'Layout', value: display === 'inline-flex' ? 'Inline Flexbox' : 'Flexbox' });
    insights.push({ label: 'Direction', value: humanizeKeyword(flex.direction) });
    if (flex.wrap !== 'nowrap') {
      insights.push({ label: 'Wrap', value: humanizeKeyword(flex.wrap) });
    }
    if (rowGap > 0 || columnGap > 0) {
      insights.push({ label: 'Gap', value: gap });
    }
    if (flex.alignItems && flex.alignItems !== 'normal') {
      insights.push({ label: 'Alignment', value: humanizeKeyword(flex.alignItems) });
    }
    if (flex.justifyContent && flex.justifyContent !== 'normal') {
      insights.push({ label: 'Distribution', value: humanizeKeyword(flex.justifyContent) });
    }
  } else if (isGrid) {
    const columns = parseGridTracks(style.gridTemplateColumns);
    const rows = parseGridTracks(style.gridTemplateRows);
    grid = {
      columns,
      rows,
      columnGap,
      rowGap,
      templateColumns: style.gridTemplateColumns || 'none',
      templateRows: style.gridTemplateRows || 'none',
    };

    insights.push({ label: 'Layout', value: display === 'inline-grid' ? 'Inline CSS Grid' : 'CSS Grid' });
    insights.push({
      label: 'Columns',
      value: columns.length > 0 ? `${columns.length} tracks` : style.gridTemplateColumns || 'Auto',
    });
    if (rows.length > 0) {
      insights.push({ label: 'Rows', value: `${rows.length} tracks` });
    }
    if (rowGap > 0 || columnGap > 0) {
      insights.push({ label: 'Gap', value: gap });
    }
    if (style.alignItems && style.alignItems !== 'normal') {
      insights.push({ label: 'Alignment', value: humanizeKeyword(style.alignItems) });
    }
  } else {
    insights.push({ label: 'Layout', value: humanizeKeyword(display) });
  }

  if (style.position && style.position !== 'static') {
    insights.push({ label: 'Position', value: humanizeKeyword(style.position) });
  }
  if (isFlexItem) {
    insights.push({ label: 'Parent Context', value: 'Flex Item' });
  } else if (isGridItem) {
    insights.push({ label: 'Parent Context', value: 'Grid Item' });
  }

  const opacity = Number.parseFloat(style.opacity || '1');

  return {
    display,
    position: style.position || 'static',
    zIndex: style.zIndex || 'auto',
    overflow: style.overflow || 'visible',
    isFlex,
    isGrid,
    isFlexItem,
    isGridItem,
    flexDirection: isFlex ? style.flexDirection : undefined,
    flexWrap: isFlex ? style.flexWrap : undefined,
    justifyContent: isFlex || isGrid ? style.justifyContent : undefined,
    alignItems: isFlex || isGrid ? style.alignItems : undefined,
    gridTemplateColumns: isGrid ? style.gridTemplateColumns : undefined,
    gridTemplateRows: isGrid ? style.gridTemplateRows : undefined,
    gap: rowGap > 0 || columnGap > 0 ? gap : undefined,
    rowGap,
    columnGap,
    borderRadius: style.borderRadius || '0px',
    boxShadow: style.boxShadow || 'none',
    opacity: Number.isFinite(opacity) ? roundNumber(opacity, 2) : 1,
    flex,
    grid,
    insights,
  };
}

export function getViewportBreakpoint(width: number): ViewportInfo['breakpoint'] {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
}

export function extractViewportInfo(win: Window = window, doc: Document = document): ViewportInfo {
  const width = Math.round(win.innerWidth || doc.documentElement?.clientWidth || 0);
  const height = Math.round(win.innerHeight || doc.documentElement?.clientHeight || 0);
  return {
    width,
    height,
    devicePixelRatio: roundNumber(win.devicePixelRatio || 1, 2),
    breakpoint: getViewportBreakpoint(width),
    scrollHeight: Math.round(doc.documentElement?.scrollHeight || 0),
    scrollWidth: Math.round(doc.documentElement?.scrollWidth || 0),
    url: win.location?.href ?? '',
    title: doc.title ?? '',
  };
}

export function extractContainerWidths(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration,
  viewportWidth: number
): ContainerWidthToken[] {
  const containers: ContainerWidthToken[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const style = getStyle(el);
    if (style.display === 'none') continue;

    const maxWidth = style.maxWidth;
    const rect = el.getBoundingClientRect();
    const hasExplicitMaxWidth =
      maxWidth && maxWidth !== 'none' && maxWidth !== '100%' && parsePx(maxWidth) >= 320;
    const marginLeft = parsePx(style.marginLeft);
    const marginRight = parsePx(style.marginRight);
    const centered =
      rect.width < viewportWidth - 20 &&
      marginLeft > 8 &&
      Math.abs(marginLeft - marginRight) <= 4;

    if (hasExplicitMaxWidth || (centered && rect.width >= 480)) {
      const selector = buildShortSelector(el);
      const key = `${selector}|${Math.round(rect.width)}|${maxWidth}`;
      if (seen.has(key)) continue;
      seen.add(key);

      containers.push({
        selector,
        width: roundNumber(rect.width),
        maxWidth: maxWidth || 'none',
        centered,
        display: style.display,
      });
    }
  }

  return containers.sort((a, b) => b.width - a.width).slice(0, 16);
}

export function extractLayoutTree(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration
): LayoutNodeSummary[] {
  const nodes: LayoutNodeSummary[] = [];

  for (const el of elements) {
    const style = getStyle(el);
    const display = style.display;
    const isFlex = display === 'flex' || display === 'inline-flex';
    const isGrid = display === 'grid' || display === 'inline-grid';
    if (!isFlex && !isGrid) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) continue;

    let depth = 0;
    let parent = el.parentElement;
    while (parent && depth < 12) {
      const pd = getStyle(parent).display;
      if (pd === 'flex' || pd === 'inline-flex' || pd === 'grid' || pd === 'inline-grid') {
        depth++;
      }
      parent = parent.parentElement;
    }

    const rowGap = parsePx(style.rowGap);
    const colGap = parsePx(style.columnGap);
    const gap =
      rowGap === 0 && colGap === 0
        ? '0px'
        : rowGap === colGap
          ? formatPx(rowGap)
          : `${formatPx(rowGap)} ${formatPx(colGap)}`;

    const directionOrCols = isGrid
      ? `${parseGridTracks(style.gridTemplateColumns).length || 'auto'} cols`
      : style.flexDirection || 'row';

    nodes.push({
      selector: buildShortSelector(el),
      tagName: el.tagName.toLowerCase(),
      type: isGrid ? 'grid' : 'flex',
      directionOrCols,
      gap,
      width: roundNumber(rect.width),
      height: roundNumber(rect.height),
      childCount: el.children.length,
      depth,
    });

    if (nodes.length >= 60) break;
  }

  return nodes;
}
