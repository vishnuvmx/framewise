import type { BoxModel, ComputedStyleGroup, ElementGeometry, LayoutInfo, TypographyInfo } from '@/shared/types';
import { formatPx, formatSpacingShorthand, hasNonZeroSpacing } from '@/shared/utils/css';

function filterMeaningful(entries: Array<[string, string | undefined]>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!value) continue;
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed === 'normal' ||
      trimmed === 'none' ||
      trimmed === 'auto' ||
      trimmed === '0px' ||
      trimmed === 'rgba(0, 0, 0, 0)'
    ) {
      // Keep display, position, color, font-weight even when simple
      if (key !== 'display' && key !== 'position' && key !== 'box-sizing') continue;
    }
    result[key] = trimmed;
  }
  return result;
}

export function extractComputedGroups(
  style: CSSStyleDeclaration,
  geometry: ElementGeometry,
  boxModel: BoxModel,
  typography: TypographyInfo,
  layout: LayoutInfo
): ComputedStyleGroup[] {
  const groups: ComputedStyleGroup[] = [
    {
      category: 'Layout',
      properties: filterMeaningful([
        ['display', layout.display],
        ['flex-direction', layout.isFlex ? layout.flexDirection : undefined],
        ['flex-wrap', layout.isFlex ? layout.flexWrap : undefined],
        ['justify-content', layout.isFlex || layout.isGrid ? layout.justifyContent : undefined],
        ['align-items', layout.isFlex || layout.isGrid ? layout.alignItems : undefined],
        ['grid-template-columns', layout.isGrid ? layout.gridTemplateColumns : undefined],
        ['grid-template-rows', layout.isGrid ? layout.gridTemplateRows : undefined],
        ['gap', layout.gap && layout.gap !== 'normal' ? layout.gap : undefined],
        ['overflow', style.overflow !== 'visible' ? style.overflow : undefined],
      ]),
    },
    {
      category: 'Box Model',
      properties: filterMeaningful([
        ['width', formatPx(geometry.width)],
        ['height', formatPx(geometry.height)],
        ['box-sizing', boxModel.boxSizing],
        ['padding', hasNonZeroSpacing(boxModel.padding) ? formatSpacingShorthand(boxModel.padding) : undefined],
        ['margin', hasNonZeroSpacing(boxModel.margin) ? formatSpacingShorthand(boxModel.margin) : undefined],
        ['border-width', hasNonZeroSpacing(boxModel.border) ? formatSpacingShorthand(boxModel.border) : undefined],
        ['max-width', style.maxWidth !== 'none' ? style.maxWidth : undefined],
        ['min-height', style.minHeight !== '0px' ? style.minHeight : undefined],
      ]),
    },
    {
      category: 'Typography',
      properties: filterMeaningful([
        ['font-family', typography.fontFamily],
        ['font-size', typography.fontSize],
        ['font-weight', typography.fontWeight],
        ['line-height', typography.lineHeight],
        ['letter-spacing', typography.letterSpacing !== 'normal' ? typography.letterSpacing : undefined],
        ['text-align', typography.textAlign !== 'start' ? typography.textAlign : undefined],
        ['text-transform', typography.textTransform !== 'none' ? typography.textTransform : undefined],
        ['color', typography.color],
      ]),
    },
    {
      category: 'Visual',
      properties: filterMeaningful([
        ['background-color', style.backgroundColor],
        ['border-color', hasNonZeroSpacing(boxModel.border) ? style.borderTopColor : undefined],
        ['border-radius', layout.borderRadius !== '0px' ? layout.borderRadius : undefined],
        ['box-shadow', layout.boxShadow !== 'none' ? layout.boxShadow : undefined],
        ['opacity', layout.opacity < 1 ? String(layout.opacity) : undefined],
      ]),
    },
    {
      category: 'Positioning',
      properties: filterMeaningful([
        ['position', layout.position],
        ['z-index', layout.zIndex !== 'auto' ? layout.zIndex : undefined],
        ['top', layout.position !== 'static' ? style.top : undefined],
        ['right', layout.position !== 'static' ? style.right : undefined],
        ['bottom', layout.position !== 'static' ? style.bottom : undefined],
        ['left', layout.position !== 'static' ? style.left : undefined],
        ['transform', geometry.isTransformed ? geometry.transform : undefined],
      ]),
    },
  ];

  return groups.filter((group) => Object.keys(group.properties).length > 0);
}

export function buildCopyableCss(selector: string, groups: ComputedStyleGroup[]): string {
  const lines: string[] = [`${selector} {`];
  for (const group of groups) {
    for (const [prop, val] of Object.entries(group.properties)) {
      lines.push(`  ${prop}: ${val};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}
