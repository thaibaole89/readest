import clsx from 'clsx';
import React from 'react';
import { PiGear, PiMinus, PiPlus } from 'react-icons/pi';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { applyPageTurnAttributes } from '@/app/reader/hooks/useCapturedTurn';
import { useEinkMode } from '@/hooks/useEinkMode';
import { useTranslation } from '@/hooks/useTranslation';
import { saveViewSettings } from '@/helpers/settings';
import { getMaxInlineSize } from '@/utils/config';
import { themes } from '@/styles/themes';
import type { PageTurnSpeed, PageTurnStyle } from '@/types/book';

const FONT_SIZE = { MIN: 12, MAX: 48, STEP: 1 };
const LINE_HEIGHT = { MIN: 1.1, MAX: 2.2, STEP: 0.1 };
const PAGE_GAP = { MIN: 2, MAX: 15, STEP: 1 };

const READING_FONTS = [
  { family: 'Literata', kind: 'Serif' },
  { family: 'Domine', kind: 'Serif' },
  { family: 'Source Serif 4', kind: 'Serif' },
  { family: 'Noto Serif', kind: 'Serif' },
  { family: 'Be Vietnam Pro', kind: 'Sans-serif' },
] as const;

type PageTurnChoice = PageTurnStyle | 'off';

const PAGE_TURNS: { value: PageTurnChoice; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'slide', label: 'Slide' },
  { value: 'curl', label: 'Curl' },
  { value: 'flip', label: 'Flip' },
];

const PAGE_TURN_SPEEDS: { value: PageTurnSpeed; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
];

// Light pages read in black, dark pages in white.
const READING_THEMES = [
  { name: 'contrast', isDark: false, label: 'White' },
  { name: 'book-paper', isDark: false, label: 'Paper' },
  { name: 'book-sepia', isDark: false, label: 'Sepia' },
  { name: 'book-gray', isDark: true, label: 'Dark Gray' },
  { name: 'contrast', isDark: true, label: 'Black' },
] as const;

const clamp = (value: number, { MIN, MAX }: { MIN: number; MAX: number }) =>
  Math.min(MAX, Math.max(MIN, Math.round(value * 10) / 10));

interface StepperProps {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}

const Stepper: React.FC<StepperProps> = ({ label, value, onDecrease, onIncrease }) => {
  const _ = useTranslation();
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm'>{label}</span>
      <div className='flex items-center gap-1'>
        <button
          type='button'
          aria-label={`${_('Decrease')} ${label}`}
          className='btn btn-ghost btn-sm btn-square'
          onClick={onDecrease}
        >
          <PiMinus />
        </button>
        <span className='w-10 text-center text-sm tabular-nums'>{value}</span>
        <button
          type='button'
          aria-label={`${_('Increase')} ${label}`}
          className='btn btn-ghost btn-sm btn-square'
          onClick={onIncrease}
        >
          <PiPlus />
        </button>
      </div>
    </div>
  );
};

interface ReadingQuickPanelProps {
  bookKey: string;
  menuClassName?: string;
  setIsDropdownOpen?: (isOpen: boolean) => void;
}

