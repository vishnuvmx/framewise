import type { DesignSystemSummary, ElementInspection } from '@/shared/types';
import { formatPx, formatSpacingShorthand } from '@/shared/utils/css';

export function exportTypographyConfig(summary: DesignSystemSummary): string {
  const config = {
    fontFamily: Object.fromEntries(
      summary.fontFamilies.slice(0, 5).map((f, i) => [
        i === 0 ? 'sans' : i === 1 ? 'secondary' : `font-${i + 1}`,
        f.stack.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')),
      ])
    ),
    fontSize: Object.fromEntries(
      summary.typography.slice(0, 12).map((t) => [
        t.suggestedRole,
        [
          t.fontSize,
          {
            lineHeight: t.lineHeight,
            fontWeight: t.fontWeight,
            letterSpacing: t.letterSpacing,
          },
        ],
      ])
    ),
  };
  return JSON.stringify(config, null, 2);
}

export function exportInspectionReport(
  summary: DesignSystemSummary,
  selected: ElementInspection | null
): string {
  const lines: string[] = [
    `# LayoutLens Inspection Report`,
    '',
    `- **Page:** ${summary.title || 'Untitled'} (${summary.url})`,
    `- **Viewport:** ${summary.viewport.width} × ${summary.viewport.height}px (${summary.viewport.breakpoint.toUpperCase()}, DPR ${summary.viewport.devicePixelRatio}x)`,
    `- **Scanned Elements:** ${summary.scannedElements}`,
    `- **Generated:** ${summary.timestamp}`,
    '',
  ];

  if (selected) {
    lines.push(
      `## Selected Element: \`${selected.selector}\``,
      '',
      `- **Dimensions:** ${formatPx(selected.geometry.width)} × ${formatPx(selected.geometry.height)}`,
      `- **Display / Position:** \`${selected.layout.display}\` / \`${selected.layout.position}\``,
      `- **Padding:** \`${formatSpacingShorthand(selected.boxModel.padding)}\``,
      `- **Margin:** \`${formatSpacingShorthand(selected.boxModel.margin)}\``,
      `- **Typography:** ${selected.typography.primaryFont} · ${selected.typography.fontSize} / ${selected.typography.lineHeight} · weight ${selected.typography.fontWeight}`,
      `- **Colors:** text \`${selected.colors.color.hex}\`, background \`${selected.colors.background.hex}\`${selected.colors.contrastRatio ? ` (contrast ${selected.colors.contrastRatio}:1 · ${selected.colors.contrastGrade})` : ''}`,
      '',
      '```css',
      selected.copyableCss,
      '```',
      ''
    );
  }

  if (summary.blueprint) {
    const bp = summary.blueprint;
    lines.push('## Website Design Blueprint', '');
    if (bp.layout.mainContainer) {
      lines.push(
        `- **Main Container:** \`${bp.layout.mainContainer.selector}\` (${formatPx(bp.layout.mainContainer.width)}, max-width: \`${bp.layout.mainContainer.maxWidth}\`${bp.layout.mainContainer.centered ? ', centered' : ''})`
      );
    }
    if (bp.layout.primaryGrid) {
      lines.push(
        `- **Primary Grid:** ${bp.layout.primaryGrid.columns} columns · gap \`${bp.layout.primaryGrid.gap}\` (\`${bp.layout.primaryGrid.selector}\`)`
      );
    }
    if (bp.layout.sectionSpacingPx) {
      lines.push(`- **Dominant Section Rhythm:** \`${bp.layout.sectionSpacingPx}px\``);
    }
    if (bp.typography.headingFont || bp.typography.bodyFont) {
      lines.push(
        `- **Typography Roles:** Heading \`${bp.typography.headingFont ?? '—'}\` (${bp.typography.headingSize ?? '—'}) · Body \`${bp.typography.bodyFont ?? '—'}\` (${bp.typography.bodySize ?? '—'})${bp.typography.monoFont ? ` · Mono \`${bp.typography.monoFont}\`` : ''}`
      );
    }
    if (bp.colors.accent || bp.colors.text || bp.colors.surface) {
      lines.push(
        `- **Color Roles:** Accent \`${bp.colors.accent?.hex ?? '—'}\` · Text \`${bp.colors.text?.hex ?? '—'}\` · Surface \`${bp.colors.surface?.hex ?? '—'}\``
      );
    }
    lines.push('');
  }

  if (summary.components && summary.components.length > 0) {
    lines.push(`## Discovered Component Patterns (${summary.components.length})`, '');
    for (const comp of summary.components) {
      lines.push(
        `- **${comp.name}** (${comp.count}×) — ${comp.sampleSize.width}×${comp.sampleSize.height}px · radius \`${comp.borderRadius}\` · font \`${comp.fontSize}\``
      );
    }
    lines.push('');
  }

  if (summary.consistencyReports && summary.consistencyReports.length > 0) {
    lines.push(`## Component Consistency & Outliers`, '');
    for (const report of summary.consistencyReports) {
      lines.push(
        `### ${report.categoryLabel} (${report.totalInstances} detected — baseline ${report.baseline.heightPx}px height, ${report.baseline.borderRadius} radius, ${report.baseline.fontSize} font)`
      );
      for (const outlier of report.outliers) {
        lines.push(`- \`${outlier.label}\` (\`${outlier.selector}\`): ${outlier.reasons.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push(`## Color Palette (${summary.colors.length} colors)`, '');
  for (const c of summary.colors.slice(0, 12)) {
    lines.push(`- \`${c.hex}\` — **${c.suggestedName}** (${c.count}×, ${c.roles.join('/')})`);
  }

  lines.push('', `## Typography Scale (${summary.typography.length} styles)`, '');
  for (const t of summary.typography.slice(0, 10)) {
    lines.push(
      `- **${t.suggestedRole}**: ${t.primaryFont} · \`${t.fontSize}\` / \`${t.lineHeight}\` · weight \`${t.fontWeight}\` (${t.count}×)`
    );
  }

  lines.push('', `## Spacing Scale`, '');
  lines.push(summary.spacing.map((s) => `\`${s.value}\` (${s.count}×)`).join(' · ') || '_None detected_');

  lines.push('', `## Border Radii`, '');
  lines.push(summary.radii.map((r) => `\`${r.value}\` (${r.count}×)`).join(' · ') || '_None detected_');

  if (summary.containers.length > 0) {
    lines.push('', `## Layout Containers`, '');
    for (const c of summary.containers.slice(0, 8)) {
      lines.push(
        `- \`${c.selector}\` — ${formatPx(c.width)} (max-width: \`${c.maxWidth}\`${c.centered ? ', centered' : ''})`
      );
    }
  }

  if (summary.issues.length > 0) {
    lines.push('', `## Design Consistency Notes`, '');
    for (const issue of summary.issues) {
      lines.push(`- **[${issue.category}]** ${issue.message} (${issue.values.join(', ')})`);
    }
  }

  return lines.join('\n');
}
