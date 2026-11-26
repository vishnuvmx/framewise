import { useState } from 'react';
import { copyToClipboard } from '@/sidepanel/components/CopyButton';
import type { BoxModel } from '@/shared/types';
import { formatPx, formatSpacingShorthand } from '@/shared/utils/css';

interface BoxModelDiagramProps {
  boxModel: BoxModel;
}

export function BoxModelDiagram({ boxModel }: BoxModelDiagramProps) {
  const [copiedNote, setCopiedNote] = useState<string | null>(null);

  const copyDecl = async (declaration: string) => {
    const ok = await copyToClipboard(declaration);
    if (!ok) return;
    setCopiedNote(declaration);
    window.setTimeout(() => setCopiedNote(null), 1500);
  };

  const ValBtn = ({ val, prop }: { val: number; prop: string }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copyDecl(`${prop}: ${formatPx(val)};`);
      }}
      title={`Copy ${prop}: ${formatPx(val)};`}
      className="fw-mono text-[12px] font-normal px-1.5 py-0.5 rounded text-[var(--fw-text)] hover:bg-[var(--fw-hover)] transition-colors cursor-pointer"
    >
      {val === 0 ? '0' : val}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="fw-section-title">Box model</span>
        <span className="fw-mono text-[11px] text-[var(--fw-text-muted)] truncate">
          {copiedNote ? (
            <span className="text-[var(--fw-positive)]">Copied {copiedNote}</span>
          ) : (
            boxModel.boxSizing
          )}
        </span>
      </div>

      {/* Drafted concentric schematic: outer 10px -> border 8px -> padding 6px -> content 4px */}
      <div
        onClick={() => void copyDecl(`margin: ${formatSpacingShorthand(boxModel.margin)};`)}
        title="Click to copy margin"
        className="rounded-[10px] border border-dashed p-2 cursor-pointer"
        style={{
          backgroundColor: 'var(--fw-box-margin-bg)',
          borderColor: 'var(--fw-box-margin-border)',
        }}
      >
        <div className="grid grid-cols-3 items-center mb-1">
          <span className="text-[11px] text-[var(--fw-text-muted)] pl-1">Margin</span>
          <div className="flex justify-center">
            <ValBtn val={boxModel.margin.top} prop="margin-top" />
          </div>
          <span />
        </div>

        <div className="flex items-center gap-1">
          <ValBtn val={boxModel.margin.left} prop="margin-left" />

          <div
            onClick={(e) => {
              e.stopPropagation();
              void copyDecl(`border-width: ${formatSpacingShorthand(boxModel.border)};`);
            }}
            title="Click to copy border-width"
            className="flex-1 rounded-[8px] border border-[var(--fw-hairline-strong)] bg-[var(--fw-surface)] p-2"
          >
            <div className="grid grid-cols-3 items-center mb-1">
              <span className="text-[11px] text-[var(--fw-text-muted)] pl-1">Border</span>
              <div className="flex justify-center">
                <ValBtn val={boxModel.border.top} prop="border-top-width" />
              </div>
              <span />
            </div>

            <div className="flex items-center gap-1">
              <ValBtn val={boxModel.border.left} prop="border-left-width" />

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  void copyDecl(`padding: ${formatSpacingShorthand(boxModel.padding)};`);
                }}
                title="Click to copy padding"
                className="flex-1 rounded-[6px] border p-2"
                style={{
                  backgroundColor: 'var(--fw-box-padding-bg)',
                  borderColor: 'var(--fw-box-padding-border)',
                }}
              >
                <div className="grid grid-cols-3 items-center mb-1">
                  <span className="text-[11px] text-[var(--fw-text-muted)] pl-1">Padding</span>
                  <div className="flex justify-center">
                    <ValBtn val={boxModel.padding.top} prop="padding-top" />
                  </div>
                  <span />
                </div>

                <div className="flex items-center gap-1">
                  <ValBtn val={boxModel.padding.left} prop="padding-left" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyDecl(
                        `width: ${formatPx(boxModel.content.width)}; height: ${formatPx(boxModel.content.height)};`
                      );
                    }}
                    title="Copy content width and height"
                    className="flex-1 rounded-[4px] border border-[var(--fw-accent)] bg-[var(--fw-accent-soft)] py-3 px-2 text-center fw-mono text-[13px] font-medium text-[var(--fw-text)] hover:bg-[var(--fw-surface)] transition-colors cursor-pointer"
                  >
                    {boxModel.content.width} × {boxModel.content.height}
                  </button>

                  <ValBtn val={boxModel.padding.right} prop="padding-right" />
                </div>

                <div className="flex justify-center mt-1">
                  <ValBtn val={boxModel.padding.bottom} prop="padding-bottom" />
                </div>
              </div>

              <ValBtn val={boxModel.border.right} prop="border-right-width" />
            </div>

            <div className="flex justify-center mt-1">
              <ValBtn val={boxModel.border.bottom} prop="border-bottom-width" />
            </div>
          </div>

          <ValBtn val={boxModel.margin.right} prop="margin-right" />
        </div>

        <div className="flex justify-center mt-1">
          <ValBtn val={boxModel.margin.bottom} prop="margin-bottom" />
        </div>
      </div>

      <p className="text-[12px] text-[var(--fw-text-muted)]">
        Click any edge or region to copy its CSS declaration
      </p>
    </div>
  );
}
