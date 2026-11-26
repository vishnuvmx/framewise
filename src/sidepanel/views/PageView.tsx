import { ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatPageExport,
  PAGE_EXPORT_FORMATS,
  type PageExportFormat,
} from '@/exporters';
import { CopyButton, copyToClipboard } from '@/sidepanel/components/CopyButton';
import { EmptyState } from '@/sidepanel/components/EmptyState';
import type { DesignSystemSummary, ElementInspection, ViewportInfo } from '@/shared/types';
import { formatPx } from '@/shared/utils/css';

interface PageViewProps {
  designSystem: DesignSystemSummary | null;
  selected: ElementInspection | null;
  viewport: ViewportInfo | null;
  scanning: boolean;
  onScan: () => void;
  onSelectSelector: (selector: string) => void;
  onHighlightSelector: (selector: string | null) => void;
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PageView({
  designSystem,
  selected,
  viewport,
  scanning,
  onScan,
  onSelectSelector,
  onHighlightSelector,
}: PageViewProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [format, setFormat] = useState<PageExportFormat>('css');
  const [layoutTreeOpen, setLayoutTreeOpen] = useState(false);

  const exportedOutput = useMemo(() => {
    if (!designSystem) return '';
    return formatPageExport(designSystem, format, selected);
  }, [designSystem, selected, format]);

  const handleCopyHex = async (hex: string) => {
    const ok = await copyToClipboard(hex);
    if (!ok) return;
    setCopiedHex(hex);
    window.setTimeout(() => setCopiedHex(null), 1200);
  };

  if (!designSystem) {
    return (
      <EmptyState
        title={scanning ? 'Scanning page design system…' : 'Analyze this page'}
        description="Extract the color palette, typography scale, spacing rhythm, and export tokens for Web, iOS (SwiftUI), or Android (Compose)."
        actionLabel={scanning ? undefined : 'Scan page'}
        onAction={scanning ? undefined : onScan}
      />
    );
  }

  const vp = designSystem.viewport ?? viewport;
  const maxSpace = Math.max(...designSystem.spacing.map((s) => s.valuePx), 64);
  const dominantSpaceCount = Math.max(...designSystem.spacing.map((s) => s.count), 0);

  const handleDownload = () => {
    const meta = PAGE_EXPORT_FORMATS.find((f) => f.id === format) ?? PAGE_EXPORT_FORMATS[0];
    downloadTextFile(`layoutlens-${meta.ext}`, exportedOutput, meta.mime);
  };

  return (
    <div>
      {/* 1. Viewport + Scan Summary */}
      <section className="ll-section bg-[var(--ll-surface)] flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          {vp && (
            <div className="ll-mono text-[14px] font-medium">
              {vp.width} × {vp.height}px
              <span className="mx-1.5 text-[var(--ll-text-muted)]">·</span>
              <span className="text-[var(--ll-accent)]">{vp.breakpoint}</span>
              <span className="mx-1.5 text-[var(--ll-text-muted)]">·</span>
              {vp.devicePixelRatio}x
            </div>
          )}
          <div className="ll-mono text-[12px] text-[var(--ll-text-muted)]">
            {designSystem.scannedElements} elements · {designSystem.colors.length} colors ·{' '}
            {designSystem.typography.length} styles
          </div>
        </div>
        <button
          type="button"
          onClick={onScan}
          disabled={scanning}
          className="ll-btn ll-btn-secondary ll-btn-sm shrink-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-[var(--ll-text-muted)] ${scanning ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          <span>Rescan</span>
        </button>
      </section>

