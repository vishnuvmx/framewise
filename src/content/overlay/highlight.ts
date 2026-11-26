import { createSvgEl } from '@/content/overlay/overlay-host';
import { OVERLAY_COLORS } from '@/shared/constants';
import type { ElementInspection } from '@/shared/types';
import { roundNumber } from '@/shared/utils/css';

export function renderHighlightOverlay(
  svg: SVGSVGElement,
  labels: HTMLDivElement,
  inspection: ElementInspection,
  variant: 'hover' | 'selected',
  showDimensionsBadge: boolean,
  rightInset = 0
): void {
  const { left, top, width, height } = inspection.geometry;
  const stroke = variant === 'selected' ? OVERLAY_COLORS.selectedStroke : OVERLAY_COLORS.hoverStroke;
  const fill = variant === 'selected' ? OVERLAY_COLORS.selectedFill : OVERLAY_COLORS.hoverFill;

  svg.appendChild(
    createSvgEl('rect', {
      x: left,
      y: top,
      width,
      height,
      fill,
      stroke,
      'stroke-width': variant === 'selected' ? 2 : 1.5,
      rx: 1,
    })
  );

  // Corner anchor dots on selected element
  if (variant === 'selected' && width >= 12 && height >= 12) {
    const corners: Array<[number, number]> = [
      [left, top],
      [left + width, top],
      [left, top + height],
      [left + width, top + height],
    ];
    for (const [cx, cy] of corners) {
      svg.appendChild(
        createSvgEl('circle', {
          cx,
          cy,
          r: 3,
          fill: '#ffffff',
          stroke,
          'stroke-width': 1.5,
        })
      );
    }
  }

  if (!showDimensionsBadge) return;

  const badge = document.createElement('div');
  badge.className = variant === 'selected' ? 'll-badge ll-badge--selected' : 'll-badge';

  const tagSpan = document.createElement('span');
  tagSpan.className = 'll-badge__tag';
  tagSpan.textContent = inspection.selector;

  const dimsSpan = document.createElement('span');
  dimsSpan.className = 'll-badge__dims';
  dimsSpan.textContent = `${roundNumber(width, 0)} × ${roundNumber(height, 0)}`;

  badge.append(tagSpan, dimsSpan);

  if (inspection.layout.isGrid) {
    const layoutTag = document.createElement('span');
    layoutTag.className = 'll-badge__layout ll-badge__layout--grid';
    layoutTag.textContent = 'grid';
    badge.append(layoutTag);
  } else if (inspection.layout.isFlex) {
    const layoutTag = document.createElement('span');
    layoutTag.className = 'll-badge__layout ll-badge__layout--flex';
    layoutTag.textContent = 'flex';
    badge.append(layoutTag);
  }

  // Clamp badge inside visible viewport, staying clear of the open right drawer
  const visibleRight = Math.max(260, window.innerWidth - rightInset - 8);
  const badgeTop =
    top > 34
      ? Math.min(window.innerHeight - 32, top - 30)
      : Math.min(window.innerHeight - 32, Math.max(8, top + height + 8));
  const badgeLeft = Math.max(8, Math.min(visibleRight - 220, left));
  badge.style.top = `${Math.round(badgeTop)}px`;
  badge.style.left = `${Math.round(badgeLeft)}px`;

  labels.appendChild(badge);
}

/**
 * Renders visual Flexbox (child boundaries & gap bands) or CSS Grid
 * (resolved column & row track lines + gap gutters) overlays.
 */
