import { describe, expect, it } from 'vitest';
import {
  exportComposeTokens,
  exportCssVariables,
  exportDesignTokensJson,
  exportElementCompose,
  exportElementSwiftUI,
  exportElementTailwind,
  exportInspectionReport,
  exportSwiftUITokens,
  exportTailwindTheme,
  exportTypographyConfig,
} from '@/exporters';
import { RuntimeCommandSchema } from '@/messaging/protocol';
import type { DesignSystemSummary, ElementInspection } from '@/shared/types';

const sampleSummary: DesignSystemSummary = {
  url: 'https://example.com',
  title: 'Example Site',
  scannedElements: 120,
  timestamp: '2026-11-26T00:00:00.000Z',
  viewport: {
    width: 1440,
    height: 900,
    devicePixelRatio: 2,
    breakpoint: 'xl',
    scrollHeight: 2400,
    scrollWidth: 1440,
    url: 'https://example.com',
    title: 'Example Site',
  },
  colors: [
    {
      hex: '#4F46E5',
      rgba: 'rgb(79, 70, 229)',
      count: 14,
      roles: ['background'],
      suggestedName: 'brand-1',
    },
  ],
  typography: [
    {
      id: 'Inter|36|700|44px',
      fontFamily: '"Inter", sans-serif',
      primaryFont: 'Inter',
      fontSize: '36px',
      fontSizePx: 36,
      fontWeight: '700',
      lineHeight: '44px',
      letterSpacing: '-0.02em',
      count: 2,
      sampleTags: ['h1'],
      suggestedRole: 'display',
    },
  ],
  fontFamilies: [{ name: 'Inter', stack: '"Inter", sans-serif', count: 40 }],
  spacing: [{ valuePx: 24, value: '24px', count: 18, suggestedName: 'space-1' }],
  radii: [{ valuePx: 12, value: '12px', count: 9, suggestedName: 'radius-xs' }],
  containers: [
    { selector: 'main.container', width: 1200, maxWidth: '1200px', centered: true, display: 'block' },
  ],
  layoutTree: [],
  issues: [],
  components: [],
  consistencyReports: [],
  blueprint: {
    layout: {
      mainContainer: {
        selector: 'main.container',
        width: 1200,
        maxWidth: '1200px',
        centered: true,
      },
      primaryGrid: null,
      sectionSpacingPx: 24,
      breakpoint: 'xl',
    },
    typography: {
      headingFont: 'Inter',
      headingSize: '36px',
      bodyFont: 'Inter',
      bodySize: '16px',
      monoFont: null,
    },
    colors: {
      accent: { hex: '#4F46E5', confidence: 'high', count: 14 },
      text: null,
      surface: null,
    },
    componentCounts: [],
  },
};

const sampleElement: ElementInspection = {
  id: 'div.hero-card',
  selector: 'div.hero-card',
  tagName: 'div',
  classes: ['hero-card'],
  textPreview: 'Hero Card',
  childCount: 2,
  inShadowDom: false,
  geometry: {
    x: 20,
    y: 40,
    width: 320,
    height: 160,
    top: 40,
    right: 340,
    bottom: 200,
    left: 20,
    scrollX: 0,
    scrollY: 0,
    contentWidth: 272,
    contentHeight: 112,
    isTransformed: false,
    transform: 'none',
    aspectRatio: 2,
  },
  boxModel: {
    margin: { top: 0, right: 0, bottom: 16, left: 0 },
    border: { top: 1, right: 1, bottom: 1, left: 1 },
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    content: { width: 272, height: 112 },
    boxSizing: 'border-box',
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    primaryFont: 'DM Sans',
    fontSize: '16px',
    fontSizePx: 16,
    fontWeight: '500',
    lineHeight: '24px',
    lineHeightRatio: 1.5,
    letterSpacing: 'normal',
    textAlign: 'start',
    textTransform: 'none',
    color: 'rgb(23, 23, 23)',
    colorHex: '#171717',
  },
  layout: {
    display: 'flex',
    position: 'relative',
    zIndex: 'auto',
    overflow: 'visible',
    isFlex: true,
    isGrid: false,
    isFlexItem: false,
    isGridItem: false,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    rowGap: 16,
    columnGap: 16,
    borderRadius: '12px',
    boxShadow: 'none',
    opacity: 1,
    insights: [],
  },
  colors: {
    color: { raw: 'rgb(23, 23, 23)', hex: '#171717', rgba: 'rgb(23, 23, 23)', opacity: 1 },
    background: { raw: 'rgb(255, 255, 255)', hex: '#FFFFFF', rgba: 'rgb(255, 255, 255)', opacity: 1 },
    borderColor: { raw: 'rgb(229, 229, 229)', hex: '#E5E5E5', rgba: 'rgb(229, 229, 229)', opacity: 1 },
    outlineColor: { raw: 'transparent', hex: 'TRANSPARENT', rgba: 'rgba(0, 0, 0, 0)', opacity: 0 },
    contrastRatio: 17.9,
    contrastGrade: 'AAA',
  },
  computedGroups: [],
  copyableCss: 'div.hero-card {\n  display: flex;\n}',
  ancestors: [],
  children: [],
  relationships: [],
};

