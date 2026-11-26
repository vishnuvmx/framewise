import type { DesignSystemSummary, ElementInspection } from '@/shared/types';
import { parsePx } from '@/shared/utils/css';

function toKotlinIdentifier(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned) return 'Token';
  const pascal = cleaned[0].toUpperCase() + cleaned.slice(1);
  return /^\d/.test(pascal) ? `T${pascal}` : pascal;
}

function hexToComposeColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 8) {
    const rgb = clean.slice(0, 6);
    const alpha = clean.slice(6, 8);
    return `Color(0x${alpha}${rgb})`;
  }
  return `Color(0xFF${clean.slice(0, 6) || '000000'})`;
}

function toComposeWeight(weight: string): string {
  const num = Number(weight);
  if (num >= 800) return 'FontWeight.ExtraBold';
  if (num >= 700) return 'FontWeight.Bold';
  if (num >= 600) return 'FontWeight.SemiBold';
  if (num >= 500) return 'FontWeight.Medium';
  if (num <= 300) return 'FontWeight.Light';
  return 'FontWeight.Normal';
}

export function exportElementCompose(el: ElementInspection): string {
  const { layout, boxModel, typography, colors, geometry } = el;
  const mods: string[] = [
    'Modifier',
    `.size(width = ${Math.round(geometry.width)}.dp, height = ${Math.round(geometry.height)}.dp)`,
  ];

  const radius = Math.round(parsePx(layout.borderRadius));
  const shape = radius > 0 ? `RoundedCornerShape(${radius}.dp)` : null;

  if (colors.background.opacity > 0) {
    mods.push(
      shape
        ? `.background(${hexToComposeColor(colors.background.hex)}, ${shape})`
        : `.background(${hexToComposeColor(colors.background.hex)})`
    );
  }

  if (colors.borderColor.opacity > 0 && boxModel.border.top > 0) {
    mods.push(
      `.border(${Math.round(boxModel.border.top)}.dp, ${hexToComposeColor(colors.borderColor.hex)}${shape ? `, ${shape}` : ''})`
    );
  }

  const p = boxModel.padding;
  if (p.top === p.right && p.right === p.bottom && p.bottom === p.left && p.top > 0) {
    mods.push(`.padding(${Math.round(p.top)}.dp)`);
  } else if (p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0) {
    mods.push(
      `.padding(start = ${Math.round(p.left)}.dp, top = ${Math.round(p.top)}.dp, end = ${Math.round(p.right)}.dp, bottom = ${Math.round(p.bottom)}.dp)`
    );
  }

  const modBlock = mods.join('\n        ');
  const gap = Math.round(layout.rowGap || layout.columnGap);

  if (layout.isFlex) {
    const isColumn = layout.flexDirection?.startsWith('column');
    const comp = isColumn ? 'Column' : 'Row';
    const args = [`modifier = ${modBlock}`];
    if (gap > 0) {
      args.push(
        isColumn
          ? `verticalArrangement = Arrangement.spacedBy(${gap}.dp)`
          : `horizontalArrangement = Arrangement.spacedBy(${gap}.dp)`
      );
    }
    if (!isColumn && layout.alignItems === 'center') {
      args.push('verticalAlignment = Alignment.CenterVertically');
    }
    if (isColumn && layout.alignItems === 'center') {
      args.push('horizontalAlignment = Alignment.CenterHorizontally');
    }
    return `${comp}(\n    ${args.join(',\n    ')}\n) {\n    // ${el.selector}\n}`;
  }

  if (layout.isGrid && layout.grid && layout.grid.columns.length > 0) {
    return [
      'LazyVerticalGrid(',
      `    columns = GridCells.Fixed(${layout.grid.columns.length}),`,
      `    modifier = ${modBlock},`,
      `    horizontalArrangement = Arrangement.spacedBy(${Math.round(layout.columnGap)}.dp),`,
      `    verticalArrangement = Arrangement.spacedBy(${Math.round(layout.rowGap)}.dp)`,
      ') {',
      `    // ${el.selector}`,
      '}',
    ].join('\n');
  }

  const preview = el.textPreview ? el.textPreview.replace(/"/g, '\\"') : el.selector;
  return [
    'Text(',
    `    text = "${preview}",`,
    `    modifier = ${modBlock},`,
    `    color = ${hexToComposeColor(colors.color.hex)},`,
    `    fontSize = ${Math.round(typography.fontSizePx)}.sp,`,
    `    fontWeight = ${toComposeWeight(typography.fontWeight)}`,
    ')',
  ].join('\n');
}

export function exportComposeTokens(summary: DesignSystemSummary): string {
  const lines: string[] = [
    `// LayoutLens Jetpack Compose Design Tokens — ${summary.title || summary.url}`,
    'package com.layoutlens.tokens',
    '',
    'import androidx.compose.ui.graphics.Color',
    'import androidx.compose.ui.text.TextStyle',
    'import androidx.compose.ui.text.font.FontWeight',
    'import androidx.compose.ui.unit.dp',
    'import androidx.compose.ui.unit.sp',
    '',
    'object DesignTokens {',
    '    object Colors {',
  ];

  for (const c of summary.colors.slice(0, 16)) {
    lines.push(`        val ${toKotlinIdentifier(c.suggestedName)} = ${hexToComposeColor(c.hex)}`);
  }

  lines.push('    }', '', '    object Spacing {');
  for (const s of summary.spacing.slice(0, 12)) {
    lines.push(`        val ${toKotlinIdentifier(s.suggestedName)} = ${s.valuePx}.dp`);
  }

  lines.push('    }', '', '    object Radius {');
  for (const r of summary.radii.slice(0, 8)) {
    lines.push(`        val ${toKotlinIdentifier(r.suggestedName)} = ${r.valuePx}.dp`);
  }

  lines.push('    }', '', '    object Typography {');
  for (const t of summary.typography.slice(0, 10)) {
    lines.push(
      `        val ${toKotlinIdentifier(t.suggestedRole)} = TextStyle(fontSize = ${Math.round(t.fontSizePx)}.sp, fontWeight = ${toComposeWeight(t.fontWeight)})`
    );
  }

  lines.push('    }', '}');
  return lines.join('\n');
}