export function renderLayoutGuideOverlay(
  svg: SVGSVGElement,
  element: Element,
  inspection: ElementInspection,
  subtle = false
): void {
  const { left, top, width, height } = inspection.geometry;
  const { padding, border } = inspection.boxModel;

  const innerLeft = left + border.left + padding.left;
  const innerTop = top + border.top + padding.top;
  const innerW = Math.max(0, width - border.left - border.right - padding.left - padding.right);
  const innerH = Math.max(0, height - border.top - border.bottom - padding.top - padding.bottom);
  const strokeOpacity = subtle ? 0.45 : 0.85;
  const fillOpacity = subtle ? 0.5 : 1;

  if (inspection.layout.isGrid && inspection.layout.grid) {
    const { columns, rows, columnGap, rowGap } = inspection.layout.grid;

    // Container dashed frame
    svg.appendChild(
      createSvgEl('rect', {
        x: innerLeft,
        y: innerTop,
        width: innerW,
        height: innerH,
        fill: OVERLAY_COLORS.gridFill,
        'fill-opacity': fillOpacity,
        stroke: OVERLAY_COLORS.gridStroke,
        'stroke-opacity': strokeOpacity,
        'stroke-width': 1,
        'stroke-dasharray': '4 3',
      })
    );

    // Draw column tracks + gap strips
    let cursorX = innerLeft;
    for (let i = 0; i < columns.length; i++) {
      const colW = columns[i];
      svg.appendChild(
        createSvgEl('rect', {
          x: cursorX,
          y: innerTop,
          width: colW,
          height: innerH,
          fill: 'none',
          stroke: OVERLAY_COLORS.gridStroke,
          'stroke-width': 1,
          'stroke-dasharray': '3 3',
          'stroke-opacity': 0.8,
        })
      );
      cursorX += colW;
      if (i < columns.length - 1 && columnGap > 0) {
        svg.appendChild(
          createSvgEl('rect', {
            x: cursorX,
            y: innerTop,
            width: columnGap,
            height: innerH,
            fill: 'rgba(236, 72, 153, 0.16)',
          })
        );
        cursorX += columnGap;
      }
    }

    // Draw row tracks + gap strips
    let cursorY = innerTop;
    for (let i = 0; i < rows.length; i++) {
      const rowH = rows[i];
      svg.appendChild(
        createSvgEl('line', {
          x1: innerLeft,
          y1: cursorY,
          x2: innerLeft + innerW,
          y2: cursorY,
          stroke: OVERLAY_COLORS.gridStroke,
          'stroke-width': 1,
          'stroke-dasharray': '3 3',
          'stroke-opacity': 0.75,
        })
      );
      cursorY += rowH;
      if (i < rows.length - 1 && rowGap > 0) {
        svg.appendChild(
          createSvgEl('rect', {
            x: innerLeft,
            y: cursorY,
            width: innerW,
            height: rowGap,
            fill: 'rgba(236, 72, 153, 0.14)',
          })
        );
        cursorY += rowGap;
      }
    }
    return;
  }

  if (inspection.layout.isFlex && inspection.layout.flex) {
    // Flex container outline
    svg.appendChild(
      createSvgEl('rect', {
        x: innerLeft,
        y: innerTop,
        width: innerW,
        height: innerH,
        fill: OVERLAY_COLORS.flexFill,
        'fill-opacity': fillOpacity,
        stroke: OVERLAY_COLORS.flexStroke,
        'stroke-opacity': strokeOpacity,
        'stroke-width': 1,
        'stroke-dasharray': '4 3',
      })
    );

    const children = Array.from(element.children).slice(0, 40);
    const rects = children
      .map((child) => child.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    for (const r of rects) {
      svg.appendChild(
        createSvgEl('rect', {
          x: r.left,
          y: r.top,
          width: r.width,
          height: r.height,
          fill: 'none',
          stroke: OVERLAY_COLORS.flexStroke,
          'stroke-width': 1,
          'stroke-dasharray': '2 2',
          'stroke-opacity': 0.85,
        })
      );
    }

    // Highlight gaps between consecutive flex items
    const isRow = !inspection.layout.flex.direction.startsWith('column');
    for (let i = 0; i < rects.length - 1; i++) {
      const a = rects[i];
      const b = rects[i + 1];
      if (isRow && b.left > a.right + 1 && Math.abs(b.top - a.top) < Math.max(a.height, b.height)) {
        svg.appendChild(
          createSvgEl('rect', {
            x: a.right,
            y: Math.min(a.top, b.top),
            width: b.left - a.right,
            height: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top),
            fill: 'rgba(168, 85, 247, 0.22)',
          })
        );
      } else if (!isRow && b.top > a.bottom + 1) {
        svg.appendChild(
          createSvgEl('rect', {
            x: Math.min(a.left, b.left),
            y: a.bottom,
            width: Math.max(a.right, b.right) - Math.min(a.left, b.left),
            height: b.top - a.bottom,
            fill: 'rgba(168, 85, 247, 0.22)',
          })
        );
      }
    }
  }
}
