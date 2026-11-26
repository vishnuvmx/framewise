import type { DesignSystemSummary, ElementInspection } from '@/shared/types';
import { parsePx, roundNumber } from '@/shared/utils/css';

function toSwiftIdentifier(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned) return 'token';
  const camel = cleaned[0].toLowerCase() + cleaned.slice(1);
  return /^\d/.test(camel) ? `t${camel}` : camel;
}

function hexToSwiftColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 8) {
    const rgb = clean.slice(0, 6);
    const alpha = roundNumber(Number.parseInt(clean.slice(6, 8), 16) / 255, 2);
    return `Color(hex: 0x${rgb}, opacity: ${alpha})`;
  }
  return `Color(hex: 0x${clean.slice(0, 6) || '000000'})`;
}

function toSwiftWeight(weight: string): string {
  const num = Number(weight);
  if (num >= 800) return '.heavy';
  if (num >= 700) return '.bold';
  if (num >= 600) return '.semibold';
  if (num >= 500) return '.medium';
  if (num <= 300) return '.light';
  return '.regular';
}

export function exportElementSwiftUI(el: ElementInspection): string {
  const { layout, boxModel, typography, colors, geometry } = el;
  const lines: string[] = [];

  const spacingVal = Math.round(layout.rowGap || layout.columnGap);
  const isVStack = layout.isFlex && layout.flexDirection?.startsWith('column');
  const isHStack = layout.isFlex && !isVStack;

  if (layout.isGrid && layout.grid && layout.grid.columns.length > 0) {
    lines.push(
      `LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: ${Math.round(layout.columnGap)}), count: ${layout.grid.columns.length}), spacing: ${Math.round(layout.rowGap)}) {`
    );
    lines.push(`    // ${el.selector}`);
    lines.push('}');
  } else if (isVStack) {
    lines.push(spacingVal > 0 ? `VStack(spacing: ${spacingVal}) {` : 'VStack {');
    lines.push(`    // ${el.selector}`);
    lines.push('}');
  } else if (isHStack) {
    const align = layout.alignItems === 'center' ? 'alignment: .center, ' : '';
    lines.push(
      spacingVal > 0 ? `HStack(${align}spacing: ${spacingVal}) {` : `HStack(${align.replace(/, $/, '')}) {`
    );
    lines.push(`    // ${el.selector}`);
    lines.push('}');
  } else {
    const preview = el.textPreview ? el.textPreview.replace(/"/g, '\\"') : el.selector;
    lines.push(`Text("${preview}")`);
    lines.push(
      `    .font(.system(size: ${Math.round(typography.fontSizePx)}, weight: ${toSwiftWeight(typography.fontWeight)}))`
    );
    if (colors.color.opacity > 0) {
      lines.push(`    .foregroundStyle(${hexToSwiftColor(colors.color.hex)})`);
    }
  }

  const p = boxModel.padding;
  if (p.top === p.right && p.right === p.bottom && p.bottom === p.left && p.top > 0) {
    lines.push(`.padding(${Math.round(p.top)})`);
  } else if (p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0) {
    lines.push(
      `.padding(EdgeInsets(top: ${Math.round(p.top)}, leading: ${Math.round(p.left)}, bottom: ${Math.round(p.bottom)}, trailing: ${Math.round(p.right)}))`
    );
  }

  const radius = Math.round(parsePx(layout.borderRadius));
  if (colors.background.opacity > 0) {
    if (radius > 0) {
      lines.push(
        `.background(${hexToSwiftColor(colors.background.hex)}, in: RoundedRectangle(cornerRadius: ${radius}))`
      );
    } else {
      lines.push(`.background(${hexToSwiftColor(colors.background.hex)})`);
    }
  } else if (radius > 0) {
    lines.push(`.clipShape(RoundedRectangle(cornerRadius: ${radius}))`);
  }

  if (colors.borderColor.opacity > 0 && boxModel.border.top > 0) {
    lines.push(
      `.overlay(RoundedRectangle(cornerRadius: ${radius}).stroke(${hexToSwiftColor(colors.borderColor.hex)}, lineWidth: ${roundNumber(boxModel.border.top, 1)}))`
    );
  }

  lines.push(
    `.frame(width: ${Math.round(geometry.width)}, height: ${Math.round(geometry.height)})`
  );

  return lines.join('\n');
}

export function exportSwiftUITokens(summary: DesignSystemSummary): string {
  const lines: string[] = [
    `// LayoutLens SwiftUI Design Tokens — ${summary.title || summary.url}`,
    'import SwiftUI',
    '',
    'enum DesignTokens {',
    '    enum Colors {',
  ];

  for (const c of summary.colors.slice(0, 16)) {
    lines.push(`        static let ${toSwiftIdentifier(c.suggestedName)} = ${hexToSwiftColor(c.hex)}`);
  }

  lines.push('    }', '', '    enum Spacing {');
  for (const s of summary.spacing.slice(0, 12)) {
    lines.push(`        static let ${toSwiftIdentifier(s.suggestedName)}: CGFloat = ${s.valuePx}`);
  }

  lines.push('    }', '', '    enum Radius {');
  for (const r of summary.radii.slice(0, 8)) {
    lines.push(`        static let ${toSwiftIdentifier(r.suggestedName)}: CGFloat = ${r.valuePx}`);
  }

  lines.push('    }', '', '    enum Typography {');
  for (const t of summary.typography.slice(0, 10)) {
    lines.push(
      `        static let ${toSwiftIdentifier(t.suggestedRole)} = Font.system(size: ${Math.round(t.fontSizePx)}, weight: ${toSwiftWeight(t.fontWeight)})`
    );
  }

  lines.push(
    '    }',
    '}',
    '',
    'extension Color {',
    '    init(hex: UInt, opacity: Double = 1.0) {',
    '        self.init(',
    '            .sRGB,',
    '            red: Double((hex >> 16) & 0xFF) / 255,',
    '            green: Double((hex >> 8) & 0xFF) / 255,',
    '            blue: Double(hex & 0xFF) / 255,',
    '            opacity: opacity',
    '        )',
    '    }',
    '}'
  );

  return lines.join('\n');
}
