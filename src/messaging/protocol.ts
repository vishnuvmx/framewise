import { z } from 'zod';
import type {
  DesignSystemSummary,
  DistanceMeasurement,
  ElementInspection,
  OverlayOptions,
  ViewportInfo,
} from '@/shared/types';

export const OverlayOptionsSchema = z.object({
  showBoxModel: z.boolean(),
  showLayoutGuides: z.boolean(),
  showMeasurements: z.boolean(),
  showDimensionsBadge: z.boolean(),
});

export const RuntimeCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PING') }),
  z.object({ type: z.literal('TOGGLE_DRAWER'), tabId: z.number().optional() }),
  z.object({ type: z.literal('OPEN_DRAWER'), tabId: z.number().optional() }),
  z.object({ type: z.literal('CLOSE_DRAWER'), tabId: z.number().optional() }),
  z.object({ type: z.literal('TOGGLE_INSPECTOR'), tabId: z.number().optional(), active: z.boolean() }),
  z.object({ type: z.literal('GET_TAB_STATE'), tabId: z.number().optional() }),
  z.object({
    type: z.literal('UPDATE_OVERLAY_OPTIONS'),
    tabId: z.number().optional(),
    options: OverlayOptionsSchema,
  }),
  z.object({ type: z.literal('SCAN_DESIGN_SYSTEM'), tabId: z.number().optional() }),
  z.object({
    type: z.literal('SELECT_BY_SELECTOR'),
    tabId: z.number().optional(),
    selector: z.string(),
  }),
  z.object({
    type: z.literal('HIGHLIGHT_BY_SELECTOR'),
    tabId: z.number().optional(),
    selector: z.string().nullable(),
  }),
  z.object({ type: z.literal('CLEAR_SELECTION'), tabId: z.number().optional() }),
  z.object({ type: z.literal('UNLOCK_SELECTION'), tabId: z.number().optional() }),
]);

export type RuntimeCommand = z.infer<typeof RuntimeCommandSchema>;

export interface ContentEventMap {
  CONTENT_READY: {
    type: 'CONTENT_READY';
    viewport: ViewportInfo;
  };
  INSPECTION_HOVER: {
    type: 'INSPECTION_HOVER';
    inspection: ElementInspection | null;
    measurement: DistanceMeasurement | null;
  };
  INSPECTION_SELECT: {
    type: 'INSPECTION_SELECT';
    inspection: ElementInspection | null;
    locked: boolean;
  };
  INSPECTION_STATE_CHANGE: {
    type: 'INSPECTION_STATE_CHANGE';
    active: boolean;
    locked: boolean;
    viewport: ViewportInfo;
  };
  VIEWPORT_RESIZED: {
    type: 'VIEWPORT_RESIZED';
    viewport: ViewportInfo;
  };
}

export type ContentEvent = ContentEventMap[keyof ContentEventMap];

export interface CommandResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface TabStatePayload {
  tabId: number;
  url: string;
  title: string;
  inspectable: boolean;
  active: boolean;
  locked: boolean;
  viewport: ViewportInfo | null;
  selected: ElementInspection | null;
  overlayOptions: OverlayOptions;
}

export type DesignSystemResponse = CommandResponse<DesignSystemSummary>;
export type TabStateResponse = CommandResponse<TabStatePayload>;
