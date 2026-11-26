import type { OverlayOptions } from '@/shared/types';

export const OVERLAY_HOST_ID = 'layoutlens-overlay-host';
export const DRAWER_HOST_ID = 'layoutlens-drawer-host';
export const REFERENCE_HOST_ID = 'layoutlens-reference-host';
export const OVERLAY_DATA_ATTR = 'data-layoutlens-ignore';
export const REFERENCE_Z_INDEX = 2147483645;
export const OVERLAY_Z_INDEX = 2147483646;
export const DRAWER_Z_INDEX = 2147483647;

export const OVERLAY_COLORS = {
  hoverStroke: '#3b82f6',
  hoverFill: 'rgba(59, 130, 246, 0.08)',
  selectedStroke: '#2563eb',
  selectedFill: 'rgba(37, 99, 235, 0.07)',
  marginFill: 'rgba(217, 119, 6, 0.2)',
  marginStroke: '#d97706',
  borderFill: 'rgba(202, 138, 4, 0.22)',
  paddingFill: 'rgba(22, 163, 74, 0.2)',
  paddingStroke: '#16a34a',
  contentFill: 'rgba(59, 130, 246, 0.14)',
  flexStroke: '#7c3aed',
  flexFill: 'rgba(124, 58, 237, 0.09)',
  gridStroke: '#db2777',
  gridFill: 'rgba(219, 39, 119, 0.07)',
  measureLine: '#e11d48',
  measureBg: '#e11d48',
} as const;

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  showBoxModel: true,
  showLayoutGuides: true,
  showMeasurements: true,
  showDimensionsBadge: true,
};

export const STORAGE_KEYS = {
  activeTabs: 'layoutlens_active_tabs',
  overlayOptions: 'layoutlens_overlay_options',
  themePreference: 'layoutlens-color-scheme',
} as const;

export const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'META',
  'LINK',
  'HEAD',
  'TITLE',
  'BASE',
  'TEMPLATE',
  'BR',
  'WBR',
]);

export const MAX_SCAN_ELEMENTS = 1500;
