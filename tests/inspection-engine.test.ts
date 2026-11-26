import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeDesignSystem, inspectElement } from '@/core/analysis';
import { measureBetweenElements } from '@/core/geometry';

function mockRect(el: Element, rect: Partial<DOMRect>): void {
  const full: DOMRect = {
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    right: (rect.left ?? 0) + (rect.width ?? 0),
    bottom: (rect.top ?? 0) + (rect.height ?? 0),
    toJSON: () => ({}),
  };
  el.getBoundingClientRect = () => full;
}

function makeStyle(overrides: Partial<CSSStyleDeclaration>): CSSStyleDeclaration {
  return {
    display: 'block',
    position: 'static',
    zIndex: 'auto',
    overflow: 'visible',
    boxSizing: 'border-box',
    marginTop: '0px',
    marginRight: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    borderTopWidth: '0px',
    borderRightWidth: '0px',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
    borderTopColor: 'rgb(0, 0, 0)',
    borderTopLeftRadius: '0px',
    borderRadius: '0px',
    boxShadow: 'none',
    outlineWidth: '0px',
    outlineStyle: 'none',
    outlineColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    color: 'rgb(15, 23, 42)',
    fontFamily: '"Inter", sans-serif',
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
    letterSpacing: 'normal',
    textAlign: 'start',
    textTransform: 'none',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'normal',
    alignItems: 'normal',
    alignContent: 'normal',
    gridTemplateColumns: 'none',
    gridTemplateRows: 'none',
    rowGap: '0px',
    columnGap: '0px',
    maxWidth: 'none',
    minHeight: '0px',
    opacity: '1',
    transform: 'none',
    visibility: 'visible',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    ...overrides,
  } as CSSStyleDeclaration;
}

