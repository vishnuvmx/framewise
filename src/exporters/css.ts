import type { DesignSystemSummary } from '@/shared/types';

export function exportCssVariables(summary: DesignSystemSummary): string {
  const lines: string[] = [
    `/* Framewise Design Tokens — ${summary.title || summary.url} */`,
    `/* Extracted from ${summary.scannedElements} rendered elements (${summary.viewport.width}x${summary.viewport.height}) */`,
    ':root {',
  ];

  if (summary.colors.length > 0) {
    lines.push('  /* Colors */');
    for (const color of summary.colors.slice(0, 16)) {
      lines.push(`  --fw-color-${color.suggestedName}: ${color.hex};`);
    }
  }

  if (summary.fontFamilies.length > 0) {
    lines.push('');
    lines.push('  /* Font Families */');
    summary.fontFamilies.slice(0, 5).forEach((fam, index) => {
      const slug = index === 0 ? 'primary' : index === 1 ? 'secondary' : `alt-${index + 1}`;
      lines.push(`  --fw-font-${slug}: ${fam.stack};`);
    });
  }

  if (summary.typography.length > 0) {
    lines.push('');
    lines.push('  /* Typography Sizes */');
    for (const token of summary.typography.slice(0, 10)) {
      lines.push(`  --fw-text-${token.suggestedRole}: ${token.fontSize};`);
    }
  }

  if (summary.spacing.length > 0) {
    lines.push('');
    lines.push('  /* Spacing Scale */');
    for (const space of summary.spacing.slice(0, 12)) {
      lines.push(`  --fw-${space.suggestedName}: ${space.value};`);
    }
  }

  if (summary.radii.length > 0) {
    lines.push('');
    lines.push('  /* Border Radii */');
    for (const radius of summary.radii.slice(0, 8)) {
      lines.push(`  --fw-${radius.suggestedName}: ${radius.value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
