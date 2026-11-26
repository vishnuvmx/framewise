import { analyzeDesignSystem, inspectElement } from '@/core/analysis';
import { measureBetweenElements } from '@/core/geometry';
import { extractViewportInfo } from '@/core/layout';
import { getElementAtPoint, isInspectableElement, isOverlayElement } from '@/core/scanner';
import { renderBoxModelOverlay } from '@/content/overlay/box-model';
import {
  renderGroupHighlightOverlay,
  renderHighlightOverlay,
  renderLayoutGuideOverlay,
} from '@/content/overlay/highlight';
import { renderMeasurementOverlay } from '@/content/overlay/measurements';
import { OverlayHost } from '@/content/overlay/overlay-host';
import type { DomDirection } from '@/messaging/drawer-bridge';
import type { ContentEvent } from '@/messaging/protocol';
import { DEFAULT_OVERLAY_OPTIONS, STORAGE_KEYS } from '@/shared/constants';
import type {
  DesignSystemSummary,
  DistanceMeasurement,
  ElementInspection,
  OverlayOptions,
  ThemePreference,
  ViewportInfo,
} from '@/shared/types';

export interface ControllerHooks {
  onEvent: (event: ContentEvent) => void;
  onActiveChange?: (active: boolean) => void;
  getRightInset: () => number;
}

export class InspectorController {
  private active = false;
  private locked = false;
  private hoveredEl: Element | null = null;
  private selectedEl: Element | null = null;
  private groupHighlight: { elements: Element[]; variant: 'pattern' | 'outlier' } | null = null;
  private cachedSelectedInspection: ElementInspection | null = null;
  private selectedDirty = true;
  private overlayOptions: OverlayOptions = { ...DEFAULT_OVERLAY_OPTIONS };
  private overlayHost: OverlayHost;
  private hooks: ControllerHooks;

  private rafId: number | null = null;
  private pendingPointer: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private mutationTimer: number | null = null;

  constructor(hooks: ControllerHooks) {
    this.hooks = hooks;
    this.overlayHost = new OverlayHost({
      onToggleOption: (key) => {
        this.overlayOptions = { ...this.overlayOptions, [key]: !this.overlayOptions[key] };
        try {
          void chrome.storage?.local?.set({ [STORAGE_KEYS.overlayOptions]: this.overlayOptions });
        } catch {
          // Ignore storage errors outside extension context
        }
        this.scheduleRender();
      },
      onUnlock: () => {
        this.unlockSelection();
      },
      onClose: () => {
        this.setActive(false);
      },
    });
  }

  setTheme(theme: ThemePreference): void {
    this.overlayHost.setTheme(theme);
  }

  isActive(): boolean {
    return this.active;
  }

  isLocked(): boolean {
    return this.locked;
  }

  getOverlayOptions(): OverlayOptions {
    return { ...this.overlayOptions };
  }

  getViewport(): ViewportInfo {
    return extractViewportInfo(window, document);
  }

  getSelectedInspection(): ElementInspection | null {
    if (this.selectedEl && this.selectedEl.isConnected) {
      if (this.selectedDirty || !this.cachedSelectedInspection) {
        this.cachedSelectedInspection = inspectElement(this.selectedEl);
        this.selectedDirty = false;
      }
      return this.cachedSelectedInspection;
    }
    this.selectedEl = null;
    this.cachedSelectedInspection = null;
    return null;
  }

  setOverlayOptions(options: OverlayOptions): void {
    this.overlayOptions = { ...options };
    if (this.active) {
      this.scheduleRender();
    }
  }

  setActive(nextActive: boolean): void {
    if (this.active === nextActive) {
      if (nextActive) this.scheduleRender();
      return;
    }

    this.active = nextActive;

    if (nextActive) {
      this.overlayHost.mount();
      this.attachListeners();
      this.selectedDirty = true;
      this.scheduleRender();
    } else {
      this.locked = false;
      this.hoveredEl = null;
      this.pendingPointer = null;
      this.detachListeners();
      this.overlayHost.unmount();
    }

    this.hooks.onActiveChange?.(this.active);
    this.hooks.onEvent({
      type: 'INSPECTION_STATE_CHANGE',
      active: this.active,
      locked: this.locked,
      viewport: this.getViewport(),
    });
  }

  clearSelection(): void {
    this.selectedEl = null;
    this.cachedSelectedInspection = null;
    this.selectedDirty = false;
    this.locked = false;
    this.observeSelectedElement(null);
    this.scheduleRender();
    this.hooks.onEvent({
      type: 'INSPECTION_SELECT',
      inspection: null,
      locked: false,
    });
  }

