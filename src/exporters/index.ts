import { exportComposeTokens, exportElementCompose } from '@/exporters/compose';
import { exportCssVariables } from '@/exporters/css';
import { exportDesignTokensJson } from '@/exporters/json';
import { exportElementSwiftUI, exportSwiftUITokens } from '@/exporters/swiftui';
import { exportElementTailwind, exportTailwindTheme } from '@/exporters/tailwind';
import { exportInspectionReport, exportTypographyConfig } from '@/exporters/tokens';
import type { DesignSystemSummary, ElementInspection } from '@/shared/types';

export type CodeLanguage = 'css' | 'tailwind' | 'swiftui' | 'compose';
export type PageExportFormat = 'css' | 'tailwind' | 'swiftui' | 'compose' | 'json' | 'report';

export const CODE_LANGUAGES: Array<{ id: CodeLanguage; label: string }> = [
  { id: 'css', label: 'CSS' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'swiftui', label: 'SwiftUI' },
  { id: 'compose', label: 'Compose' },
];

export const PAGE_EXPORT_FORMATS: Array<{
  id: PageExportFormat;
  label: string;
  ext: string;
  mime: string;
}> = [
  { id: 'css', label: 'CSS', ext: 'tokens.css', mime: 'text/css' },
  { id: 'tailwind', label: 'Tailwind', ext: 'theme.css', mime: 'text/css' },
  { id: 'swiftui', label: 'SwiftUI', ext: 'DesignTokens.swift', mime: 'text/plain' },
  { id: 'compose', label: 'Compose', ext: 'DesignTokens.kt', mime: 'text/plain' },
  { id: 'json', label: 'JSON', ext: 'tokens.json', mime: 'application/json' },
  { id: 'report', label: 'Report', ext: 'report.md', mime: 'text/markdown' },
];

export function formatElementCode(el: ElementInspection, lang: CodeLanguage): string {
  switch (lang) {
    case 'css':
      return el.copyableCss;
    case 'tailwind':
      return exportElementTailwind(el);
    case 'swiftui':
      return exportElementSwiftUI(el);
    case 'compose':
      return exportElementCompose(el);
  }
}

export function formatPageExport(
  summary: DesignSystemSummary,
  format: PageExportFormat,
  selected: ElementInspection | null
): string {
  switch (format) {
    case 'css':
      return exportCssVariables(summary);
    case 'tailwind':
      return exportTailwindTheme(summary);
    case 'swiftui':
      return exportSwiftUITokens(summary);
    case 'compose':
      return exportComposeTokens(summary);
    case 'json':
      return exportDesignTokensJson(summary);
    case 'report':
      return exportInspectionReport(summary, selected);
  }
}

export {
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
};
