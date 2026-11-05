import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingQuickPanel from '@/app/reader/components/ReadingQuickPanel';

const h = vi.hoisted(() => ({
  saveViewSettings: vi.fn(async () => {}),
  renderer: { setAttribute: vi.fn(), removeAttribute: vi.fn() },
  isEink: false,
  isColorEink: false,
  animated: true,
  applyPageTurnAttributes: vi.fn(),
  setThemeColor: vi.fn(),
  setThemeMode: vi.fn(),
  pageTurnSpeed: 'normal',
}));

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ envConfig: {} }) }));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: h.saveViewSettings }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: Object.assign(() => ({}), {
    getState: () => ({ settings: { globalViewSettings: { isColorEink: h.isColorEink } } }),
  }),
}));
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: (selector: (s: unknown) => unknown) =>
    selector({ getBookData: () => ({ isFixedLayout: false }) }),
}));
vi.mock('@/app/reader/hooks/useCapturedTurn', () => ({
  applyPageTurnAttributes: h.applyPageTurnAttributes,
}));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: () => ({
    themeColor: 'book-sepia',
    isDarkMode: false,
    setThemeColor: h.setThemeColor,
    setThemeMode: h.setThemeMode,
  }),
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
      animated: h.animated,
      pageTurnStyle: 'flip',
      pageTurnSpeed: h.pageTurnSpeed,
    }),
  }),
}));

describe('ReadingQuickPanel e-ink toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isEink = false;
    h.isColorEink = false;
    h.animated = true;
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

describe('ReadingQuickPanel page turn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isEink = false;
    h.animated = true;
  });
  afterEach(cleanup);

  it('shows the current style and switches the turn while reading', async () => {
    render(<ReadingQuickPanel bookKey='book' />);
    expect(screen.getByRole('button', { name: 'Flip' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Curl' }));

    await waitFor(() => expect(h.applyPageTurnAttributes).toHaveBeenCalled());
    expect(h.saveViewSettings).toHaveBeenCalledWith(
      {},
      'book',
      'pageTurnStyle',
      'curl',
      false,
      false,
    );
    expect(h.renderer.setAttribute).toHaveBeenCalledWith('animated', '');
  });

  it('turns animation off without forgetting the chosen style', async () => {
    render(<ReadingQuickPanel bookKey='book' />);

    fireEvent.click(screen.getByRole('button', { name: 'Off' }));

    await waitFor(() => expect(h.renderer.removeAttribute).toHaveBeenCalledWith('animated'));
    expect(h.saveViewSettings).toHaveBeenCalledWith({}, 'book', 'animated', false, false, false);
    expect(h.saveViewSettings).not.toHaveBeenCalledWith(
      {},
      'book',
      'pageTurnStyle',
      expect.anything(),
      false,
      false,
    );
  });

  it('locks the choice in e-ink mode, which cannot animate', () => {
    h.isEink = true;
    render(<ReadingQuickPanel bookKey='book' />);

    expect((screen.getByRole('button', { name: 'Flip' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers one theme per page color, with the current one marked', () => {
    render(<ReadingQuickPanel bookKey='book-1' />);

    const names = ['White', 'Paper', 'Sepia', 'Dark Gray', 'Black'];
    for (const name of names) expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sepia' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Auto' })).toBeNull();
  });

  it('picks the dark mode that belongs to a dark page color', () => {
    render(<ReadingQuickPanel bookKey='book-1' />);

    fireEvent.click(screen.getByRole('button', { name: 'Black' }));

    expect(h.setThemeColor).toHaveBeenCalledWith('contrast');
    expect(h.setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('changes how fast pages turn', async () => {
    render(<ReadingQuickPanel bookKey='book-1' />);

    fireEvent.click(screen.getByRole('button', { name: 'Slow' }));

    await waitFor(() =>
      expect(h.saveViewSettings).toHaveBeenCalledWith(
        {},
        'book-1',
        'pageTurnSpeed',
        'slow',
        false,
        false,
      ),
    );
  });

  it('offers Domine among the reading fonts', () => {
    render(<ReadingQuickPanel bookKey='book-1' />);

    expect(screen.getByRole('button', { name: 'Domine' })).toBeTruthy();
  });
});
