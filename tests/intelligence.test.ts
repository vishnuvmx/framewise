import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeDesignSystem, inspectElement } from '@/core/analysis';

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
    overflowX: 'visible',
    overflowY: 'visible',
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
    borderTopStyle: 'none',
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
    color: 'rgb(23, 23, 23)',
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
    letterSpacing: 'normal',
    textAlign: 'start',
    textTransform: 'none',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    flexGrow: '0',
    flexShrink: '1',
    justifyContent: 'normal',
    alignItems: 'normal',
    alignContent: 'normal',
    gridTemplateColumns: 'none',
    gridTemplateRows: 'none',
    gridColumn: 'auto',
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

describe('Interface Intelligence (Components, Outliers, Relationships, Blueprint)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('discovers repeated button/card patterns, detects height/radius outliers, and builds a design blueprint', () => {
    const shell = document.createElement('main');
    shell.className = 'page-container';

    const btnRow = document.createElement('div');
    btnRow.className = 'actions';

    const buttons: HTMLButtonElement[] = [];
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.textContent = i === 3 ? 'Legacy CTA' : `Action ${i + 1}`;
      btnRow.appendChild(btn);
      buttons.push(btn);
    }

    const grid = document.createElement('section');
    grid.className = 'card-grid';
    const cards: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('article');
      card.className = 'feature-card';
      const title = document.createElement('h3');
      title.textContent = `Feature ${i + 1}`;
      const body = document.createElement('p');
      body.textContent = 'Description text';
      card.append(title, body);
      grid.appendChild(card);
      cards.push(card);
    }

    shell.append(btnRow, grid);
    document.body.appendChild(shell);

    mockRect(document.body, { left: 0, top: 0, width: 1440, height: 900 });
    mockRect(shell, { left: 120, top: 0, width: 1200, height: 800 });
    mockRect(btnRow, { left: 120, top: 40, width: 600, height: 50 });
    mockRect(grid, { left: 120, top: 140, width: 1200, height: 320 });

    const styleMap = new Map<Element, CSSStyleDeclaration>();
    styleMap.set(
      shell,
      makeStyle({
        maxWidth: '1200px',
        marginLeft: '120px',
        marginRight: '120px',
        paddingTop: '48px',
        paddingBottom: '48px',
        backgroundColor: 'rgb(255, 255, 255)',
      })
    );
    styleMap.set(
      btnRow,
      makeStyle({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: '12px',
        rowGap: '12px',
      })
    );
    styleMap.set(
      grid,
      makeStyle({
        display: 'grid',
        gridTemplateColumns: '380px 380px 380px',
        columnGap: '24px',
        rowGap: '24px',
        paddingTop: '48px',
      })
    );

    buttons.forEach((btn, i) => {
      const isOutlier = i === 3;
      mockRect(btn, { left: 120 + i * 130, top: 40, width: 120, height: isOutlier ? 36 : 44 });
      styleMap.set(
        btn,
        makeStyle({
          display: 'inline-flex',
          backgroundColor: 'rgb(37, 99, 235)',
          color: 'rgb(255, 255, 255)',
          borderTopLeftRadius: isOutlier ? '4px' : '8px',
          borderRadius: isOutlier ? '4px' : '8px',
          fontSize: '14px',
          fontWeight: '500',
        })
      );
    });

    cards.forEach((card, i) => {
      mockRect(card, { left: 120 + i * 404, top: 140, width: 380, height: 220 });
      mockRect(card.children[0], { left: 140 + i * 404, top: 160, width: 200, height: 28 });
      mockRect(card.children[1], { left: 140 + i * 404, top: 200, width: 300, height: 40 });
      styleMap.set(
        card,
        makeStyle({
          backgroundColor: 'rgb(248, 250, 252)',
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopLeftRadius: '12px',
          borderRadius: '12px',
          paddingTop: '24px',
          paddingBottom: '24px',
        })
      );
    });

    const getStyle = (el: Element) => styleMap.get(el) ?? makeStyle({});

    // 1. Layout Relationships on a button inside btnRow inside max-width shell
    const inspectedBtn = inspectElement(buttons[1], getStyle);
    expect(inspectedBtn.relationships.some((r) => r.role === 'parent' && r.detail.includes('Row flex'))).toBe(
      true
    );
    expect(
      inspectedBtn.relationships.some((r) => r.role === 'container' && r.detail.includes('1200px'))
    ).toBe(true);
    expect(
      inspectedBtn.relationships.some((r) => r.role === 'siblings' && r.summary === 'Child 2 of 4')
    ).toBe(true);

    // 2. Page scan: Component Discovery, Outliers, and Blueprint
    const summary = analyzeDesignSystem(document, window, getStyle);

    const primaryBtnGroup = summary.components.find((c) => c.category === 'button');
    expect(primaryBtnGroup).toBeDefined();
    expect(primaryBtnGroup!.count).toBe(3);

    const cardGroup = summary.components.find((c) => c.category === 'card');
    expect(cardGroup).toBeDefined();
    expect(cardGroup!.count).toBe(3);

    const btnConsistency = summary.consistencyReports.find((r) => r.category === 'button');
    expect(btnConsistency).toBeDefined();
    expect(btnConsistency!.baseline.heightPx).toBe(44);
    expect(btnConsistency!.outliers).toHaveLength(1);
    expect(btnConsistency!.outliers[0].label).toBe('Legacy CTA');
    expect(btnConsistency!.outliers[0].reasons.join(' ')).toContain('height 36px vs 44px');

    expect(summary.blueprint.layout.mainContainer?.maxWidth).toBe('1200px');
    expect(summary.blueprint.layout.primaryGrid?.columns).toBe(3);
    expect(summary.blueprint.colors.accent?.hex).toBe('#2563EB');
  });

  it('separates icon-only buttons, tolerates intentional repeated variants (>= 3x), and explains flex/containing-block constraints', () => {
    const wrapper = document.createElement('section');
    wrapper.className = 'toolbar-wrap';

    const flexBar = document.createElement('div');
    flexBar.className = 'toolbar';

    // 5 icon-only compact buttons (20x20, empty text)
    const iconButtons: HTMLButtonElement[] = [];
    for (let i = 0; i < 5; i++) {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Icon ${i + 1}`);
      flexBar.appendChild(btn);
      iconButtons.push(btn);
    }

    // 4 primary text buttons (40px, 8px radius)
    const primaryButtons: HTMLButtonElement[] = [];
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Primary ${i + 1}`;
      flexBar.appendChild(btn);
      primaryButtons.push(btn);
    }

    // 3 intentional secondary pill buttons (32px, 999px radius) — >= 3x so NOT drift
    const secondaryButtons: HTMLButtonElement[] = [];
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Pill ${i + 1}`;
      flexBar.appendChild(btn);
      secondaryButtons.push(btn);
    }

    // 1 genuine one-off drifted text button (35px, 2px radius)
    const driftedBtn = document.createElement('button');
    driftedBtn.textContent = 'Drifted CTA';
    flexBar.appendChild(driftedBtn);

    // Absolute badge inside transformed wrapper
    const badge = document.createElement('span');
    badge.className = 'floating-badge';
    badge.textContent = 'New';
    wrapper.append(flexBar, badge);
    document.body.appendChild(wrapper);

    mockRect(document.body, { left: 0, top: 0, width: 1280, height: 800 });
    mockRect(wrapper, { left: 40, top: 20, width: 1200, height: 200 });
    mockRect(flexBar, { left: 40, top: 20, width: 1200, height: 60 });
    mockRect(badge, { left: 1180, top: 24, width: 48, height: 20 });

    const styleMap = new Map<Element, CSSStyleDeclaration>();
    styleMap.set(
      wrapper,
      makeStyle({
        position: 'static',
        transform: 'translate3d(0px, 0px, 0px)',
      })
    );
    styleMap.set(
      flexBar,
      makeStyle({
        display: 'flex',
        flexDirection: 'row',
        columnGap: '8px',
        rowGap: '8px',
      })
    );
    styleMap.set(
      badge,
      makeStyle({
        position: 'absolute',
        top: '4px',
        right: '12px',
        fontSize: '12px',
      })
    );

    iconButtons.forEach((btn, i) => {
      mockRect(btn, { left: 40 + i * 28, top: 30, width: 20, height: 20 });
      styleMap.set(
        btn,
        makeStyle({
          display: 'inline-flex',
          borderTopLeftRadius: '4px',
          borderRadius: '4px',
          fontSize: '12px',
          flexShrink: '0',
        })
      );
    });

    primaryButtons.forEach((btn, i) => {
      mockRect(btn, { left: 200 + i * 110, top: 26, width: 100, height: 40 });
      styleMap.set(
        btn,
        makeStyle({
          display: 'inline-flex',
          backgroundColor: 'rgb(37, 99, 235)',
          color: 'rgb(255, 255, 255)',
          borderTopLeftRadius: '8px',
          borderRadius: '8px',
          fontSize: '14px',
          flexGrow: '1',
          flexShrink: '0',
        })
      );
    });

    secondaryButtons.forEach((btn, i) => {
      mockRect(btn, { left: 660 + i * 90, top: 30, width: 84, height: 32 });
      styleMap.set(
        btn,
        makeStyle({
          display: 'inline-flex',
          backgroundColor: 'rgb(241, 245, 249)',
          color: 'rgb(15, 23, 42)',
          borderTopLeftRadius: '999px',
          borderRadius: '999px',
          fontSize: '13px',
        })
      );
    });

    mockRect(driftedBtn, { left: 950, top: 28, width: 110, height: 35 });
    styleMap.set(
      driftedBtn,
      makeStyle({
        display: 'inline-flex',
        backgroundColor: 'rgb(37, 99, 235)',
        color: 'rgb(255, 255, 255)',
        borderTopLeftRadius: '2px',
        borderRadius: '2px',
        fontSize: '14px',
      })
    );

    const getStyle = (el: Element) => styleMap.get(el) ?? makeStyle({});

    const summary = analyzeDesignSystem(document, window, getStyle);

    // Icon buttons separated into their own category
    const iconGroup = summary.components.find((c) => c.category === 'icon-button');
    expect(iconGroup).toBeDefined();
    expect(iconGroup!.count).toBe(5);

    // Text button consistency report uses 40px baseline, ignores >=3x secondary pill variant, flags only the 1 drifted CTA
    const btnConsistency = summary.consistencyReports.find((r) => r.category === 'button');
    expect(btnConsistency).toBeDefined();
    expect(btnConsistency!.baseline.heightPx).toBe(40);
    expect(btnConsistency!.outliers).toHaveLength(1);
    expect(btnConsistency!.outliers[0].label).toBe('Drifted CTA');

    // Flex-item grow/no-shrink notes appear on primaryButtons[0]
    const inspectedPrimary = inspectElement(primaryButtons[0], getStyle);
    const parentRel = inspectedPrimary.relationships.find((r) => r.role === 'parent');
    expect(parentRel?.detail).toContain('grow 1');
    expect(parentRel?.detail).toContain('no-shrink');

    // Containing block via transform appears on absolute badge
    const inspectedBadge = inspectElement(badge, getStyle);
    expect(
      inspectedBadge.relationships.some(
        (r) => r.role === 'container' && r.detail.includes('Containing block via transform')
      )
    ).toBe(true);
  });
});
