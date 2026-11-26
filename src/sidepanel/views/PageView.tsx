import { ChevronDown, ChevronRight, Download, Eye, RefreshCw } from 'lucide-react';
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
  onHighlightGroup: (selectors: string[], variant?: 'pattern' | 'outlier') => void;
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
  onHighlightGroup,
}: PageViewProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [format, setFormat] = useState<PageExportFormat>('css');
  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null);
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

  const handleToggleGroup = (
    groupId: string,
    selectors: string[],
    variant: 'pattern' | 'outlier'
  ) => {
    if (pinnedGroupId === groupId) {
      setPinnedGroupId(null);
      onHighlightGroup([], variant);
    } else {
      setPinnedGroupId(groupId);
      onHighlightGroup(selectors, variant);
    }
  };

  if (!designSystem) {
    return (
      <EmptyState
        title={scanning ? 'Analyzing page interface…' : 'Analyze this page'}
        description="Discover repeated UI components, spot consistency outliers, build a design blueprint, and export tokens for Web, iOS, or Android."
        actionLabel={scanning ? undefined : 'Scan page'}
        onAction={scanning ? undefined : onScan}
      />
    );
  }

  const vp = designSystem.viewport ?? viewport;
  const bp = designSystem.blueprint;
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
            {designSystem.scannedElements} elements · {designSystem.components.length} patterns ·{' '}
            {designSystem.colors.length} colors
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPinnedGroupId(null);
            onHighlightGroup([]);
            onScan();
          }}
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

      {/* 2. Website Design Blueprint */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="ll-section-title">Design blueprint</span>
          <CopyButton
            text={formatPageExport(designSystem, 'report', selected)}
            label="Copy blueprint"
          />
        </div>

        <div className="divide-y divide-[var(--ll-hairline)] border-t border-b border-[var(--ll-hairline)]">
          {bp.layout.mainContainer && (
            <button
              type="button"
              onClick={() => onSelectSelector(bp.layout.mainContainer!.selector)}
              onMouseEnter={() => onHighlightSelector(bp.layout.mainContainer!.selector)}
              onMouseLeave={() => onHighlightSelector(null)}
              className="w-full min-h-9 flex items-center justify-between gap-3 px-2 py-2 text-left hover:bg-[var(--ll-raised)] transition-colors cursor-pointer"
            >
              <span className="text-[13px] text-[var(--ll-text-secondary)]">Main container</span>
              <span className="ll-mono text-[13px] text-[var(--ll-text)]">
                {formatPx(bp.layout.mainContainer.width)}
                {bp.layout.mainContainer.centered ? ' · centered' : ''}
              </span>
            </button>
          )}
          {bp.layout.primaryGrid && (
            <button
              type="button"
              onClick={() => onSelectSelector(bp.layout.primaryGrid!.selector)}
              onMouseEnter={() => onHighlightSelector(bp.layout.primaryGrid!.selector)}
              onMouseLeave={() => onHighlightSelector(null)}
              className="w-full min-h-9 flex items-center justify-between gap-3 px-2 py-2 text-left hover:bg-[var(--ll-raised)] transition-colors cursor-pointer"
            >
              <span className="text-[13px] text-[var(--ll-text-secondary)]">Primary grid</span>
              <span className="ll-mono text-[13px] text-[var(--ll-text)]">
                {bp.layout.primaryGrid.columns} cols · gap {bp.layout.primaryGrid.gap}
              </span>
            </button>
          )}
          {bp.layout.sectionSpacingPx && (
            <div className="min-h-9 flex items-center justify-between gap-3 px-2 py-2">
              <span className="text-[13px] text-[var(--ll-text-secondary)]">Section rhythm</span>
              <span className="ll-mono text-[13px]">{bp.layout.sectionSpacingPx}px</span>
            </div>
          )}
          {(bp.typography.headingFont || bp.typography.bodyFont) && (
            <div className="min-h-9 flex items-center justify-between gap-3 px-2 py-2">
              <span className="text-[13px] text-[var(--ll-text-secondary)]">Type pairing</span>
              <span className="ll-mono text-[12px] text-right truncate">
                {bp.typography.headingFont ?? '—'} / {bp.typography.bodyFont ?? '—'}
              </span>
            </div>
          )}
          {(bp.colors.accent || bp.colors.surface) && (
            <div className="min-h-9 flex items-center justify-between gap-3 px-2 py-2">
              <span className="text-[13px] text-[var(--ll-text-secondary)] shrink-0">Key colors</span>
              <div className="flex flex-wrap items-center justify-end gap-2 ll-mono text-[12px] min-w-0">
                {bp.colors.accent && (
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-[3px] border border-[var(--ll-hairline-strong)]"
                      style={{ backgroundColor: bp.colors.accent.hex }}
                    />
                    {bp.colors.accent.hex}
                  </span>
                )}
                {bp.colors.text && (
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-[3px] border border-[var(--ll-hairline-strong)]"
                      style={{ backgroundColor: bp.colors.text.hex }}
                    />
                    {bp.colors.text.hex}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Discovered Component Patterns (click/hover highlights ALL instances on page) */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="ll-section-title">Discovered components</span>
          {pinnedGroupId ? (
            <button
              type="button"
              onClick={() => {
                setPinnedGroupId(null);
                onHighlightGroup([]);
              }}
              className="ll-btn ll-btn-secondary ll-btn-sm"
            >
              Clear highlights
            </button>
          ) : (
            <span className="text-[12px] text-[var(--ll-text-muted)]">Click to highlight all</span>
          )}
        </div>

        {designSystem.components.length === 0 ? (
          <p className="text-[13px] text-[var(--ll-text-muted)]">
            No repeated component patterns detected on this page
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {designSystem.components.map((comp) => {
              const isPinned = pinnedGroupId === comp.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleToggleGroup(comp.id, comp.selectors, 'pattern')}
                  onMouseEnter={() => {
                    if (!pinnedGroupId) onHighlightGroup(comp.selectors, 'pattern');
                  }}
                  onMouseLeave={() => {
                    if (!pinnedGroupId) onHighlightGroup([]);
                  }}
                  className={`w-full px-3 py-2.5 rounded-[8px] border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isPinned
                      ? 'border-[var(--ll-accent)] bg-[var(--ll-accent-soft)]'
                      : 'border-[var(--ll-hairline)] bg-[var(--ll-raised)] hover:bg-[var(--ll-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-6 w-6 rounded-[5px] border border-[var(--ll-hairline-strong)] shrink-0"
                      style={{
                        backgroundColor:
                          comp.backgroundHex === 'TRANSPARENT' ? 'transparent' : comp.backgroundHex,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{comp.name}</div>
                      <div className="ll-mono text-[11px] text-[var(--ll-text-muted)]">
                        {comp.sampleSize.width}×{comp.sampleSize.height} · r {comp.borderRadius} ·{' '}
                        {comp.fontSize}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="ll-mono text-[12px] font-medium text-[var(--ll-accent)]">
                      {comp.count}×
                    </span>
                    <Eye
                      className={`h-3.5 w-3.5 ${
                        isPinned ? 'text-[var(--ll-accent)]' : 'text-[var(--ll-text-muted)]'
                      }`}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Component Consistency & Outlier Detection */}
      {designSystem.consistencyReports.length > 0 && (
        <section className="ll-section space-y-3">
          <span className="ll-section-title">Consistency & outliers</span>
          <div className="space-y-3">
            {designSystem.consistencyReports.map((report) => {
              const groupKey = `outlier:${report.category}`;
              const isPinned = pinnedGroupId === groupKey;
              return (
                <div
                  key={report.category}
                  className="ll-raised p-3 space-y-2.5 border border-[var(--ll-hairline)] overflow-hidden min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        {report.categoryLabel}{' '}
                        <span className="ll-mono text-[12px] text-[var(--ll-text-muted)]">
                          ({report.totalInstances})
                        </span>
                      </div>
                      <div className="ll-mono text-[11px] text-[var(--ll-text-muted)] truncate">
                        Baseline: {report.baseline.heightPx}px · r {report.baseline.borderRadius} ·{' '}
                        {report.baseline.fontSize}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleGroup(
                          groupKey,
                          report.outliers.map((o) => o.selector),
                          'outlier'
                        )
                      }
                      className={`ll-btn ll-btn-sm shrink-0 ${
                        isPinned ? 'll-btn-danger' : 'll-btn-secondary'
                      }`}
                    >
                      {isPinned ? 'Hide' : `${report.outliers.length} outliers`}
                    </button>
                  </div>

                  <div className="divide-y divide-[var(--ll-hairline)] border-t border-[var(--ll-hairline)]">
                    {report.outliers.map((outlier, idx) => (
                      <button
                        key={`${outlier.selector}-${idx}`}
                        type="button"
                        onClick={() => onSelectSelector(outlier.selector)}
                        onMouseEnter={() => onHighlightSelector(outlier.selector)}
                        onMouseLeave={() => onHighlightSelector(null)}
                        className="w-full py-2.5 flex flex-col items-start gap-1 text-left hover:text-[var(--ll-accent)] transition-colors cursor-pointer min-w-0"
                      >
                        <span className="text-[13px] font-medium text-[var(--ll-text)] truncate w-full">
                          {outlier.label}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 ll-mono text-[11px] text-[var(--ll-negative)] break-words w-full">
                          {outlier.reasons.map((reason, rIdx) => (
                            <span key={rIdx}>
                              {rIdx > 0 ? '· ' : ''}
                              {reason}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Export Design System (Web CSS / Tailwind v4 / iOS SwiftUI / Android Compose / JSON / Report) */}
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

      {/* 6. Color Palette */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between">
          <span className="ll-section-title">Colors</span>
          <span className="ll-mono text-[12px] text-[var(--ll-text-muted)]">
            {designSystem.colors.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
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

      {/* 7. Typography Scale */}
      <section className="ll-section space-y-3">
        <div className="flex items-center justify-between">
          <span className="ll-section-title">Typography</span>
          <span className="ll-mono text-[12px] text-[var(--ll-text-muted)] truncate max-w-[200px]">
            {designSystem.fontFamilies.map((f) => f.name).slice(0, 2).join(', ')}
          </span>
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
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

      {/* 8. Spacing & Border Radii */}
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

      {/* 9. Collapsible Layout Containers & Flex/Grid Tree */}
      {(designSystem.containers.length > 0 || designSystem.layoutTree.length > 0) && (
        <section>
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
    </div>
  );
}