describe('Exporters & Messaging Protocol', () => {
  it('exports valid CSS custom properties', () => {
    const css = exportCssVariables(sampleSummary);
    expect(css).toContain(':root {');
    expect(css).toContain('--fw-color-brand-1: #4F46E5;');
    expect(css).toContain('--fw-text-display: 36px;');
    expect(css).toContain('--fw-space-1: 24px;');
    expect(css).toContain('--fw-radius-xs: 12px;');
  });

  it('exports Tailwind v4 theme and element utility classes', () => {
    const theme = exportTailwindTheme(sampleSummary);
    expect(theme).toContain('@theme {');
    expect(theme).toContain('--color-brand-1: #4F46E5;');
    expect(theme).toContain('--spacing-space-1: 24px;');

    const snippet = exportElementTailwind(sampleElement);
    expect(snippet).toContain('flex');
    expect(snippet).toContain('justify-between');
    expect(snippet).toContain('items-center');
    expect(snippet).toContain('gap-4');
    expect(snippet).toContain('p-6');
    expect(snippet).toContain('rounded-xl');
  });

  it('exports SwiftUI (iOS) tokens and element view code', () => {
    const tokens = exportSwiftUITokens(sampleSummary);
    expect(tokens).toContain('import SwiftUI');
    expect(tokens).toContain('enum DesignTokens');
    expect(tokens).toContain('Color(hex: 0x4F46E5)');
    expect(tokens).toContain('static let space1: CGFloat = 24');

    const view = exportElementSwiftUI(sampleElement);
    expect(view).toContain('HStack(alignment: .center, spacing: 16)');
    expect(view).toContain('.padding(24)');
    expect(view).toContain('RoundedRectangle(cornerRadius: 12)');
    expect(view).not.toContain('Approximate from rendered CSS');
  });

  it('exports Jetpack Compose (Android) tokens and element composable', () => {
    const tokens = exportComposeTokens(sampleSummary);
    expect(tokens).toContain('object DesignTokens');
    expect(tokens).toContain('Color(0xFF4F46E5)');
    expect(tokens).toContain('24.dp');
    expect(tokens).toContain('36.sp');

    const composable = exportElementCompose(sampleElement);
    expect(composable).toContain('Row(');
    expect(composable).toContain('Arrangement.spacedBy(16.dp)');
    expect(composable).toContain('.padding(24.dp)');
    expect(composable).toContain('RoundedCornerShape(12.dp)');
    expect(composable).not.toContain('Approximate from rendered CSS');
  });

  it('adds honest approximation notes to SwiftUI and Compose snippets for CSS-specific effects', () => {
    const complexElement: ElementInspection = {
      ...sampleElement,
      geometry: { ...sampleElement.geometry, isTransformed: true, transform: 'scale(1.02)' },
      layout: {
        ...sampleElement.layout,
        position: 'sticky',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    };

    const swift = exportElementSwiftUI(complexElement);
    expect(swift).toContain(
      '// Approximate from rendered CSS — manually adapt: box-shadow, CSS transform, position: sticky'
    );

    const compose = exportElementCompose(complexElement);
    expect(compose).toContain(
      '// Approximate from rendered CSS — manually adapt: box-shadow, CSS transform, position: sticky'
    );
  });

  it('exports valid W3C Design Tokens JSON and Typography Config JSON', () => {
    const parsedTokens = JSON.parse(exportDesignTokensJson(sampleSummary));
    expect(parsedTokens.color['brand-1'].$value).toBe('#4F46E5');
    expect(parsedTokens.typography.display.$value.fontSize).toBe('36px');
    expect(parsedTokens.spacing['space-1'].$value).toBe('24px');

    const parsedType = JSON.parse(exportTypographyConfig(sampleSummary));
    expect(parsedType.fontFamily.sans[0]).toBe('Inter');
    expect(parsedType.fontSize.display[0]).toBe('36px');
  });

  it('exports Markdown inspection report', () => {
    const md = exportInspectionReport(sampleSummary, null);
    expect(md).toContain('# Framewise Inspection Report');
    expect(md).toContain('1440 × 900px');
    expect(md).toContain('#4F46E5');
  });

  it('validates runtime commands via Zod schema', () => {
    expect(RuntimeCommandSchema.safeParse({ type: 'TOGGLE_INSPECTOR', active: true }).success).toBe(
      true
    );
    expect(RuntimeCommandSchema.safeParse({ type: 'UNKNOWN_CMD' }).success).toBe(false);
  });
});