      {/* 2. Export Design System (Web CSS / Tailwind v4 / iOS SwiftUI / Android Compose / JSON / Report) */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="ll-section-title">Export design system</span>
          <div className="flex items-center gap-1.5">
            <CopyButton text={exportedOutput} label="Copy" />
            <button
              type="button"
              onClick={handleDownload}
              className="ll-btn ll-btn-secondary ll-btn-sm"
            >
              <Download className="h-3.5 w-3.5 text-[var(--ll-text-muted)]" strokeWidth={1.5} />
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-[8px] bg-[var(--ll-raised)] border border-[var(--ll-hairline)]">
          {PAGE_EXPORT_FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={`h-8 rounded-[6px] text-[13px] transition-colors cursor-pointer ${
                format === item.id
                  ? 'bg-[var(--ll-surface)] text-[var(--ll-text)] font-medium border border-[var(--ll-hairline)]'
                  : 'text-[var(--ll-text-muted)] hover:text-[var(--ll-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <pre className="ll-code-block max-h-56 overflow-y-auto">{exportedOutput}</pre>
      </section>

      {/* 3. Color Palette */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between">
          <span className="ll-section-title">Colors</span>
          <span className="ll-mono text-[12px] text-[var(--ll-text-muted)]">
            {designSystem.colors.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {designSystem.colors.slice(0, 16).map((token) => (
            <button
              key={token.hex}
              type="button"
              onClick={() => void handleCopyHex(token.hex)}
              title={`Copy ${token.hex}`}
              className="ll-raised p-2 flex items-center gap-2.5 text-left hover:bg-[var(--ll-hover)] transition-colors cursor-pointer"
            >
              <span
                className="h-7 w-7 rounded-[5px] border border-[var(--ll-hairline-strong)] shrink-0"
                style={{ backgroundColor: token.rgba }}
              />
              <div className="min-w-0">
                <div className="ll-mono text-[12px] font-medium truncate">
                  {copiedHex === token.hex ? (
                    <span className="text-[var(--ll-positive)]">Copied</span>
                  ) : (
                    token.hex
                  )}
                </div>
                <div className="text-[11px] text-[var(--ll-text-muted)] truncate">
                  {token.suggestedName} · {token.count}×
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Typography Scale */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between">
          <span className="ll-section-title">Typography</span>
          <span className="ll-mono text-[12px] text-[var(--ll-text-muted)] truncate max-w-[200px]">
            {designSystem.fontFamilies.map((f) => f.name).slice(0, 2).join(', ')}
          </span>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {designSystem.typography.slice(0, 10).map((token) => (
            <div
              key={token.id}
              className="ll-raised px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="ll-mono text-[12px] font-medium">{token.suggestedRole}</span>
                  <span className="text-[12px] text-[var(--ll-text-secondary)] truncate">
                    {token.primaryFont}
                  </span>
                </div>
                <div className="ll-mono text-[11px] text-[var(--ll-text-muted)]">
                  {token.fontSize} / {token.lineHeight} · w{token.fontWeight} · {token.count}×
                </div>
              </div>
              <CopyButton
                text={`font-family: ${token.fontFamily};\nfont-size: ${token.fontSize};\nfont-weight: ${token.fontWeight};\nline-height: ${token.lineHeight};`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 5. Spacing & Border Radii */}
      {(designSystem.spacing.length > 0 || designSystem.radii.length > 0) && (
        <section className="ll-section space-y-4">
          {designSystem.spacing.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="ll-section-title">Spacing scale</span>
                <span className="ll-mono text-[11px] text-[var(--ll-text-muted)]">count</span>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {designSystem.spacing.slice(0, 10).map((token) => {
                  const isDominant = token.count === dominantSpaceCount;
                  return (
                    <div key={token.value} className="flex items-center gap-3 text-[12px]">
                      <span className="ll-mono w-12 shrink-0">{token.value}</span>
                      <div className="flex-1 h-1.5 rounded-[2px] bg-[var(--ll-raised)] overflow-hidden">
                        <div
                          className="h-full rounded-[2px]"
                          style={{
                            width: `${Math.max(6, Math.min(100, (token.valuePx / maxSpace) * 100))}%`,
                            backgroundColor: isDominant
                              ? 'var(--ll-accent-fill)'
                              : 'var(--ll-text-muted)',
                          }}
                        />
                      </div>
                      <span className="ll-mono text-[11px] text-[var(--ll-text-muted)] w-10 text-right shrink-0">
                        {token.count}×
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {designSystem.radii.length > 0 && (
            <div className="space-y-2">
              <span className="ll-section-title">Border radii</span>
              <div className="flex flex-wrap gap-2">
                {designSystem.radii.map((token) => (
                  <div
                    key={token.value}
                    className="ll-raised px-2.5 py-1.5 inline-flex items-center gap-2 text-[12px]"
                  >
                    <span
                      className="h-4 w-4 border border-[var(--ll-text-secondary)] bg-[var(--ll-surface)] shrink-0"
                      style={{ borderRadius: `${Math.min(token.valuePx, 8)}px` }}
                    />
                    <span className="ll-mono font-medium">{token.value}</span>
                    <span className="ll-mono text-[11px] text-[var(--ll-text-muted)]">
                      {token.count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 6. Collapsible Layout Containers & Flex/Grid Tree */}
      {(designSystem.containers.length > 0 || designSystem.layoutTree.length > 0) && (
        <section className="border-b border-[var(--ll-hairline)]">
          <button
            type="button"
            onClick={() => setLayoutTreeOpen((v) => !v)}
            aria-expanded={layoutTreeOpen}
            className="w-full px-5 h-12 flex items-center justify-between text-left hover:bg-[var(--ll-surface)] transition-colors cursor-pointer"
          >
            <span className="ll-section-title">
              Containers & grids{' '}
              <span className="ll-mono text-[12px] text-[var(--ll-text-muted)] ml-1">
                {designSystem.containers.length} containers · {designSystem.layoutTree.length}{' '}
                layouts
              </span>
            </span>
            {layoutTreeOpen ? (
              <ChevronDown className="h-4 w-4 text-[var(--ll-text-muted)]" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--ll-text-muted)]" strokeWidth={1.5} />
            )}
          </button>

          {layoutTreeOpen && (
            <div className="px-5 pb-5 space-y-4">
              {designSystem.containers.length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {designSystem.containers.map((c, idx) => (
                    <button
                      key={`${c.selector}-${idx}`}
                      type="button"
                      onClick={() => onSelectSelector(c.selector)}
                      onMouseEnter={() => onHighlightSelector(c.selector)}
                      onMouseLeave={() => onHighlightSelector(null)}
                      className="ll-row w-full text-left cursor-pointer"
                    >
                      <span className="ll-mono text-[12px] truncate">{c.selector}</span>
                      <span className="ll-mono text-[12px] text-[var(--ll-text-secondary)] shrink-0">
                        {formatPx(c.width)}
                        {c.centered ? ' · centered' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {designSystem.layoutTree.length > 0 && (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {designSystem.layoutTree.map((node, idx) => (
                    <button
                      key={`${node.selector}-${idx}`}
                      type="button"
                      onClick={() => onSelectSelector(node.selector)}
                      onMouseEnter={() => onHighlightSelector(node.selector)}
                      onMouseLeave={() => onHighlightSelector(null)}
                      style={{ paddingLeft: `${8 + Math.min(node.depth, 5) * 12}px` }}
                      className="ll-row w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="ll-mono text-[11px] text-[var(--ll-accent)] w-8 shrink-0">
                          {node.type}
                        </span>
                        <span className="ll-mono text-[12px] truncate">{node.selector}</span>
                      </div>
                      <span className="ll-mono text-[11px] text-[var(--ll-text-muted)] shrink-0">
                        {node.directionOrCols} · {node.gap}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 7. Consistency Notes (adaptive) */}
      {designSystem.issues.length > 0 && (
        <section className="ll-section space-y-2.5">
          <span className="ll-section-title">Consistency notes</span>
          <div className="space-y-2">
            {designSystem.issues.map((issue, idx) => (
              <div key={`${issue.category}-${idx}`} className="ll-raised px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2 text-[13px]">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        issue.severity === 'warning' ? 'var(--ll-warn)' : 'var(--ll-accent-fill)',
                    }}
                  />
                  <span>{issue.message}</span>
                </div>
                <div className="ll-mono text-[11px] text-[var(--ll-text-muted)] pl-3.5 break-words">
                  {issue.values.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
