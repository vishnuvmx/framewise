import { createSvgEl } from '@/content/overlay/overlay-host';
import { OVERLAY_COLORS } from '@/shared/constants';
import type { ElementInspection } from '@/shared/types';
import { formatPx, hasNonZeroSpacing } from '@/shared/utils/css';

function addBandRect(
  svg: SVGSVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string
): void {
  if (width <= 0 || height <= 0) return;
  svg.appendChild(
    createSvgEl('rect', {
      x,
      y,
      width,
      height,
      fill,
    })
  );
}

function addEdgePill(
  labels: HTMLDivElement,
  x: number,
  y: number,
  value: number,
  variant: 'margin' | 'padding',
  rightInset: number
): void {
  if (value < 8) return;
  const maxX = Math.max(40, window.innerWidth - rightInset - 16);
  if (x < 16 || x > maxX || y < 14 || y > window.innerHeight - 14) return;
  const pill = document.createElement('span');
  pill.className = `fw-pill fw-pill--${variant}`;
  pill.style.left = `${Math.round(x)}px`;
  pill.style.top = `${Math.round(y)}px`;
  pill.textContent = formatPx(value);
  labels.appendChild(pill);
}

/**
 * Renders color-coded margin (orange), border (yellow), padding (green),
 * and content (blue) overlay bands around an inspected element.
 */
export function renderBoxModelOverlay(
  svg: SVGSVGElement,
  labels: HTMLDivElement,
  inspection: ElementInspection,
  rightInset = 0
): void {
  const { left, top, width, height } = inspection.geometry;
  const { margin, border, padding } = inspection.boxModel;

  // Margin bands (outside border box)
  addBandRect(svg, left - margin.left, top - margin.top, width + margin.left + margin.right, margin.top, OVERLAY_COLORS.marginFill);
  addBandRect(svg, left - margin.left, top + height, width + margin.left + margin.right, margin.bottom, OVERLAY_COLORS.marginFill);
  addBandRect(svg, left - margin.left, top, margin.left, height, OVERLAY_COLORS.marginFill);
  addBandRect(svg, left + width, top, margin.right, height, OVERLAY_COLORS.marginFill);

  // Border box inner edge
  const padLeft = left + border.left;
  const padTop = top + border.top;
  const padBoxW = Math.max(0, width - border.left - border.right);
  const padBoxH = Math.max(0, height - border.top - border.bottom);

  // Border bands
  addBandRect(svg, left, top, width, border.top, OVERLAY_COLORS.borderFill);
  addBandRect(svg, left, top + height - border.bottom, width, border.bottom, OVERLAY_COLORS.borderFill);
  addBandRect(svg, left, padTop, border.left, padBoxH, OVERLAY_COLORS.borderFill);
  addBandRect(svg, left + width - border.right, padTop, border.right, padBoxH, OVERLAY_COLORS.borderFill);

  // Padding bands
  const contentLeft = padLeft + padding.left;
  const contentTop = padTop + padding.top;
  const contentW = Math.max(0, padBoxW - padding.left - padding.right);
  const contentH = Math.max(0, padBoxH - padding.top - padding.bottom);

  addBandRect(svg, padLeft, padTop, padBoxW, padding.top, OVERLAY_COLORS.paddingFill);
  addBandRect(svg, padLeft, contentTop + contentH, padBoxW, padding.bottom, OVERLAY_COLORS.paddingFill);
  addBandRect(svg, padLeft, contentTop, padding.left, contentH, OVERLAY_COLORS.paddingFill);
  addBandRect(svg, contentLeft + contentW, contentTop, padding.right, contentH, OVERLAY_COLORS.paddingFill);

  // Only tint inner content when element actually has margin/padding so plain text stays crisp
  if (hasNonZeroSpacing(margin) || hasNonZeroSpacing(padding)) {
    addBandRect(svg, contentLeft, contentTop, contentW, contentH, OVERLAY_COLORS.contentFill);
  }

  // Edge labels for large-enough spacing values within visible viewport
  if (margin.top >= 14) addEdgePill(labels, left + width / 2, top - margin.top / 2, margin.top, 'margin', rightInset);
  if (margin.bottom >= 14) addEdgePill(labels, left + width / 2, top + height + margin.bottom / 2, margin.bottom, 'margin', rightInset);
  if (margin.left >= 18) addEdgePill(labels, left - margin.left / 2, top + height / 2, margin.left, 'margin', rightInset);
  if (margin.right >= 18) addEdgePill(labels, left + width + margin.right / 2, top + height / 2, margin.right, 'margin', rightInset);

  if (padding.top >= 14) addEdgePill(labels, left + width / 2, padTop + padding.top / 2, padding.top, 'padding', rightInset);
  if (padding.bottom >= 14) addEdgePill(labels, left + width / 2, contentTop + contentH + padding.bottom / 2, padding.bottom, 'padding', rightInset);
  if (padding.left >= 18) addEdgePill(labels, padLeft + padding.left / 2, top + height / 2, padding.left, 'padding', rightInset);
  if (padding.right >= 18) addEdgePill(labels, contentLeft + contentW + padding.right / 2, top + height / 2, padding.right, 'padding', rightInset);
}
