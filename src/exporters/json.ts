import type { DesignSystemSummary } from '@/shared/types';

export function exportDesignTokensJson(summary: DesignSystemSummary): string {
  const payload = {
    $schema: 'https://tr.designtokens.org/format/',
    meta: {
      generator: 'Framewise',
      source: summary.url,
      title: summary.title,
      viewport: `${summary.viewport.width}x${summary.viewport.height}`,
      scannedElements: summary.scannedElements,
      extractedAt: summary.timestamp,
    },
    color: Object.fromEntries(
      summary.colors.slice(0, 20).map((c) => [
        c.suggestedName,
        {
          $type: 'color',
          $value: c.hex,
          $description: `Used ${c.count}x (${c.roles.join(', ')})`,
        },
      ])
    ),
    typography: Object.fromEntries(
      summary.typography.slice(0, 12).map((t) => [
        t.suggestedRole,
        {
          $type: 'typography',
          $value: {
            fontFamily: t.primaryFont,
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            lineHeight: t.lineHeight,
            letterSpacing: t.letterSpacing,
          },
          $description: `Used ${t.count}x on ${t.sampleTags.join(', ')}`,
        },
      ])
    ),
    spacing: Object.fromEntries(
      summary.spacing.slice(0, 16).map((s) => [
        s.suggestedName,
        {
          $type: 'dimension',
          $value: s.value,
          $description: `Observed ${s.count}x`,
        },
      ])
    ),
    radius: Object.fromEntries(
      summary.radii.slice(0, 10).map((r) => [
        r.suggestedName,
        {
          $type: 'dimension',
          $value: r.value,
          $description: `Observed ${r.count}x`,
        },
      ])
    ),
  };

  return JSON.stringify(payload, null, 2);
}
