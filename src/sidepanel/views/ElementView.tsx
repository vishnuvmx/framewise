import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CODE_LANGUAGES, type CodeLanguage, formatElementCode } from '@/exporters';
import { BoxModelDiagram } from '@/sidepanel/components/BoxModelDiagram';
import { CopyButton, copyToClipboard } from '@/sidepanel/components/CopyButton';
import { EmptyState } from '@/sidepanel/components/EmptyState';
import type { ColorSwatch, DistanceMeasurement, ElementInspection } from '@/shared/types';
import { formatPx } from '@/shared/utils/css';

interface ElementViewProps {
  inspection: ElementInspection | null;
  measurement: DistanceMeasurement | null;
  active: boolean;
  locked: boolean;
  onResume: () => void;
  onUnlock: () => void;
  onClear: () => void;
  onSelectSelector: (selector: string) => void;
  onHighlightSelector: (selector: string | null) => void;
}

function InlineSwatch({
  label,
  swatch,
  copiedHex,
  onCopy,
}: {
  label: string;
  swatch: ColorSwatch;
  copiedHex: string | null;
  onCopy: (hex: string) => void;
}) {
  const isTransparent = swatch.opacity === 0;
  return (
    <button
      type="button"
      disabled={isTransparent}
      onClick={() => !isTransparent && onCopy(swatch.hex)}
      title={isTransparent ? 'Transparent' : `Copy ${swatch.hex}`}
      className="fw-raised px-2.5 py-2 flex items-center gap-2.5 text-left hover:bg-[var(--fw-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default min-w-0"
    >
      <span
        className="h-6 w-6 rounded-[5px] border border-[var(--fw-hairline-strong)] shrink-0"
        style={{
          background: isTransparent
            ? 'repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
            : swatch.rgba,
        }}
      />
      <div className="min-w-0">
        <div className="text-[11px] text-[var(--fw-text-muted)] leading-tight">{label}</div>
        <div className="fw-mono text-[12px] font-medium truncate">
          {copiedHex === swatch.hex ? (
            <span className="text-[var(--fw-positive)]">Copied</span>
          ) : isTransparent ? (
            'none'
          ) : (
            swatch.hex
          )}
        </div>
      </div>
    </button>
  );
}

