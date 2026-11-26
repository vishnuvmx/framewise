import { createSvgEl } from '@/content/overlay/overlay-host';
import { OVERLAY_COLORS } from '@/shared/constants';
import type { DistanceMeasurement, Rect } from '@/shared/types';
import { formatPx } from '@/shared/utils/css';

function drawMeasurementLine(
  svg: SVGSVGElement,
  labels: HTMLDivElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  distance: number
): void {
  if (distance < 1) return;

  svg.appendChild(
    createSvgEl('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: OVERLAY_COLORS.measureLine,
      'stroke-width': 1.5,
    })
  );

  // End caps
  const isHorizontal = Math.abs(y2 - y1) < 0.5;
  const cap = 4;
  if (isHorizontal) {
    svg.appendChild(createSvgEl('line', { x1, y1: y1 - cap, x2: x1, y2: y1 + cap, stroke: OVERLAY_COLORS.measureLine, 'stroke-width': 1.5 }));
    svg.appendChild(createSvgEl('line', { x1: x2, y1: y2 - cap, x2, y2: y2 + cap, stroke: OVERLAY_COLORS.measureLine, 'stroke-width': 1.5 }));
  } else {
    svg.appendChild(createSvgEl('line', { x1: x1 - cap, y1, x2: x1 + cap, y2: y1, stroke: OVERLAY_COLORS.measureLine, 'stroke-width': 1.5 }));
    svg.appendChild(createSvgEl('line', { x1: x2 - cap, y1: y2, x2: x2 + cap, y2, stroke: OVERLAY_COLORS.measureLine, 'stroke-width': 1.5 }));
  }

  const pill = document.createElement('span');
  pill.className = 'll-pill ll-pill--measure';
  pill.style.left = `${Math.round((x1 + x2) / 2)}px`;
  pill.style.top = `${Math.round((y1 + y2) / 2)}px`;
  pill.textContent = formatPx(distance);
  labels.appendChild(pill);
}

/**
 * Renders element-to-element measurement guides between a locked anchor element
 * and a hovered target element.
 */
export function renderMeasurementOverlay(
  svg: SVGSVGElement,
  labels: HTMLDivElement,
  sourceRect: Rect,
  measurement: DistanceMeasurement
): void {
  const target = measurement.targetRect;

  // Outline target element with rose dashed stroke
  svg.appendChild(
    createSvgEl('rect', {
      x: target.left,
      y: target.top,
      width: target.width,
      height: target.height,
      fill: 'rgba(244, 63, 94, 0.06)',
      stroke: OVERLAY_COLORS.measureLine,
      'stroke-width': 1.25,
      'stroke-dasharray': '4 2',
    })
  );

  if (measurement.isContained && measurement.innerOffsets) {
    const outer =
      sourceRect.width * sourceRect.height >= target.width * target.height ? sourceRect : target;
    const inner = outer === sourceRect ? target : sourceRect;
    const midX = inner.left + inner.width / 2;
    const midY = inner.top + inner.height / 2;

    drawMeasurementLine(svg, labels, midX, outer.top, midX, inner.top, measurement.innerOffsets.top);
    drawMeasurementLine(svg, labels, midX, inner.bottom, midX, outer.bottom, measurement.innerOffsets.bottom);
    drawMeasurementLine(svg, labels, outer.left, midY, inner.left, midY, measurement.innerOffsets.left);
    drawMeasurementLine(svg, labels, inner.right, midY, outer.right, midY, measurement.innerOffsets.right);
    return;
  }

  if (measurement.horizontal && !measurement.horizontal.overlap) {
    const { fromX, toX, y, distance } = measurement.horizontal;
    // Subtle dashed alignment extension when target is vertically offset
    const targetMidY = target.top + target.height / 2;
    if (Math.abs(targetMidY - y) > 4) {
      svg.appendChild(
        createSvgEl('line', {
          x1: toX === target.left ? target.left : target.right,
          y1: Math.min(y, target.top),
          x2: toX === target.left ? target.left : target.right,
          y2: Math.max(y, target.bottom),
          stroke: OVERLAY_COLORS.measureLine,
          'stroke-width': 1,
          'stroke-dasharray': '3 3',
          'stroke-opacity': 0.55,
        })
      );
    }
    drawMeasurementLine(svg, labels, fromX, y, toX, y, distance);
  }

  if (measurement.vertical && !measurement.vertical.overlap) {
    const { fromY, toY, x, distance } = measurement.vertical;
    const targetMidX = target.left + target.width / 2;
    if (Math.abs(targetMidX - x) > 4) {
      svg.appendChild(
        createSvgEl('line', {
          x1: Math.min(x, target.left),
          y1: toY === target.top ? target.top : target.bottom,
          x2: Math.max(x, target.right),
          y2: toY === target.top ? target.top : target.bottom,
          stroke: OVERLAY_COLORS.measureLine,
          'stroke-width': 1,
          'stroke-dasharray': '3 3',
          'stroke-opacity': 0.55,
        })
      );
    }
    drawMeasurementLine(svg, labels, x, fromY, x, toY, distance);
  }
}