describe('Core Inspection & Analysis Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inspects a Flexbox container and generates human-readable layout insights', () => {
    const container = document.createElement('section');
    container.className = 'hero-row';
    const childA = document.createElement('div');
    childA.className = 'card';
    childA.textContent = 'Card A';
    container.appendChild(childA);
    document.body.appendChild(container);

    mockRect(container, { left: 40, top: 80, width: 960, height: 420 });
    mockRect(childA, { left: 72, top: 112, width: 400, height: 200 });

    const styles = new Map<Element, CSSStyleDeclaration>([
      [
        container,
        makeStyle({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          rowGap: '24px',
          columnGap: '24px',
          paddingTop: '32px',
          paddingRight: '32px',
          paddingBottom: '32px',
          paddingLeft: '32px',
          marginBottom: '24px',
          backgroundColor: 'rgb(255, 255, 255)',
        }),
      ],
      [childA, makeStyle({ display: 'block' })],
      [document.body, makeStyle({ backgroundColor: 'rgb(248, 250, 252)' })],
    ]);

    const result = inspectElement(container, (el) => styles.get(el) ?? makeStyle({}));

    expect(result.selector).toBe('section.hero-row');
    expect(result.geometry.width).toBe(960);
    expect(result.geometry.height).toBe(420);
    expect(result.boxModel.padding).toEqual({ top: 32, right: 32, bottom: 32, left: 32 });
    expect(result.boxModel.content.width).toBe(896);
    expect(result.layout.isFlex).toBe(true);
    expect(result.layout.gap).toBe('24px');
    expect(result.layout.insights).toEqual(
      expect.arrayContaining([
        { label: 'Layout', value: 'Flexbox' },
        { label: 'Direction', value: 'Row' },
        { label: 'Gap', value: '24px' },
        { label: 'Alignment', value: 'Center' },
        { label: 'Distribution', value: 'Space Between' },
      ])
    );
    expect(result.copyableCss).toContain('display: flex;');
    expect(result.copyableCss).toContain('padding: 32px;');
    expect(result.children).toHaveLength(1);
  });

  it('measures distances between sibling and nested elements accurately', () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    parent.append(a, b);
    document.body.appendChild(parent);

    mockRect(parent, { left: 100, top: 100, width: 500, height: 300 });
    mockRect(a, { left: 120, top: 120, width: 100, height: 80 });
    mockRect(b, { left: 260, top: 120, width: 100, height: 80 });

    const siblingMeasure = measureBetweenElements(a, b);
    expect(siblingMeasure).not.toBeNull();
    expect(siblingMeasure!.isContained).toBe(false);
    expect(siblingMeasure!.horizontal?.distance).toBe(40);

    const nestedMeasure = measureBetweenElements(parent, a);
    expect(nestedMeasure).not.toBeNull();
    expect(nestedMeasure!.isContained).toBe(true);
    expect(nestedMeasure!.innerOffsets).toEqual({ top: 20, right: 380, bottom: 200, left: 20 });
  });

  it('analyzes a page design system (colors, typography, spacing, radii, grid & flex)', () => {
    const wrapper = document.createElement('main');
    wrapper.className = 'page-shell';
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    const heading = document.createElement('h1');
    heading.textContent = 'LayoutLens Demo';
    const bodyText = document.createElement('p');
    bodyText.textContent = 'Explore rendered styles and spacing.';

    grid.append(heading, bodyText);
    wrapper.appendChild(grid);
    document.body.appendChild(wrapper);

    mockRect(document.body, { left: 0, top: 0, width: 1440, height: 900 });
    mockRect(wrapper, { left: 120, top: 0, width: 1200, height: 800 });
    mockRect(grid, { left: 144, top: 32, width: 1152, height: 400 });
    mockRect(heading, { left: 144, top: 32, width: 500, height: 48 });
    mockRect(bodyText, { left: 144, top: 96, width: 500, height: 24 });

    const styles = new Map<Element, CSSStyleDeclaration>([
      [
        wrapper,
        makeStyle({
          maxWidth: '1200px',
          marginLeft: '120px',
          marginRight: '120px',
          paddingTop: '24px',
          paddingBottom: '24px',
          backgroundColor: 'rgb(255, 255, 255)',
        }),
      ],
      [
        grid,
        makeStyle({
          display: 'grid',
          gridTemplateColumns: '368px 368px 368px',
          columnGap: '24px',
          rowGap: '24px',
          paddingTop: '24px',
          paddingBottom: '24px',
          borderTopLeftRadius: '12px',
          backgroundColor: 'rgb(241, 245, 249)',
        }),
      ],
      [
        heading,
        makeStyle({
          fontSize: '36px',
          fontWeight: '700',
          lineHeight: '44px',
          color: 'rgb(15, 23, 42)',
        }),
      ],
      [
        bodyText,
        makeStyle({
          fontSize: '16px',
          fontWeight: '400',
          lineHeight: '24px',
          color: 'rgb(71, 85, 105)',
        }),
      ],
    ]);

    const summary = analyzeDesignSystem(document, window, (el) => styles.get(el) ?? makeStyle({}));

    expect(summary.scannedElements).toBeGreaterThanOrEqual(4);
    expect(summary.colors.some((c) => c.hex === '#0F172A')).toBe(true);
    expect(summary.typography.some((t) => t.fontSize === '36px')).toBe(true);
    expect(summary.spacing.some((s) => s.value === '24px')).toBe(true);
    expect(summary.radii.some((r) => r.value === '12px')).toBe(true);
    expect(summary.layoutTree.some((n) => n.type === 'grid' && n.directionOrCols === '3 cols')).toBe(
      true
    );
    expect(summary.containers.some((c) => c.maxWidth === '1200px')).toBe(true);
  });

  it('safely scans pages containing open Shadow DOM components without throwing', () => {
    const host = document.createElement('div');
    host.className = 'web-component';
    const shadow = host.attachShadow({ mode: 'open' });
    const innerBtn = document.createElement('button');
    innerBtn.textContent = 'Shadow Action';
    shadow.appendChild(innerBtn);
    document.body.appendChild(host);

    mockRect(document.body, { left: 0, top: 0, width: 1280, height: 800 });
    mockRect(host, { left: 20, top: 20, width: 200, height: 48 });
    mockRect(innerBtn, { left: 20, top: 20, width: 200, height: 48 });

    const summary = analyzeDesignSystem(document, window, () =>
      makeStyle({ backgroundColor: 'rgb(37, 99, 235)', color: 'rgb(255, 255, 255)' })
    );

    expect(summary.scannedElements).toBeGreaterThanOrEqual(2);
    expect(summary.colors.some((c) => c.hex === '#2563EB')).toBe(true);
  });
});