export function ElementView({
  inspection,
  measurement,
  active,
  locked,
  onResume,
  onUnlock,
  onClear,
  onSelectSelector,
  onHighlightSelector,
}: ElementViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<CodeLanguage>('css');
  const [domOpen, setDomOpen] = useState(false);
  const [cssOpen, setCssOpen] = useState(false);

  const generatedCode = useMemo(() => {
    if (!inspection) return '';
    return formatElementCode(inspection, codeLang);
  }, [inspection, codeLang]);

  if (!inspection) {
    return (
      <EmptyState
        title={active ? 'Hover any element on the page' : 'Ready to inspect'}
        description={
          active
            ? 'Move across the website to read box models, layout rules, typography, and colors. Click to lock an element and measure distances.'
            : 'Turn on live inspection to hover elements, visualize spacing, and copy code in CSS, Tailwind, SwiftUI, or Compose.'
        }
        actionLabel={active ? undefined : 'Start inspecting'}
        onAction={active ? undefined : onResume}
        shortcut={['Alt', '⇧', 'L']}
      />
    );
  }

  const { layout, typography, colors, geometry } = inspection;
  const activeLangLabel = CODE_LANGUAGES.find((l) => l.id === codeLang)?.label ?? 'CSS';

  const handleCopyValue = async (key: string, value: string) => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  };

  const layoutCss = [
    `display: ${layout.display};`,
    layout.flexDirection ? `flex-direction: ${layout.flexDirection};` : '',
    layout.justifyContent && layout.justifyContent !== 'normal'
      ? `justify-content: ${layout.justifyContent};`
      : '',
    layout.alignItems && layout.alignItems !== 'normal' ? `align-items: ${layout.alignItems};` : '',
    layout.gridTemplateColumns ? `grid-template-columns: ${layout.gridTemplateColumns};` : '',
    layout.gap ? `gap: ${layout.gap};` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const typeCss = [
    `font-family: ${typography.fontFamily};`,
    `font-size: ${typography.fontSize};`,
    `font-weight: ${typography.fontWeight};`,
    `line-height: ${typography.lineHeight};`,
    typography.letterSpacing !== 'normal' ? `letter-spacing: ${typography.letterSpacing};` : '',
    `color: ${typography.color};`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div>
      {/* 1. Element Identity + Quick Actions */}
      <section className="fw-section bg-[var(--fw-surface)] flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <code className="fw-mono text-[14px] font-medium text-[var(--fw-accent)] truncate">
              {inspection.selector}
            </code>
            {inspection.inShadowDom && (
              <span className="fw-mono text-[11px] text-[var(--fw-text-muted)] shrink-0">
                shadow
              </span>
            )}
          </div>
          <div className="fw-mono text-[13px] text-[var(--fw-text-secondary)]">
            {geometry.width} × {geometry.height}px
            <span className="mx-1.5 text-[var(--fw-text-muted)]">·</span>
            {layout.display}
            {layout.position !== 'static' && (
              <>
                <span className="mx-1.5 text-[var(--fw-text-muted)]">·</span>
                {layout.position}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CopyButton text={generatedCode} label={activeLangLabel} />
          {locked && (
            <button
              type="button"
              onClick={onUnlock}
              title="Unlock selection (Esc)"
              className="fw-btn fw-btn-secondary fw-btn-sm"
            >
              Unlock
            </button>
          )}
          {locked && (
            <button
              type="button"
              onClick={onClear}
              title="Clear selection"
              className="fw-btn fw-btn-secondary fw-btn-sm !px-2 text-[var(--fw-text-muted)]"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* 2. Live Element-to-Element Distance Measurement (adaptive) */}
      {measurement && (
        <section className="fw-section space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="fw-section-title">Distance to target</span>
            <code className="fw-mono text-[12px] text-[var(--fw-negative)] truncate">
              {measurement.targetSelector}
            </code>
          </div>
          {measurement.isContained && measurement.innerOffsets ? (
            <div className="grid grid-cols-4 gap-2">
              {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                <div key={edge} className="fw-raised px-2 py-2 text-center">
                  <div className="text-[11px] text-[var(--fw-text-muted)] capitalize">{edge}</div>
                  <div className="fw-mono text-[13px] font-medium mt-0.5">
                    {formatPx(measurement.innerOffsets![edge])}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {measurement.horizontal && !measurement.horizontal.overlap && (
                <div className="fw-raised px-3 py-2 flex items-center justify-between">
                  <span className="text-[13px] text-[var(--fw-text-secondary)]">Horizontal</span>
                  <span className="fw-mono text-[13px] font-medium">
                    {formatPx(measurement.horizontal.distance)}
                  </span>
                </div>
              )}
              {measurement.vertical && !measurement.vertical.overlap && (
                <div className="fw-raised px-3 py-2 flex items-center justify-between">
                  <span className="text-[13px] text-[var(--fw-text-secondary)]">Vertical</span>
                  <span className="fw-mono text-[13px] font-medium">
                    {formatPx(measurement.vertical.distance)}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 3. Layout Constraints Explorer */}
      {inspection.relationships && inspection.relationships.length > 0 && (
        <section className="fw-section space-y-2.5">
          <span className="fw-section-title">Layout constraints</span>
          <div className="space-y-1.5">
            {inspection.relationships.map((rel, idx) => (
              <button
                key={`${rel.role}-${idx}`}
                type="button"
                onClick={() => onSelectSelector(rel.selector)}
                onMouseEnter={() => onHighlightSelector(rel.selector)}
                onMouseLeave={() => onHighlightSelector(null)}
                className="fw-raised w-full px-3 py-2 text-left hover:bg-[var(--fw-hover)] transition-colors cursor-pointer"
              >
                <div className="text-[13px] font-medium text-[var(--fw-text)] truncate">
                  {rel.summary}
                </div>
                <div className="fw-mono text-[11px] text-[var(--fw-text-muted)] mt-0.5 truncate">
                  {rel.detail}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. Layout Intelligence (adaptive: shown when Flex/Grid) */}
      {(layout.isFlex || layout.isGrid) && (
        <section className="fw-section space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="fw-section-title">
              {layout.isGrid ? 'CSS Grid' : 'Flexbox'} layout
            </span>
            <CopyButton text={layoutCss} label="Copy" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {layout.insights
              .filter((i) => i.label !== 'Layout')
              .map((insight) => (
                <div key={insight.label} className="fw-raised px-3 py-2 min-w-0">
                  <div className="text-[11px] text-[var(--fw-text-muted)] truncate">
                    {insight.label}
                  </div>
                  <div className="fw-mono text-[13px] font-medium mt-0.5 truncate">
                    {insight.value}
                  </div>
                </div>
              ))}
          </div>

          {layout.grid && layout.grid.columns.length > 0 && (
            <div className="fw-raised px-3 py-2 flex items-center justify-between gap-2 text-[12px]">
              <span className="text-[var(--fw-text-secondary)] shrink-0">Columns</span>
              <code className="fw-mono text-right break-all">
                {layout.grid.columns.map((c) => formatPx(c)).join(' · ')}
              </code>
            </div>
          )}
        </section>
      )}

      {/* 4. Interactive Box Model + Compact Geometry */}
      <section className="fw-section space-y-4">
        <BoxModelDiagram boxModel={inspection.boxModel} />

        <div className="grid grid-cols-3 gap-2">
          <div className="fw-raised px-3 py-2 min-w-0">
            <div className="text-[11px] text-[var(--fw-text-muted)]">Position</div>
            <div className="fw-mono text-[13px] font-medium mt-0.5 truncate">
              {Math.round(geometry.x)}, {Math.round(geometry.y)}
            </div>
          </div>
          <div className="fw-raised px-3 py-2 min-w-0">
            <div className="text-[11px] text-[var(--fw-text-muted)]">Radius</div>
            <div className="fw-mono text-[13px] font-medium mt-0.5 truncate">
              {layout.borderRadius}
            </div>
          </div>
          <div className="fw-raised px-3 py-2 min-w-0">
            <div className="text-[11px] text-[var(--fw-text-muted)]">Ratio</div>
            <div className="fw-mono text-[13px] font-medium mt-0.5 truncate">
              {geometry.aspectRatio > 0 ? `${geometry.aspectRatio}:1` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Typography & Colors */}
      <section className="fw-section space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="fw-section-title">Typography & colors</span>
          <CopyButton text={typeCss} label="Type" />
        </div>

        <div className="fw-raised px-3 py-2.5 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-medium truncate">{typography.primaryFont}</span>
            <span className="fw-mono text-[12px] text-[var(--fw-text-secondary)] shrink-0">
              {typography.fontSize} / {typography.lineHeight}
            </span>
          </div>
          <div className="fw-mono text-[12px] text-[var(--fw-text-muted)] flex items-center justify-between gap-2">
            <span>
              Weight {typography.fontWeight}
              {typography.letterSpacing !== 'normal' ? ` · ${typography.letterSpacing}` : ''}
            </span>
            {colors.contrastRatio !== null && colors.contrastGrade && (
              <span
                style={{
                  color:
                    colors.contrastGrade === 'AAA' || colors.contrastGrade === 'AA'
                      ? 'var(--fw-positive)'
                      : colors.contrastGrade === 'AA Large'
                        ? 'var(--fw-warn)'
                        : 'var(--fw-negative)',
                }}
              >
                {colors.contrastRatio}:1 {colors.contrastGrade}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InlineSwatch
            label="Text"
            swatch={colors.color}
            copiedHex={copiedKey}
            onCopy={(hex) => void handleCopyValue(hex, hex)}
          />
          <InlineSwatch
            label="Background"
            swatch={colors.background}
            copiedHex={copiedKey}
            onCopy={(hex) => void handleCopyValue(hex, hex)}
          />
          {colors.borderColor.opacity > 0 && (
            <InlineSwatch
              label="Border"
              swatch={colors.borderColor}
              copiedHex={copiedKey}
              onCopy={(hex) => void handleCopyValue(hex, hex)}
            />
          )}
        </div>
      </section>

      {/* 6. Multi-Language Code Export (CSS, Tailwind, SwiftUI, Jetpack Compose) */}
      <section className="fw-section space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="fw-section-title">Copy as code</span>
          <CopyButton text={generatedCode} label="Copy" />
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 rounded-[8px] bg-[var(--fw-raised)] border border-[var(--fw-hairline)]">
          {CODE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setCodeLang(lang.id)}
              className={`h-8 rounded-[6px] text-[13px] transition-colors cursor-pointer ${
                codeLang === lang.id
                  ? 'bg-[var(--fw-surface)] text-[var(--fw-text)] font-medium border border-[var(--fw-hairline)]'
                  : 'text-[var(--fw-text-muted)] hover:text-[var(--fw-text)]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <pre className="fw-code-block max-h-48 overflow-y-auto">{generatedCode}</pre>
      </section>

      {/* 7. Progressive Disclosure: DOM Path & Rendered CSS */}
      <section className="border-b border-[var(--fw-hairline)]">
        <button
          type="button"
          onClick={() => setDomOpen((v) => !v)}
          aria-expanded={domOpen}
          className="w-full px-5 h-12 flex items-center justify-between text-left hover:bg-[var(--fw-surface)] transition-colors cursor-pointer"
        >
          <span className="fw-section-title">
            DOM path{' '}
            <span className="fw-mono text-[12px] text-[var(--fw-text-muted)] ml-1">
              {inspection.ancestors.length} levels · {inspection.childCount} children
            </span>
          </span>
          {domOpen ? (
            <ChevronDown className="h-4 w-4 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
          )}
        </button>

        {domOpen && (
          <div className="px-5 pb-5 space-y-3">
            <div className="flex flex-wrap items-center gap-1">
              {inspection.ancestors.map((node, idx) => (
                <div key={`${node.id}-${idx}`} className="inline-flex items-center gap-1">
                  {idx > 0 && (
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[var(--fw-text-muted)] shrink-0"
                      strokeWidth={1.5}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectSelector(node.id)}
                    onMouseEnter={() => onHighlightSelector(node.id)}
                    onMouseLeave={() => onHighlightSelector(null)}
                    className={`fw-mono text-[12px] px-2 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                      node.isSelected
                        ? 'border-[var(--fw-accent)] bg-[var(--fw-accent-soft)] text-[var(--fw-text)] font-medium'
                        : 'border-[var(--fw-hairline)] bg-[var(--fw-raised)] text-[var(--fw-text-secondary)] hover:text-[var(--fw-text)]'
                    }`}
                  >
                    {node.selector}
                  </button>
                </div>
              ))}
            </div>

            {inspection.children.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {inspection.children.map((child, idx) => (
                  <button
                    key={`${child.id}-${idx}`}
                    type="button"
                    onClick={() => onSelectSelector(child.id)}
                    onMouseEnter={() => onHighlightSelector(child.id)}
                    onMouseLeave={() => onHighlightSelector(null)}
                    className="fw-row w-full text-left cursor-pointer"
                  >
                    <span className="fw-mono text-[12px] truncate">{child.selector}</span>
                    <span className="fw-mono text-[12px] text-[var(--fw-text-muted)] shrink-0">
                      {Math.round(child.width)} × {Math.round(child.height)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setCssOpen((v) => !v)}
          aria-expanded={cssOpen}
          className="w-full px-5 h-12 flex items-center justify-between text-left hover:bg-[var(--fw-surface)] transition-colors cursor-pointer"
        >
          <span className="fw-section-title">All computed styles</span>
          {cssOpen ? (
            <ChevronDown className="h-4 w-4 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
          )}
        </button>

        {cssOpen && (
          <div className="px-5 pb-5 space-y-4">
            {inspection.computedGroups.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="text-[12px] text-[var(--fw-text-muted)] px-2">{group.category}</div>
                <div className="divide-y divide-[var(--fw-hairline)] border-t border-b border-[var(--fw-hairline)]">
                  {Object.entries(group.properties).map(([prop, val]) => (
                    <button
                      key={prop}
                      type="button"
                      onClick={() => void handleCopyValue(`css:${prop}`, `${prop}: ${val};`)}
                      title={`Copy ${prop}: ${val};`}
                      className="w-full min-h-9 flex items-center justify-between gap-3 px-2 py-2 text-left hover:bg-[var(--fw-raised)] transition-colors cursor-pointer"
                    >
                      <span className="fw-mono text-[13px] text-[var(--fw-text-secondary)] shrink-0">
                        {prop}
                      </span>
                      <span className="fw-mono text-[13px] text-right break-all">
                        {copiedKey === `css:${prop}` ? (
                          <span className="text-[var(--fw-positive)]">Copied</span>
                        ) : (
                          val
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
