import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingQuickPanel from '@/app/reader/components/ReadingQuickPanel';

const h = vi.hoisted(() => ({
  saveViewSettings: vi.fn(async () => {}),
  renderer: { setAttribute: vi.fn(), removeAttribute: vi.fn() },
  isEink: false,
  isColorEink: false,
}));

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ envConfig: {} }) }));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: h.saveViewSettings }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: Object.assign(() => ({}), {
    getState: () => ({ settings: { globalViewSettings: { isColorEink: h.isColorEink } } }),
  }),
}));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: () => ({ themeMode: 'light', themeColor: 'default', isDarkMode: false }),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getView: () => ({ renderer: h.renderer }),
    getViewSettings: () => ({
      defaultFont: 'Serif',
      serifFont: 'Literata',
      sansSerifFont: 'Be Vietnam Pro',
      defaultFontSize: 20,
      lineHeight: 1.5,
      gapPercent: 7,
      maxColumnCount: 2,
      fullJustification: true,
      isEink: h.isEink,
    }),
  }),
}));

describe('ReadingQuickPanel e-ink toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isEink = false;
    h.isColorEink = false;
    document.documentElement.removeAttribute('data-eink');
    document.body.classList.remove('no-transitions');
  });
  afterEach(cleanup);

  it('turns e-ink on for the settings, the page and the app chrome', async () => {
    render(<ReadingQuickPanel bookKey='book' />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'E-Ink Mode' }));

    expect(h.saveViewSettings).toHaveBeenCalledWith({}, 'book', 'isEink', true);
    await waitFor(() => expect(document.documentElement.getAttribute('data-eink')).toBe('true'));
    expect(h.renderer.setAttribute).toHaveBeenCalledWith('eink', '');
    expect(document.body.classList.contains('no-transitions')).toBe(true);
    expect(document.documentElement.getAttribute('data-color-eink')).toBe('false');
  });

  it('marks a color e-ink screen so the page keeps its colors', async () => {
    h.isColorEink = true;
    render(<ReadingQuickPanel bookKey='book' />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'E-Ink Mode' }));

    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-color-eink')).toBe('true'),
    );
  });

  it('turns e-ink back off', async () => {
    h.isEink = true;
    render(<ReadingQuickPanel bookKey='book' />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'E-Ink Mode' }));

    expect(h.saveViewSettings).toHaveBeenCalledWith({}, 'book', 'isEink', false);
    await waitFor(() => expect(document.documentElement.getAttribute('data-eink')).toBe('false'));
    expect(h.renderer.removeAttribute).toHaveBeenCalledWith('eink');
  });
});
