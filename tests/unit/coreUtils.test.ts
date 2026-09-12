import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fmt,
  fmtRaw,
  fmtShort,
  fmtCompact,
  parseNum,
  escapeHtml,
  sanitizeChatMarkdown,
  toIsoDateSafe,
  relDate,
  getMonthName,
  getCurrencySymbol,
  getCurrencyHtml,
  getConversionRate,
  renderIconPicker,
  renderAccountSelector,
  emptyState,
  createProgressRing,
  cached,
  invalidateCache,
  debounce,
  saveImageToFS,
  loadImageFromFS,
  $,
  $$,
  sanitize,
} from '../../src/core/utils';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
    convertFileSrc: vi.fn((uri) => `converted://${uri}`),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn().mockResolvedValue({ uri: 'file:///app/test.jpg' }),
    getUri: vi.fn().mockResolvedValue({ uri: 'file:///app/test.jpg' }),
  },
  Directory: {
    Data: 'DATA',
  },
}));

describe('Core Utils Unit Tests (utils.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
    useSettingsStore.setState({
      baseCurrency: 'SAR',
      language: 'ar',
      numberSystem: 'latn',
      decimalPlaces: 2,
      numberSeparator: 'comma_dot',
      currencyDisplayMode: 'symbol',
      incognito: false,
    });
    useAppStore.setState({
      incognito: false,
    });
  });

  describe('DOM Helpers & Sanitization', () => {
    it('selects single and multiple elements via $ and $$', () => {
      document.body.innerHTML = '<div class="test-div">1</div><div class="test-div">2</div>';
      expect($('.test-div')).not.toBeNull();
      expect($$('.test-div').length).toBe(2);
      expect($('.non-existent')).toBeNull();
    });

    it('sanitizes malicious HTML safely', () => {
      const clean = sanitize('<img src=x onerror=alert(1)><b>Hello</b>');
      expect(clean).toContain('<b>Hello</b>');
      expect(clean).not.toContain('onerror');
    });

    it('escapes HTML special characters correctly', () => {
      expect(escapeHtml('<script>alert("test & \'1\'")</script>')).toBe(
        '&lt;script&gt;alert(&quot;test &amp; &#39;1&#39;&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('sanitizes chat markdown with bold tags and MORE_INFO button', () => {
      const md = 'Hello **Masarifi** [MORE_INFO]';
      const parsed = sanitizeChatMarkdown(md);
      expect(parsed).toContain('<strong>Masarifi</strong>');
      expect(parsed).toContain('data-action="send-chat-continue"');
      expect(sanitizeChatMarkdown('')).toBe('');
      expect(sanitizeChatMarkdown(null)).toBe('');
    });
  });

  describe('Currency & Number Formatting', () => {
    it('returns conversion rate for base currency', () => {
      useSettingsStore.setState({ baseCurrency: 'SAR' });
      expect(getConversionRate()).toBeGreaterThan(0);

      useSettingsStore.setState({ baseCurrency: 'USD' });
      expect(getConversionRate()).toBeGreaterThan(0);
    });

    it('gets currency symbol for different display modes', () => {
      useSettingsStore.setState({ baseCurrency: 'SAR', currencyDisplayMode: 'code' });
      expect(getCurrencySymbol()).toBe('SAR');

      useSettingsStore.setState({ baseCurrency: 'USD', currencyDisplayMode: 'symbol' });
      expect(getCurrencySymbol()).toBe('$');

      useSettingsStore.setState({ baseCurrency: 'AED', currencyDisplayMode: 'local', language: 'ar' });
      expect(getCurrencySymbol()).toBe('د.إ');

      useSettingsStore.setState({ baseCurrency: 'EGP', currencyDisplayMode: 'local', language: 'en' });
      expect(getCurrencySymbol()).toBe('EGP');
    });

    it('renders currency SVG or symbol for getCurrencyHtml', () => {
      useSettingsStore.setState({ baseCurrency: 'SAR' });
      expect(getCurrencyHtml()).toContain('<svg');

      useSettingsStore.setState({ baseCurrency: 'USD' });
      expect(getCurrencyHtml()).toBe('$');
    });

    it('formats numbers with fmt, fmtRaw, fmtShort, and fmtCompact', () => {
      expect(fmt(100)).toBeDefined();
      expect(fmtRaw(100, 2)).toBe('100.00');
      expect(fmtShort(1500)).toBeDefined();
      expect(fmtCompact(1000000)).toBeDefined();

      // Incognito mode
      useAppStore.setState({ incognito: true });
      expect(fmt(1000)).toBe('•••••');
      expect(fmtShort(1000)).toBe('•••');
      expect(fmtCompact(1000)).toBe('•••');
    });

    it('supports Arabic numbering systems and custom separators', () => {
      useSettingsStore.setState({
        numberSystem: 'arab',
        numberSeparator: 'comma_dot',
        decimalPlaces: 2,
      });

      const formatted = fmtRaw(1234.5);
      expect(formatted).toBeDefined();
    });

    it('parses numbers from diverse input formats and Arabic digits', () => {
      expect(parseNum('1,234.56')).toBe(1234.56);
      expect(parseNum('١٢٣٤٫٥٦')).toBe(1234.56);
      expect(parseNum(500)).toBe(500);
      expect(parseNum(null)).toBe(0);
      expect(parseNum('')).toBe(0);
      expect(parseNum('invalid')).toBe(0);
    });
  });

  describe('Dates, Caching & UI Components', () => {
    it('converts safe ISO dates and formats relative dates', () => {
      const now = new Date();
      expect(toIsoDateSafe(now)).toBe(now.toISOString());
      expect(toIsoDateSafe('invalid', 'fallback')).toBe('fallback');

      expect(relDate('2024-01-01')).toBeDefined();
      expect(relDate(null)).toBe('');
      expect(getMonthName(0)).toBeDefined();
    });

    it('renders icon picker, account selector, empty states and progress rings', () => {
      const picker = renderIconPicker('shopping_bag');
      expect(picker).toContain('shopping_bag');

      const selector = renderAccountSelector('acc_1', 'acc-select', [{ id: 'acc_1', name: 'Main Account' }]);
      expect(selector).toContain('Main Account');

      const empty = emptyState('inbox', 'No Data', 'Add some items', { onclick: 'add()', text: 'Add' });
      expect(empty).toContain('No Data');

      const ring = createProgressRing(75, '#3b82f6');
      expect(ring).toContain('75%');
      expect(ring).toContain('#3b82f6');
    });

    it('debounces function execution', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(150);
      expect(fn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('caches asynchronous function results with TTL', async () => {
      let callCount = 0;
      const fetcher = async () => {
        callCount++;
        return { data: 'val' };
      };

      const cachedFn = cached('testKey', fetcher, 500);
      const res1 = await cachedFn();
      const res2 = await cachedFn();

      expect(res1).toEqual({ data: 'val' });
      expect(res2).toEqual({ data: 'val' });
      expect(callCount).toBe(1);

      invalidateCache('testKey');
      await cachedFn();
      expect(callCount).toBe(2);
    });

    it('handles Filesystem operations on Native and Web', async () => {
      const base64 = 'data:image/jpeg;base64,12345';
      const webResult = await saveImageToFS(base64);
      expect(webResult).toBe(base64);

      // On native platform
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const nativeSaved = await saveImageToFS(base64);
      expect(nativeSaved).toContain('txn_img_');
      expect(Filesystem.writeFile).toHaveBeenCalled();

      const loaded = await loadImageFromFS(nativeSaved);
      expect(loaded).toContain('converted://');
    });
  });
});