  unlockSelection(): void {
    this.locked = false;
    this.scheduleRender();
    this.hooks.onEvent({
      type: 'INSPECTION_STATE_CHANGE',
      active: this.active,
      locked: false,
      viewport: this.getViewport(),
    });
  }

  /**
   * Walks DOM hierarchy from the currently selected element (parent / first child / sibling),
   * skipping non-inspectable nodes (scripts, overlays, etc.) and crossing open Shadow DOM hosts.
   */
  navigateSelection(direction: DomDirection): ElementInspection | null {
    if (!this.selectedEl || !this.selectedEl.isConnected) return null;

    let nextTarget: Element | null = null;

    if (direction === 'parent') {
      const parent = this.selectedEl.parentElement;
      if (parent && isInspectableElement(parent)) {
        nextTarget = parent;
      } else {
        const root = this.selectedEl.getRootNode();
        if (root instanceof ShadowRoot && isInspectableElement(root.host)) {
          nextTarget = root.host;
        }
      }
    } else if (direction === 'child') {
      const children = Array.from(this.selectedEl.children);
      nextTarget = children.find((c) => isInspectableElement(c)) ?? null;
    } else if (direction === 'prev') {
      let cur: Element | null = this.selectedEl.previousElementSibling;
      while (cur) {
        if (isInspectableElement(cur)) {
          nextTarget = cur;
          break;
        }
        cur = (cur as Element).previousElementSibling;
      }
    } else if (direction === 'next') {
      let cur: Element | null = this.selectedEl.nextElementSibling;
      while (cur) {
        if (isInspectableElement(cur)) {
          nextTarget = cur;
          break;
        }
        cur = (cur as Element).nextElementSibling;
      }
    }

    if (!nextTarget) return null;

    this.selectedEl = nextTarget;
    this.locked = true;
    this.observeSelectedElement(nextTarget);
    if (typeof nextTarget.scrollIntoView === 'function') {
      nextTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    const inspection = inspectElement(nextTarget);
    this.cachedSelectedInspection = inspection;
    this.selectedDirty = false;
    this.scheduleRender();

    this.hooks.onEvent({
      type: 'INSPECTION_SELECT',
      inspection,
      locked: true,
    });

    return inspection;
  }

  selectBySelector(selector: string): ElementInspection | null {
    try {
      const target = document.querySelector(selector);
      if (!target || !isInspectableElement(target)) return null;

      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      this.selectedEl = target;
      this.locked = true;
      this.observeSelectedElement(target);
      const inspection = inspectElement(target);
      this.cachedSelectedInspection = inspection;
      this.selectedDirty = false;

      if (!this.active) {
        this.setActive(true);
      } else {
        this.scheduleRender();
      }

      this.hooks.onEvent({
        type: 'INSPECTION_SELECT',
        inspection,
        locked: true,
      });

      return inspection;
    } catch {
      return null;
    }
  }

  highlightBySelector(selector: string | null): void {
    if (!selector) {
      this.hoveredEl = null;
      if (!this.active && !this.groupHighlight) {
        this.overlayHost.unmount();
        return;
      }
      this.scheduleRender();
      return;
    }
    try {
      const target = document.querySelector(selector);
      if (target && isInspectableElement(target)) {
        this.hoveredEl = target;
        if (!this.active) {
          this.overlayHost.mount();
        }
        this.scheduleRender();
      }
    } catch {
      // Ignore invalid selector
    }
  }

  highlightGroup(selectors: string[], variant: 'pattern' | 'outlier' = 'pattern'): number {
    if (!selectors || selectors.length === 0) {
      this.groupHighlight = null;
      if (!this.active && !this.hoveredEl) {
        this.overlayHost.unmount();
      } else {
        this.scheduleRender();
      }
      return 0;
    }

    const elements: Element[] = [];
    for (const sel of selectors.slice(0, 50)) {
      try {
        const el = document.querySelector(sel);
        if (el && isInspectableElement(el)) {
          elements.push(el);
        }
      } catch {
        // Ignore invalid selector
      }
    }

    if (elements.length === 0) {
      this.groupHighlight = null;
      this.scheduleRender();
      return 0;
    }

    this.groupHighlight = { elements, variant };
    this.overlayHost.mount();
    this.scheduleRender();
    return elements.length;
  }

  scanPageDesignSystem(): DesignSystemSummary {
    return analyzeDesignSystem(document, window);
  }

  private isEventOnExtensionUi(event: Event): boolean {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node instanceof Element && isOverlayElement(node)) {
        return true;
      }
    }
    return event.target instanceof Element && isOverlayElement(event.target);
  }

  private attachListeners(): void {
    window.addEventListener('pointermove', this.handlePointerMove, true);
    window.addEventListener('pointerdown', this.handlePointerBlock, true);
    window.addEventListener('mousedown', this.handlePointerBlock, true);
    window.addEventListener('mouseup', this.handlePointerBlock, true);
    window.addEventListener('click', this.handleClick, true);
    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', this.handleWindowResize, { passive: true });
    document.addEventListener('mouseleave', this.handleDocumentLeave);

    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.mutationObserver = new MutationObserver((records) => {
        const hasExternalMutation = records.some((r) => !isOverlayElement(r.target));
        if (!hasExternalMutation || this.mutationTimer !== null) return;
        this.mutationTimer = window.setTimeout(() => {
          this.mutationTimer = null;
          if (this.active) {
            this.selectedDirty = true;
            this.scheduleRender();
          }
        }, 200);
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }
  }

  private detachListeners(): void {
    window.removeEventListener('pointermove', this.handlePointerMove, true);
    window.removeEventListener('pointerdown', this.handlePointerBlock, true);
    window.removeEventListener('mousedown', this.handlePointerBlock, true);
    window.removeEventListener('mouseup', this.handlePointerBlock, true);
    window.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleViewportChange, true);
    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('mouseleave', this.handleDocumentLeave);

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mutationTimer !== null) {
      clearTimeout(this.mutationTimer);
      this.mutationTimer = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  private observeSelectedElement(el: Element | null): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.active && this.selectedEl?.isConnected) {
        this.selectedDirty = true;
        this.scheduleRender();
      }
    });
    this.resizeObserver.observe(el);
  }

  private handleDocumentLeave = (): void => {
    if (!this.active || !this.hoveredEl) return;
    this.hoveredEl = null;
    this.pendingPointer = null;
    this.emitHoverUpdate();
    this.scheduleRender();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.active) return;

    // Clear stale hover highlight cleanly when the pointer enters the drawer or HUD
    if (this.isEventOnExtensionUi(event)) {
      if (this.hoveredEl) {
        this.hoveredEl = null;
        this.pendingPointer = null;
        this.emitHoverUpdate();
        this.scheduleRender();
      }
      return;
    }

    this.pendingPointer = { x: event.clientX, y: event.clientY };
    this.scheduleRender();
  };

  private handlePointerBlock = (event: Event): void => {
    if (!this.active) return;
    if (this.isEventOnExtensionUi(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private handleClick = (event: MouseEvent): void => {
    if (!this.active) return;
    if (this.isEventOnExtensionUi(event)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const target = getElementAtPoint(event.clientX, event.clientY);
    if (!target) return;

    this.selectedEl = target;
    this.locked = true;
    this.observeSelectedElement(target);

    const inspection = inspectElement(target);
    this.cachedSelectedInspection = inspection;
    this.selectedDirty = false;
    this.scheduleRender();

    this.hooks.onEvent({
      type: 'INSPECTION_SELECT',
      inspection,
      locked: true,
    });
  };

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return (target as HTMLElement).isContentEditable === true;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;
    if (this.isEditableTarget(event.target)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (this.locked) {
        this.unlockSelection();
      } else {
        this.setActive(false);
      }
      return;
    }

    if (!this.locked || !this.selectedEl || !this.selectedEl.isConnected) return;
    if (event.ctrlKey || event.metaKey) return;

    // Plain arrows (or Alt+Up/Down) walk DOM without triggering browser Alt+Left/Right Back/Forward
    let direction: DomDirection | null = null;
    if (event.key === 'ArrowUp') direction = 'parent';
    else if (event.key === 'ArrowDown') direction = 'child';
    else if (event.key === 'ArrowLeft' && !event.altKey) direction = 'prev';
    else if (event.key === 'ArrowRight' && !event.altKey) direction = 'next';

    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      this.navigateSelection(direction);
    }
  };

  private handleViewportChange = (event: Event): void => {
    if (!this.active) return;
    if (this.isEventOnExtensionUi(event)) return;
    this.selectedDirty = true;
    this.scheduleRender();
  };

  private handleWindowResize = (): void => {
    if (!this.active) return;
    this.selectedDirty = true;
    this.scheduleRender();
    this.hooks.onEvent({
      type: 'VIEWPORT_RESIZED',
      viewport: this.getViewport(),
    });
  };

  private scheduleRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderFrame();
    });
  }

  private renderFrame(): void {
    const svg = this.overlayHost.getSvg();
    const labels = this.overlayHost.getLabelsContainer();
    if (!svg || !labels) return;

    if (this.pendingPointer) {
      const { x, y } = this.pendingPointer;
      this.pendingPointer = null;
      const target = getElementAtPoint(x, y);
      if (target !== this.hoveredEl) {
        this.hoveredEl = target;
        this.emitHoverUpdate();
      }
    }

    this.overlayHost.clearCanvas();
    if (this.active) {
      this.overlayHost.renderHud(this.locked, this.overlayOptions);
    }

    const rightInset = this.hooks.getRightInset();
    const selectedValid = this.selectedEl && this.selectedEl.isConnected ? this.selectedEl : null;
    const hoveredValid = this.hoveredEl && this.hoveredEl.isConnected ? this.hoveredEl : null;

    if (this.groupHighlight) {
      const liveEls = this.groupHighlight.elements.filter((el) => el.isConnected);
      if (liveEls.length > 0) {
        renderGroupHighlightOverlay(svg, labels, liveEls, this.groupHighlight.variant, rightInset);
      }
    }

    const renderSmartLayoutGuides = (el: Element, inspection: ElementInspection) => {
      if (!this.overlayOptions.showLayoutGuides) return;
      if (inspection.layout.isFlex || inspection.layout.isGrid) {
        renderLayoutGuideOverlay(svg, el, inspection, false);
        return;
      }
      // If inspecting a child inside a Flex/Grid container, subtly reveal its parent layout tracks
      if (
        (inspection.layout.isFlexItem || inspection.layout.isGridItem) &&
        el.parentElement &&
        isInspectableElement(el.parentElement)
      ) {
        renderLayoutGuideOverlay(svg, el.parentElement, inspectElement(el.parentElement), true);
      }
    };

    let selectedInspection: ElementInspection | null = null;
    if (selectedValid) {
      if (this.selectedDirty || !this.cachedSelectedInspection) {
        this.cachedSelectedInspection = inspectElement(selectedValid);
        this.selectedDirty = false;
      }
      selectedInspection = this.cachedSelectedInspection;

      if (this.overlayOptions.showBoxModel) {
        renderBoxModelOverlay(svg, labels, selectedInspection, rightInset);
      }
      renderSmartLayoutGuides(selectedValid, selectedInspection);
      renderHighlightOverlay(
        svg,
        labels,
        selectedInspection,
        'selected',
        this.overlayOptions.showDimensionsBadge,
        rightInset
      );
    }

    if (hoveredValid && hoveredValid !== selectedValid) {
      const hoverInspection = inspectElement(hoveredValid);

      if (this.locked && selectedValid && selectedInspection && this.overlayOptions.showMeasurements) {
        const measurement = measureBetweenElements(selectedValid, hoveredValid);
        if (measurement) {
          renderMeasurementOverlay(svg, labels, selectedInspection.geometry, measurement);
        }
        renderHighlightOverlay(
          svg,
          labels,
          hoverInspection,
          'hover',
          this.overlayOptions.showDimensionsBadge,
          rightInset
        );
      } else {
        if (this.overlayOptions.showBoxModel) {
          renderBoxModelOverlay(svg, labels, hoverInspection, rightInset);
        }
        renderSmartLayoutGuides(hoveredValid, hoverInspection);
        renderHighlightOverlay(
          svg,
          labels,
          hoverInspection,
          'hover',
          this.overlayOptions.showDimensionsBadge,
          rightInset
        );
      }
    }
  }

  private emitHoverUpdate(): void {
    const hoveredValid = this.hoveredEl && this.hoveredEl.isConnected ? this.hoveredEl : null;
    const selectedValid = this.selectedEl && this.selectedEl.isConnected ? this.selectedEl : null;

    const inspection = hoveredValid ? inspectElement(hoveredValid) : null;
    let measurement: DistanceMeasurement | null = null;

    if (this.locked && selectedValid && hoveredValid && selectedValid !== hoveredValid) {
      measurement = measureBetweenElements(selectedValid, hoveredValid);
    }

    this.hooks.onEvent({
      type: 'INSPECTION_HOVER',
      inspection,
      measurement,
    });
  }
}
