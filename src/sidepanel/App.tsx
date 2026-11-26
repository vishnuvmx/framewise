import { ChevronRight, Crosshair, Moon, Pause, Sun, X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_REFERENCE_STATE } from '@/content/overlay/reference-overlay';
import { drawerBridge } from '@/messaging/drawer-bridge';
import type { ContentEvent } from '@/messaging/protocol';
import { STORAGE_KEYS } from '@/shared/constants';
import type {
  DesignSystemSummary,
  DistanceMeasurement,
  ElementInspection,
  InspectorTab,
  ReferenceOverlayState,
  ViewportInfo,
} from '@/shared/types';
import { CompareView } from '@/sidepanel/views/CompareView';
import { ElementView } from '@/sidepanel/views/ElementView';
import { PageView } from '@/sidepanel/views/PageView';

const MODES: Array<{ id: InspectorTab; label: string }> = [
  { id: 'element', label: 'Element' },
  { id: 'page', label: 'Page' },
  { id: 'compare', label: 'Compare' },
];

interface BridgeStatePayload {
  active: boolean;
  locked: boolean;
  viewport: ViewportInfo | null;
  selected: ElementInspection | null;
}

type ResolvedTheme = 'light' | 'dark';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readInitialTheme(): ResolvedTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.themePreference);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignore storage errors
  }
  return getSystemTheme();
}

function applyResolvedTheme(next: ResolvedTheme): void {
  const meta = document.querySelector('meta[name="color-scheme"]');
  const matchesSystem = next === getSystemTheme();
  if (meta) {
    meta.setAttribute('content', matchesSystem ? 'light dark' : next);
  }
  try {
    if (matchesSystem) {
      localStorage.removeItem(STORAGE_KEYS.themePreference);
    } else {
      localStorage.setItem(STORAGE_KEYS.themePreference, next);
    }
  } catch {
    // Ignore storage errors
  }
  void drawerBridge.send({ type: 'SET_THEME', theme: next });
}

