import { describe, expect, it } from 'vitest';
import {
  buildShortSelector,
  colorDistance,
  computeContrastRatio,
  formatSpacingShorthand,
  getPrimaryFontFamily,
  normalizeColor,
  parsePx,
} from '@/shared/utils/css';

describe('CSS utilities', () => {
  it('parses px values safely', () => {
    expect(parsePx('24px')).toBe(24);
    expect(parsePx('12.5px')).toBe(12.5);
    expect(parsePx('auto')).toBe(0);
    expect(parsePx('normal')).toBe(0);
    expect(parsePx('')).toBe(0);
  });

  it('formats spacing shorthands cleanly', () => {
    expect(formatSpacingShorthand({ top: 0, right: 0, bottom: 0, left: 0 })).toBe('0px');
    expect(formatSpacingShorthand({ top: 16, right: 16, bottom: 16, left: 16 })).toBe('16px');
    expect(formatSpacingShorthand({ top: 12, right: 24, bottom: 12, left: 24 })).toBe('12px 24px');
    expect(formatSpacingShorthand({ top: 8, right: 16, bottom: 24, left: 16 })).toBe('8px 16px 24px');
    expect(formatSpacingShorthand({ top: 4, right: 8, bottom: 12, left: 16 })).toBe('4px 8px 12px 16px');
  });

  it('normalizes rgb, rgba, and transparent colors to hex', () => {
    expect(normalizeColor('rgb(79, 70, 229)').hex).toBe('#4F46E5');
    expect(normalizeColor('rgba(0, 0, 0, 0)').hex).toBe('TRANSPARENT');
    expect(normalizeColor('rgba(15, 23, 42, 0.5)').opacity).toBe(0.5);
  });

  it('computes WCAG contrast ratios and grades', () => {
    const high = computeContrastRatio('rgb(15, 23, 42)', 'rgb(255, 255, 255)');
    expect(high).not.toBeNull();
    expect(high!.ratio).toBeGreaterThan(15);
    expect(high!.grade).toBe('AAA');

    const low = computeContrastRatio('rgb(200, 200, 200)', 'rgb(255, 255, 255)');
    expect(low?.grade).toBe('Fail');
  });

  it('extracts primary font family and short selector', () => {
    expect(getPrimaryFontFamily('"Inter", -apple-system, sans-serif')).toBe('Inter');

    const div = document.createElement('div');
    div.className = 'card hero-panel extra';
    expect(buildShortSelector(div)).toBe('div.card.hero-panel');

    div.id = 'main-header';
    expect(buildShortSelector(div)).toBe('div#main-header');
  });

  it('calculates Euclidean RGB distance between hex colors', () => {
    expect(colorDistance('#FFFFFF', '#FFFFFF')).toBe(0);
    expect(colorDistance('#111111', '#141414')).toBeLessThan(10);
    expect(colorDistance('#000000', '#FFFFFF')).toBeGreaterThan(400);
  });
});
