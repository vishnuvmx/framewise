import type {
  ColorToken,
  ComponentCategory,
  ComponentPattern,
  ContainerWidthToken,
  DesignBlueprint,
  LayoutNodeSummary,
  ScaleToken,
  TypographyToken,
  ViewportInfo,
} from '@/shared/types';
import { parseRgbaString } from '@/shared/utils/css';

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  button: 'Buttons',
  'icon-button': 'Icon buttons',
  card: 'Cards',
  input: 'Inputs',
  badge: 'Badges',
  'nav-link': 'Nav links',
};

function isChromatic(hex: string): boolean {
  const rgb = parseRgbaString(hex);
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max > 0 && (max - min) / max > 0.22;
}

function isMonoStack(stack: string): boolean {
  return /mono|consolas|menlo|fira code|jetbrains|courier/i.test(stack);
}

/**
 * Synthesizes a structured Website Design Blueprint from extracted page data,
 * pairing detected design roles with source selectors and confidence levels.
 */
export function buildDesignBlueprint(params: {
  viewport: ViewportInfo;
  colors: ColorToken[];
  typography: TypographyToken[];
  fontFamilies: Array<{ name: string; stack: string; count: number }>;
  spacing: ScaleToken[];
  containers: ContainerWidthToken[];
  layoutTree: LayoutNodeSummary[];
  components: ComponentPattern[];
}): DesignBlueprint {
  const { viewport, colors, typography, fontFamilies, spacing, containers, layoutTree, components } =
    params;

  // Layout blueprint
  const mainContainer =
    containers.find((c) => c.centered && c.width >= 640) ?? containers[0] ?? null;

  const primaryGridNode =
    layoutTree.find((n) => n.type === 'grid' && Number.parseInt(n.directionOrCols, 10) >= 2) ??
    null;

  const sectionSpacing =
    spacing.filter((s) => s.valuePx >= 32 && s.valuePx <= 128).sort((a, b) => b.count - a.count)[0]
      ?.valuePx ?? null;

  // Typography blueprint
  const headingToken =
    typography.find((t) => t.sampleTags.some((tag) => tag === 'h1' || tag === 'h2')) ??
    typography[0] ??
    null;
  const bodyToken =
    typography.find(
      (t) => t.fontSizePx >= 13 && t.fontSizePx <= 18 && t.sampleTags.includes('p')
    ) ??
    typography.find((t) => t.fontSizePx >= 13 && t.fontSizePx <= 18) ??
    typography[typography.length - 1] ??
    null;
  const monoFamily = fontFamilies.find((f) => isMonoStack(f.stack))?.name ?? null;

  // Color roles blueprint
  const accentColor = colors.find((c) => isChromatic(c.hex)) ?? null;
  const textColor = colors.find((c) => c.roles.includes('text')) ?? null;
  const surfaceColor = colors.find((c) => c.roles.includes('background')) ?? null;

  // Component inventory summary
  const byCat = new Map<ComponentCategory, { patterns: number; instances: number }>();
  for (const comp of components) {
    const cur = byCat.get(comp.category) ?? { patterns: 0, instances: 0 };
    cur.patterns += 1;
    cur.instances += comp.count;
    byCat.set(comp.category, cur);
  }

  const componentCounts = Array.from(byCat.entries()).map(([category, stats]) => ({
    category,
    label: CATEGORY_LABELS[category],
    patterns: stats.patterns,
    instances: stats.instances,
  }));

  return {
    layout: {
      mainContainer: mainContainer
        ? {
            selector: mainContainer.selector,
            width: mainContainer.width,
            maxWidth: mainContainer.maxWidth,
            centered: mainContainer.centered,
          }
        : null,
      primaryGrid: primaryGridNode
        ? {
            selector: primaryGridNode.selector,
            columns: Number.parseInt(primaryGridNode.directionOrCols, 10) || 1,
            gap: primaryGridNode.gap,
          }
        : null,
      sectionSpacingPx: sectionSpacing,
      breakpoint: viewport.breakpoint,
    },
    typography: {
      headingFont: headingToken?.primaryFont ?? fontFamilies[0]?.name ?? null,
      headingSize: headingToken?.fontSize ?? null,
      bodyFont: bodyToken?.primaryFont ?? fontFamilies[0]?.name ?? null,
      bodySize: bodyToken?.fontSize ?? null,
      monoFont: monoFamily,
    },
    colors: {
      accent: accentColor
        ? {
            hex: accentColor.hex,
            confidence: accentColor.count >= 4 ? 'high' : 'medium',
            count: accentColor.count,
          }
        : null,
      text: textColor
        ? {
            hex: textColor.hex,
            confidence: textColor.count >= 6 ? 'high' : 'medium',
            count: textColor.count,
          }
        : null,
      surface: surfaceColor
        ? {
            hex: surfaceColor.hex,
            confidence: surfaceColor.count >= 6 ? 'high' : 'medium',
            count: surfaceColor.count,
          }
        : null,
    },
    componentCounts,
  };
}