export function App() {
  const [mode, setMode] = useState<InspectorTab>('element');
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportInfo | null>(null);
  const [hovered, setHovered] = useState<ElementInspection | null>(null);
  const [selected, setSelected] = useState<ElementInspection | null>(null);
  const [measurement, setMeasurement] = useState<DistanceMeasurement | null>(null);
  const [designSystem, setDesignSystem] = useState<DesignSystemSummary | null>(null);
  const [reference, setReference] = useState<ReferenceOverlayState>(DEFAULT_REFERENCE_STATE);
  const [scanning, setScanning] = useState(false);
  const [theme, setTheme] = useState<ResolvedTheme>(readInitialTheme);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasAutoScannedRef = useRef(false);
  const activeInspection = locked ? selected : hovered ?? selected;

  const syncState = useCallback(async () => {
    const res = await drawerBridge.send<BridgeStatePayload>({ type: 'GET_STATE' });
    if (res.ok && res.data) {
      setActive(res.data.active);
      setLocked(res.data.locked);
      setViewport(res.data.viewport);
      setSelected(res.data.selected);
      setStatusError(null);
    } else if (res.error) {
      setStatusError(res.error);
    }

    const refRes = await drawerBridge.send<ReferenceOverlayState>({
      type: 'GET_REFERENCE_OVERLAY',
    });
    if (refRes.ok && refRes.data) {
      setReference(refRes.data);
    }
  }, []);

  const handleScanDesignSystem = useCallback(async () => {
    setScanning(true);
    setStatusError(null);
    const res = await drawerBridge.send<DesignSystemSummary>({ type: 'SCAN_DESIGN_SYSTEM' });
    setScanning(false);
    if (res.ok && res.data) {
      setDesignSystem(res.data);
      setViewport(res.data.viewport);
    } else {
      setStatusError(res.error ?? 'Could not scan this page');
    }
  }, []);

  useEffect(() => {
    applyResolvedTheme(readInitialTheme());
    void syncState();

    const unsubscribe = drawerBridge.onEvent((evt: ContentEvent) => {
      switch (evt.type) {
        case 'INSPECTION_HOVER':
          setHovered(evt.inspection);
          setMeasurement(evt.measurement);
          break;
        case 'INSPECTION_SELECT':
          setSelected(evt.inspection);
          setLocked(evt.locked);
          setMeasurement(null);
          if (evt.inspection) setMode('element');
          break;
        case 'INSPECTION_STATE_CHANGE':
          setActive(evt.active);
          setLocked(evt.locked);
          setViewport(evt.viewport);
          if (!evt.active) {
            setHovered(null);
            setMeasurement(null);
          }
          break;
        case 'VIEWPORT_RESIZED':
        case 'CONTENT_READY':
          setViewport(evt.viewport);
          break;
      }
    });

    return unsubscribe;
  }, [syncState]);

  // Unified keyboard shortcuts while focus is inside the drawer iframe
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditable) return;

      if (
        event.altKey &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.code === 'KeyL'
      ) {
        event.preventDefault();
        void drawerBridge.send({ type: 'TOGGLE_DRAWER' });
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        void (async () => {
          if (locked) {
            await drawerBridge.send({ type: 'UNLOCK_SELECTION' });
            setLocked(false);
          } else if (active) {
            const res = await drawerBridge.send<{
              active: boolean;
              locked: boolean;
              viewport: ViewportInfo;
            }>({
              type: 'TOGGLE_INSPECTOR',
              active: false,
            });
            if (res.ok && res.data) {
              setActive(res.data.active);
              setLocked(res.data.locked);
            }
          } else {
            await drawerBridge.send({ type: 'CLOSE_DRAWER' });
          }
        })();
        return;
      }

      if (!locked || !selected || target?.getAttribute('role') === 'tab') return;
      if (event.ctrlKey || event.metaKey) return;

      let direction: 'parent' | 'child' | 'prev' | 'next' | null = null;
      if (event.key === 'ArrowUp') direction = 'parent';
      else if (event.key === 'ArrowDown') direction = 'child';
      else if (event.key === 'ArrowLeft' && !event.altKey) direction = 'prev';
      else if (event.key === 'ArrowRight' && !event.altKey) direction = 'next';

      if (direction) {
        event.preventDefault();
        void drawerBridge.send<ElementInspection>({ type: 'NAVIGATE_DOM', direction });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, locked, selected]);

  // Auto-scan the page once when switching to Page mode (never loop on error)
  useEffect(() => {
    if (mode === 'page' && !hasAutoScannedRef.current && !designSystem && !scanning) {
      hasAutoScannedRef.current = true;
      void handleScanDesignSystem();
    }
  }, [mode, designSystem, scanning, handleScanDesignSystem]);

  const handleToggleActive = async () => {
    setStatusError(null);
    const next = !active;
    const res = await drawerBridge.send<{
      active: boolean;
      locked: boolean;
      viewport: ViewportInfo;
    }>({
      type: 'TOGGLE_INSPECTOR',
      active: next,
    });
    if (res.ok && res.data) {
      setActive(res.data.active);
      setLocked(res.data.locked);
      setViewport(res.data.viewport);
    } else {
      setStatusError(res.error ?? 'Could not toggle inspector');
    }
  };

  const handleSelectSelector = async (selector: string) => {
    await drawerBridge.send({ type: 'HIGHLIGHT_GROUP', selectors: [] });
    const res = await drawerBridge.send<ElementInspection>({
      type: 'SELECT_BY_SELECTOR',
      selector,
    });
    if (res.ok && res.data) {
      setSelected(res.data);
      setLocked(true);
      setActive(true);
      setMode('element');
    }
  };

  const handleHighlightSelector = async (selector: string | null) => {
    await drawerBridge.send({ type: 'HIGHLIGHT_BY_SELECTOR', selector });
  };

  const handleHighlightGroup = async (
    selectors: string[],
    variant: 'pattern' | 'outlier' = 'pattern'
  ) => {
    await drawerBridge.send({ type: 'HIGHLIGHT_GROUP', selectors, variant });
  };

  const handleUpdateReference = async (next: ReferenceOverlayState | null) => {
    const resolved = next ?? { ...DEFAULT_REFERENCE_STATE };
    setReference(resolved);
    await drawerBridge.send({ type: 'UPDATE_REFERENCE_OVERLAY', state: next });
  };

  const handleUnlock = async () => {
    await drawerBridge.send({ type: 'UNLOCK_SELECTION' });
    setLocked(false);
  };

  const handleClearSelection = async () => {
    await drawerBridge.send({ type: 'CLEAR_SELECTION' });
    setSelected(null);
    setLocked(false);
    setMeasurement(null);
  };

  const handleCollapseDrawer = async () => {
    await drawerBridge.send({ type: 'SET_COLLAPSED', collapsed: true });
  };

  const handleCloseDrawer = async () => {
    await drawerBridge.send({ type: 'CLOSE_DRAWER' });
    if (!drawerBridge.isEmbedded()) {
      window.close();
    }
  };

  const handleToggleTheme = () => {
    const next: ResolvedTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyResolvedTheme(next);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % MODES.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = MODES.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      setMode(MODES[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ll-bg)] text-[var(--ll-text)]">
      {/* Compact Header */}
      <header className="bg-[var(--ll-chrome)] border-b border-[var(--ll-hairline)] shrink-0">
        <div className="h-14 px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icons/icon.svg" alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
            <span className="text-[17px] font-medium leading-none">LayoutLens</span>
            <span className="inline-flex items-center gap-1.5 pl-1 text-[13px] text-[var(--ll-text-muted)]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: active
                    ? locked
                      ? 'var(--ll-accent-fill)'
                      : 'var(--ll-positive)'
                    : 'var(--ll-text-muted)',
                }}
              />
              <span>{active ? (locked ? 'Locked' : 'Live') : 'Idle'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleActive}
              title={active ? 'Pause inspection' : 'Start inspecting'}
              aria-label={active ? 'Pause inspection' : 'Start inspecting'}
              aria-pressed={active}
              className={`ll-icon-btn ${
                active
                  ? '!border-[var(--ll-accent)] !bg-[var(--ll-accent-soft)] !text-[var(--ll-accent)]'
                  : ''
              }`}
            >
              {active ? (
                <Pause className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Crosshair className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="ll-icon-btn"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleCollapseDrawer()}
              title="Collapse sidebar to inspect behind it"
              aria-label="Collapse sidebar"
              className="ll-icon-btn"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => void handleCloseDrawer()}
              title="Close LayoutLens"
              aria-label="Close LayoutLens"
              className="ll-icon-btn"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Clean 3-Mode Switch: Element | Page | Compare */}
        <nav role="tablist" aria-label="LayoutLens view mode" className="ll-tablist">
          {MODES.map((item, idx) => {
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`ll-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setMode(item.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className="ll-tab"
              >
                {item.label}
                {item.id === 'compare' && reference.imageDataUrl && reference.visible && (
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--ll-accent-fill)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Error Notice */}
      {statusError && (
        <div className="px-5 py-3 border-b border-[var(--ll-hairline)] bg-[var(--ll-warn-soft)] text-[13px] shrink-0">
          {statusError}
        </div>
      )}

      {/* Main Content */}
      <main role="tabpanel" aria-labelledby={`ll-tab-${mode}`} className="flex-1 overflow-y-auto">
        {mode === 'element' && (
          <ElementView
            inspection={activeInspection}
            measurement={measurement}
            active={active}
            locked={locked}
            onResume={handleToggleActive}
            onUnlock={handleUnlock}
            onClear={handleClearSelection}
            onSelectSelector={handleSelectSelector}
            onHighlightSelector={handleHighlightSelector}
          />
        )}
        {mode === 'page' && (
          <PageView
            designSystem={designSystem}
            selected={activeInspection}
            viewport={viewport}
            scanning={scanning}
            onScan={handleScanDesignSystem}
            onSelectSelector={handleSelectSelector}
            onHighlightSelector={handleHighlightSelector}
            onHighlightGroup={handleHighlightGroup}
          />
        )}
        {mode === 'compare' && (
          <CompareView
            reference={reference}
            viewport={viewport}
            onUpdate={handleUpdateReference}
          />
        )}
      </main>

      {/* Quiet Contextual Hint Footer */}
      <footer className="h-11 px-5 bg-[var(--ll-chrome)] border-t border-[var(--ll-hairline)] flex items-center justify-between gap-2 text-[12px] text-[var(--ll-text-muted)] shrink-0">
        <span className="truncate">
          {!active
            ? 'Click crosshair to inspect'
            : locked
              ? '↑↓←→ walk DOM · hover to measure'
              : 'Click any element to lock & measure'}
        </span>
        <div className="inline-flex items-center gap-1 shrink-0">
          <kbd className="ll-kbd">Esc</kbd>
          <span>{locked ? 'unlock' : active ? 'pause' : 'close'}</span>
        </div>
      </footer>
    </div>
  );
}
