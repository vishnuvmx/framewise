import { Eye, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { ReferenceOverlayState, ViewportInfo } from '@/shared/types';
import { roundNumber } from '@/shared/utils/css';

interface CompareViewProps {
  reference: ReferenceOverlayState;
  viewport: ViewportInfo | null;
  onUpdate: (next: ReferenceOverlayState | null) => void;
}

export function CompareView({ reference, viewport, onUpdate }: CompareViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null;
        if (!dataUrl) return;
        const img = new Image();
        img.onload = () => {
          // Auto-detect @2x Retina exports (e.g. 2880px Figma PNG on a 1440px viewport)
          const vpW = viewport?.width ?? 1440;
          const autoScale = img.naturalWidth > vpW * 1.6 ? 0.5 : 1;
          onUpdate({
            ...reference,
            imageDataUrl: dataUrl,
            imageName: file.name || 'Pasted reference',
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            visible: true,
            scale: autoScale,
            offsetX: 0,
            offsetY: 0,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [onUpdate, reference, viewport?.width]
  );

  // Support Ctrl+V / Cmd+V directly from Figma "Copy as PNG"
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            loadImageFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadImageFile]);

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const patch = (partial: Partial<ReferenceOverlayState>) => {
    onUpdate({ ...reference, ...partial });
  };

  const fitWidthScale =
    viewport && reference.naturalWidth > 0
      ? roundNumber(viewport.width / reference.naturalWidth, 3)
      : 1;

  if (!reference.imageDataUrl) {
    return (
      <div className="min-h-full flex flex-col justify-between">
        {/* Top Upload Surface */}
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-[16px] font-medium text-[var(--fw-text)]">
              Design vs live comparison
            </h2>
            <p className="text-[13px] text-[var(--fw-text-secondary)]">
              Overlay a design export over this webpage to check spacing, alignment, and type
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadImageFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`w-full rounded-[10px] border p-6 flex flex-col items-center text-center gap-3 transition-colors cursor-pointer ${
              dragging
                ? 'border-[var(--fw-accent)] bg-[var(--fw-accent-soft)]'
                : 'border-[var(--fw-hairline-strong)] bg-[var(--fw-surface)] hover:bg-[var(--fw-raised)]'
            }`}
          >
            {/* Drafted split-frame schematic icon */}
            <svg
              width="44"
              height="32"
              viewBox="0 0 44 32"
              fill="none"
              aria-hidden="true"
              className="text-[var(--fw-text-muted)]"
            >
              <rect
                x="1"
                y="1"
                width="42"
                height="30"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <rect x="6" y="7" width="12" height="5" rx="1.5" fill="currentColor" opacity="0.22" />
              <rect x="6" y="15" width="10" height="3" rx="1" fill="currentColor" opacity="0.16" />
              <rect x="6" y="21" width="12" height="4" rx="1" fill="currentColor" opacity="0.16" />
              <rect
                x="26"
                y="7"
                width="12"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <line x1="22" y1="1" x2="22" y2="31" stroke="var(--fw-accent-fill)" strokeWidth="1.5" />
            </svg>

            <div className="space-y-0.5">
              <div className="text-[14px] font-medium text-[var(--fw-text)]">
                {dragging ? 'Drop image to overlay' : 'Drop a design export or click to browse'}
              </div>
              <div className="text-[12px] text-[var(--fw-text-muted)]">PNG, JPG, or WebP</div>
            </div>

            <div className="pt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--fw-text-muted)]">
              <span>or paste from clipboard</span>
              <kbd className="fw-kbd">Ctrl</kbd>
              <kbd className="fw-kbd">V</kbd>
            </div>
          </button>
        </div>

        {/* Bottom-Pinned Visual QA Notes */}
        <div className="border-t border-[var(--fw-hairline)] px-5 py-4 space-y-2.5 bg-[var(--fw-surface)]">
          <div className="fw-section-title">Tips for visual QA</div>
          <div className="space-y-2 text-[12px] leading-5 text-[var(--fw-text-secondary)]">
            <div className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fw-text-muted)] mt-2 shrink-0" />
              <span>
                <strong className="font-medium text-[var(--fw-text)]">Difference mode</strong>{' '}
                exposes 1px spacing or font shifts — exact pixel matches render pure black
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fw-text-muted)] mt-2 shrink-0" />
              <span>
                <strong className="font-medium text-[var(--fw-text)]">Click-through</strong>{' '}
                overlay lets you toggle live inspection and measure DOM nodes right beneath your
                design
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Reference File Header */}
      <section className="fw-section bg-[var(--fw-surface)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={reference.imageDataUrl}
            alt="Design reference preview"
            className="h-10 w-10 rounded-[6px] object-cover border border-[var(--fw-hairline-strong)] shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{reference.imageName}</div>
            <div className="fw-mono text-[12px] text-[var(--fw-text-muted)]">
              {reference.naturalWidth} × {reference.naturalHeight}px · {reference.scale}×
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => patch({ visible: !reference.visible })}
            title={reference.visible ? 'Hide reference' : 'Show reference'}
            aria-label={reference.visible ? 'Hide reference' : 'Show reference'}
            className="fw-icon-btn"
          >
            {reference.visible ? (
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
          <button
            type="button"
            onClick={() => onUpdate(null)}
            title="Remove reference image"
            aria-label="Remove reference image"
            className="fw-icon-btn"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </section>

      {/* Blend Mode Switcher */}
      <section className="fw-section space-y-4">
        <span className="fw-section-title">Compare mode</span>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-[8px] bg-[var(--fw-raised)] border border-[var(--fw-hairline)]">
          {(
            [
              ['normal', 'Overlay'],
              ['difference', 'Difference'],
              ['split', 'Split'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => patch({ blendMode: id, visible: true })}
              className={`h-8 rounded-[6px] text-[13px] transition-colors cursor-pointer ${
                reference.blendMode === id
                  ? 'bg-[var(--fw-surface)] text-[var(--fw-text)] font-medium border border-[var(--fw-hairline)]'
                  : 'text-[var(--fw-text-muted)] hover:text-[var(--fw-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {reference.blendMode === 'split' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--fw-text-secondary)]">Split curtain</span>
              <span className="fw-mono text-[12px]">{Math.round(reference.splitPercent)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={reference.splitPercent}
              onChange={(e) => patch({ splitPercent: Number(e.target.value) })}
              className="w-full accent-[var(--fw-accent-fill)] cursor-pointer"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--fw-text-secondary)]">Opacity</span>
              <span className="fw-mono text-[12px]">{Math.round(reference.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(reference.opacity * 100)}
              onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--fw-accent-fill)] cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[0.25, 0.5, 0.75, 1].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => patch({ opacity: val })}
                  className="fw-btn fw-btn-secondary fw-btn-sm fw-mono"
                >
                  {val * 100}%
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Scale & Pixel Nudge */}
      <section className="fw-section space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="fw-section-title">Scale & alignment</span>
          <button
            type="button"
            onClick={() => patch({ offsetX: 0, offsetY: 0, scale: 1 })}
            className="fw-btn fw-btn-secondary fw-btn-sm"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--fw-text-muted)]" strokeWidth={1.5} />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: '0.5× (@2x)', val: 0.5 },
            { label: '1×', val: 1 },
            { label: 'Fit width', val: fitWidthScale },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => patch({ scale: preset.val })}
              className={`fw-btn fw-btn-sm ${
                Math.abs(reference.scale - preset.val) < 0.01
                  ? 'fw-btn-primary'
                  : 'fw-btn-secondary'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {(
            [
              ['X offset', 'offsetX', reference.offsetX],
              ['Y offset', 'offsetY', reference.offsetY],
            ] as const
          ).map(([label, key, value]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-[var(--fw-text-secondary)] w-16 shrink-0">
                {label}
              </span>
              <div className="flex items-center gap-1">
                {[-10, -1, 1, 10].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => patch({ [key]: value + delta })}
                    className="fw-btn fw-btn-secondary fw-btn-sm fw-mono !px-2"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
              <span className="fw-mono text-[12px] w-12 text-right shrink-0">{value}px</span>
            </div>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
          <span className="text-[13px] text-[var(--fw-text-secondary)]">
            Lock reference to page scroll
          </span>
          <input
            type="checkbox"
            checked={reference.lockToScroll}
            onChange={(e) => patch({ lockToScroll: e.target.checked })}
            className="h-4 w-4 accent-[var(--fw-accent-fill)] cursor-pointer"
          />
        </label>
      </section>
    </div>
  );
}
