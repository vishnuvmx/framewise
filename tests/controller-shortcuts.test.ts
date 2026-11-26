import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorController } from '@/content/controller';
import type { ContentEvent } from '@/messaging/protocol';

describe('InspectorController keyboard shortcuts & DOM navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  it('walks parent, child, and siblings while skipping non-inspectable script nodes', () => {
    const parent = document.createElement('section');
    parent.id = 'parent';
    const first = document.createElement('div');
    first.id = 'first';
    const script = document.createElement('script');
    const second = document.createElement('div');
    second.id = 'second';
    const child = document.createElement('span');
    child.id = 'inner-child';
    first.appendChild(child);
    parent.append(first, script, second);
    document.body.appendChild(parent);

    const events: ContentEvent[] = [];
    const controller = new InspectorController({
      onEvent: (evt) => events.push(evt),
      getRightInset: () => 0,
    });

    controller.setActive(true);
    const initial = controller.selectBySelector('#first');
    expect(initial?.selector).toBe('div#first');

    // Down -> first inspectable child
    const down = controller.navigateSelection('child');
    expect(down?.selector).toBe('span#inner-child');

    // Up -> back to #first
    const up = controller.navigateSelection('parent');
    expect(up?.selector).toBe('div#first');

    // Right -> skips <script> and lands on #second
    const right = controller.navigateSelection('next');
    expect(right?.selector).toBe('div#second');

    // Left -> skips <script> and returns to #first
    const left = controller.navigateSelection('prev');
    expect(left?.selector).toBe('div#first');

    controller.setActive(false);
  });

  it('handles Esc progression: locked -> unlocked -> paused, and plain Arrow keys when locked', () => {
    const parent = document.createElement('main');
    parent.id = 'wrap';
    const box = document.createElement('div');
    box.id = 'box';
    parent.appendChild(box);
    document.body.appendChild(parent);

    const controller = new InspectorController({
      onEvent: () => {},
      getRightInset: () => 0,
    });

    controller.setActive(true);
    controller.selectBySelector('#box');
    expect(controller.isLocked()).toBe(true);

    // ArrowUp moves to parent #wrap
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(controller.getSelectedInspection()?.selector).toBe('main#wrap');

    // First Esc unlocks without deactivating
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(controller.isLocked()).toBe(false);
    expect(controller.isActive()).toBe(true);

    // Second Esc pauses inspection
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(controller.isActive()).toBe(false);
  });
});
