import clsx from 'clsx';
import React from 'react';
import { PiGear, PiMinus, PiPlus } from 'react-icons/pi';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { useEinkMode } from '@/hooks/useEinkMode';
import { useTranslation } from '@/hooks/useTranslation';
import { saveViewSettings } from '@/helpers/settings';
import { getMaxInlineSize } from '@/utils/config';
import { themes } from '@/styles/themes';

const FONT_SIZE = { MIN: 12, MAX: 48, STEP: 1 };
const LINE_HEIGHT = { MIN: 1.1, MAX: 2.2, STEP: 0.1 };
const PAGE_GAP = { MIN: 2, MAX: 15, STEP: 1 };

const READING_FONTS = [
  { family: 'Literata', kind: 'Serif' },
  { family: 'Source Serif 4', kind: 'Serif' },
  { family: 'Noto Serif', kind: 'Serif' },
  { family: 'Be Vietnam Pro', kind: 'Sans-serif' },
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
  const { themeMode, themeColor, isDarkMode, setThemeMode, setThemeColor } = useThemeStore();
  const { applyEinkMode } = useEinkMode();
  const viewSettings = getViewSettings(bookKey);
  if (!viewSettings) return null;

  const currentFont =
    viewSettings.defaultFont === 'Serif' ? viewSettings.serifFont : viewSettings.sansSerifFont;
  const currentColumns = viewSettings.maxColumnCount === 1 ? 1 : 2;

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

  const handleEinkChange = async (isEink: boolean) => {
    await saveViewSettings(envConfig, bookKey, 'isEink', isEink);
    const renderer = getView(bookKey)?.renderer;
    if (isEink) renderer?.setAttribute('eink', '');
    else renderer?.removeAttribute('eink');
    applyEinkMode(isEink);
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
        'flex-col gap-3 rounded-2xl border p-4 shadow-2xl',
        menuClassName,
      )}
    >
      <div className='flex gap-2' role='group' aria-label={_('Theme')}>
        {themes.slice(0, 6).map(({ name, label, colors }) => (
          <button
            key={name}
            type='button'
            title={_(label)}
            aria-label={_(label)}
            aria-pressed={themeColor === name}
            onClick={() => setThemeColor(name)}
            className={clsx(
              'border-base-300 h-9 flex-1 rounded-full border text-xs',
              themeColor === name && 'ring-primary ring-2 ring-offset-1',
            )}
            style={{
              backgroundColor: isDarkMode ? colors.dark['base-100'] : colors.light['base-100'],
              color: isDarkMode ? colors.dark['base-content'] : colors.light['base-content'],
            }}
          >
            Aa
          </button>
        ))}
      </div>

      <div className='flex gap-1' role='group' aria-label={_('Theme Mode')}>
        <button
          type='button'
          className={pillClass(themeMode === 'light')}
          onClick={() => setThemeMode('light')}
        >
          {_('Light')}
        </button>
        <button
          type='button'
          className={pillClass(themeMode === 'dark')}
          onClick={() => setThemeMode('dark')}
        >
          {_('Dark')}
        </button>
        <button
          type='button'
          className={pillClass(themeMode === 'auto')}
          onClick={() => setThemeMode('auto')}
        >
          {_('Auto')}
        </button>
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