/** Theme, font, size and layout controls, one click away while reading. */
const ReadingQuickPanel: React.FC<ReadingQuickPanelProps> = ({
  bookKey,
  menuClassName,
  setIsDropdownOpen,
}) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const { getView, getViewSettings } = useReaderStore();
  const { setSettingsDialogBookKey, setSettingsDialogOpen, setRequestedPanel } = useSettingsStore();
  const { themeColor, isDarkMode, setThemeMode, setThemeColor } = useThemeStore();
  const { applyEinkMode } = useEinkMode();
  const getBookData = useBookDataStore((s) => s.getBookData);
  const viewSettings = getViewSettings(bookKey);
  if (!viewSettings) return null;

  const currentFont =
    viewSettings.defaultFont === 'Serif' ? viewSettings.serifFont : viewSettings.sansSerifFont;
  const currentColumns = viewSettings.maxColumnCount === 1 ? 1 : 2;
  const currentPageTurn: PageTurnChoice = viewSettings.animated
    ? viewSettings.pageTurnStyle
    : 'off';

  const handleFontChange = async (font: (typeof READING_FONTS)[number]) => {
    const fontKey = font.kind === 'Serif' ? 'serifFont' : 'sansSerifFont';
    await saveViewSettings(envConfig, bookKey, fontKey, font.family);
    await saveViewSettings(envConfig, bookKey, 'defaultFont', font.kind);
  };

  const handleGapChange = (gapPercent: number) => {
    saveViewSettings(envConfig, bookKey, 'gapPercent', gapPercent, false, false);
    getView(bookKey)?.renderer.setAttribute('gap', `${gapPercent}%`);
  };

  const handleColumnsChange = async (columns: number) => {
    await saveViewSettings(envConfig, bookKey, 'maxColumnCount', columns, false, false);
    const renderer = getView(bookKey)?.renderer;
    renderer?.setAttribute('max-column-count', `${columns}`);
    renderer?.setAttribute('max-inline-size', `${getMaxInlineSize(getViewSettings(bookKey)!)}px`);
  };

  const applyTurnAttributes = () => {
    const view = getView(bookKey);
    const latest = getViewSettings(bookKey);
    if (!view || !latest) return;
    applyPageTurnAttributes(view, latest, !!getBookData(bookKey)?.isFixedLayout);
  };

  const handleEinkChange = async (isEink: boolean) => {
    await saveViewSettings(envConfig, bookKey, 'isEink', isEink);
    const renderer = getView(bookKey)?.renderer;
    if (isEink) renderer?.setAttribute('eink', '');
    else renderer?.removeAttribute('eink');
    applyEinkMode(isEink);
    // E-ink has no captured turns, so the renderer's turn mode changes with it.
    applyTurnAttributes();
  };

  const handlePageTurnChange = async (choice: PageTurnChoice) => {
    const animated = choice !== 'off';
    await saveViewSettings(envConfig, bookKey, 'animated', animated, false, false);
    if (choice !== 'off') {
      await saveViewSettings(envConfig, bookKey, 'pageTurnStyle', choice, false, false);
    }
    const renderer = getView(bookKey)?.renderer;
    if (animated) renderer?.setAttribute('animated', '');
    else renderer?.removeAttribute('animated');
    applyTurnAttributes();
  };

  const handleThemeChange = (name: string, isDark: boolean) => {
    setThemeColor(name);
    setThemeMode(isDark ? 'dark' : 'light');
  };

  const handlePageTurnSpeedChange = async (speed: PageTurnSpeed) => {
    await saveViewSettings(envConfig, bookKey, 'pageTurnSpeed', speed, false, false);
    applyTurnAttributes();
  };

  const openAllSettings = () => {
    setIsDropdownOpen?.(false);
    setSettingsDialogBookKey(bookKey);
    setRequestedPanel('Font');
    setSettingsDialogOpen(true);
  };

  const pillClass = (isActive: boolean) =>
    clsx(
      'btn btn-sm flex-1 border-0 font-normal',
      isActive ? 'bg-base-300' : 'btn-ghost text-base-content/70',
    );

  return (
    <div
      className={clsx(
        'dropdown-content no-triangle bg-base-100 border-base-300 z-20 mt-2 flex w-80 max-w-[90vw]',
        'max-h-[calc(100vh-5rem)] flex-col gap-3 overflow-y-auto rounded-2xl border p-4 shadow-2xl',
        menuClassName,
      )}
    >
      <div className='flex gap-2' role='group' aria-label={_('Theme')}>
        {READING_THEMES.map(({ name, isDark, label }) => {
          const palette = themes.find((theme) => theme.name === name)?.colors;
          const colors = isDark ? palette?.dark : palette?.light;
          const isActive = themeColor === name && isDarkMode === isDark;
          return (
            <button
              key={label}
              type='button'
              title={_(label)}
              aria-label={_(label)}
              aria-pressed={isActive}
              onClick={() => handleThemeChange(name, isDark)}
              className={clsx(
                'border-base-300 h-9 flex-1 rounded-full border text-xs',
                isActive && 'ring-primary ring-2 ring-offset-1',
              )}
              style={{
                backgroundColor: colors?.['base-100'],
                color: colors?.['base-content'],
              }}
            >
              Aa
            </button>
          );
        })}
      </div>

      <hr aria-hidden='true' className='border-base-200' />

      <div className='flex flex-col gap-1' role='group' aria-label={_('Font')}>
        {READING_FONTS.map((font) => (
          <button
            key={font.family}
            type='button'
            aria-pressed={currentFont === font.family}
            onClick={() => handleFontChange(font)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-start text-base',
              currentFont === font.family ? 'bg-base-300' : 'hover:bg-base-200',
            )}
            style={{ fontFamily: `"${font.family}"` }}
          >
            {font.family}
          </button>
        ))}
      </div>

      <hr aria-hidden='true' className='border-base-200' />

      <Stepper
        label={_('Font Size')}
        value={`${viewSettings.defaultFontSize}`}
        onDecrease={() =>
          saveViewSettings(
            envConfig,
            bookKey,
            'defaultFontSize',
            clamp(viewSettings.defaultFontSize - FONT_SIZE.STEP, FONT_SIZE),
          )
        }
        onIncrease={() =>
          saveViewSettings(
            envConfig,
            bookKey,
            'defaultFontSize',
            clamp(viewSettings.defaultFontSize + FONT_SIZE.STEP, FONT_SIZE),
          )
        }
      />
      <Stepper
        label={_('Line Spacing')}
        value={viewSettings.lineHeight.toFixed(1)}
        onDecrease={() =>
          saveViewSettings(
            envConfig,
            bookKey,
            'lineHeight',
            clamp(viewSettings.lineHeight - LINE_HEIGHT.STEP, LINE_HEIGHT),
          )
        }
        onIncrease={() =>
          saveViewSettings(
            envConfig,
            bookKey,
            'lineHeight',
            clamp(viewSettings.lineHeight + LINE_HEIGHT.STEP, LINE_HEIGHT),
          )
        }
      />
      <Stepper
        label={_('Page Margins')}
        value={`${viewSettings.gapPercent}%`}
        onDecrease={() => handleGapChange(clamp(viewSettings.gapPercent - PAGE_GAP.STEP, PAGE_GAP))}
        onIncrease={() => handleGapChange(clamp(viewSettings.gapPercent + PAGE_GAP.STEP, PAGE_GAP))}
      />

      <div className='flex items-center justify-between gap-3'>
        <span className='text-sm'>{_('Pages')}</span>
        <div className='flex w-40 gap-1' role='group' aria-label={_('Pages')}>
          <button
            type='button'
            className={pillClass(currentColumns === 1)}
            onClick={() => handleColumnsChange(1)}
          >
            1
          </button>
          <button
            type='button'
            className={pillClass(currentColumns === 2)}
            onClick={() => handleColumnsChange(2)}
          >
            2
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-1'>
        <span className='text-sm'>
          {_('Page Turn')}
          {viewSettings.isEink && (
            <span className='text-base-content/60'> · {_('off in E-Ink Mode')}</span>
          )}
        </span>
        <div className='flex gap-1' role='group' aria-label={_('Page Turn')}>
          {PAGE_TURNS.map(({ value, label }) => (
            <button
              key={value}
              type='button'
              disabled={viewSettings.isEink}
              aria-pressed={currentPageTurn === value}
              className={pillClass(currentPageTurn === value)}
              onClick={() => handlePageTurnChange(value)}
            >
              {_(label)}
            </button>
          ))}
        </div>
      </div>

      {currentPageTurn !== 'off' && !viewSettings.isEink && (
        <div className='flex flex-col gap-1'>
          <span className='text-sm'>{_('Turn Speed')}</span>
          <div className='flex gap-1' role='group' aria-label={_('Turn Speed')}>
            {PAGE_TURN_SPEEDS.map(({ value, label }) => (
              <button
                key={value}
                type='button'
                aria-pressed={viewSettings.pageTurnSpeed === value}
                className={pillClass(viewSettings.pageTurnSpeed === value)}
                onClick={() => handlePageTurnSpeedChange(value)}
              >
                {_(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='flex items-center justify-between'>
        <span className='text-sm'>{_('E-Ink Mode')}</span>
        <input
          type='checkbox'
          aria-label={_('E-Ink Mode')}
          className='toggle toggle-sm'
          checked={viewSettings.isEink}
          onChange={(e) => handleEinkChange(e.target.checked)}
        />
      </div>

      <div className='flex items-center justify-between'>
        <span className='text-sm'>{_('Full Justification')}</span>
        <input
          type='checkbox'
          aria-label={_('Full Justification')}
          className='toggle toggle-sm'
          checked={viewSettings.fullJustification}
          onChange={(e) =>
            saveViewSettings(envConfig, bookKey, 'fullJustification', e.target.checked)
          }
        />
      </div>

      <button type='button' className='btn btn-ghost btn-sm font-normal' onClick={openAllSettings}>
        <PiGear />
        {_('All Settings')}
      </button>
    </div>
  );
};

export default ReadingQuickPanel;
