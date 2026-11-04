import clsx from 'clsx';
import React, { useState } from 'react';

import Dialog from '@/components/Dialog';
import { useTranslation } from '@/hooks/useTranslation';
import type { ScanOutcome } from '@/services/libraryScan';
import { formatAuthors, formatBytes, formatTitle } from '@/utils/book';
import { getFilename } from '@/utils/path';

interface ScanResultsDialogProps {
  outcome: ScanOutcome;
  onCancel: () => void;
  onConfirm: (paths: string[]) => void;
}

/** Lists the books a scan found that are not in the library, for the reader to pick from. */
const ScanResultsDialog: React.FC<ScanResultsDialogProps> = ({ outcome, onCancel, onConfirm }) => {
  const _ = useTranslation();
  const { candidates, duplicateCount, unreadableCount } = outcome;
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(candidates.map(({ path }) => path)),
  );
  const isAllSelected = selected.size === candidates.length;

  const toggle = (path: string) => {
    const next = new Set(selected);
    if (!next.delete(path)) next.add(path);
    setSelected(next);
  };

  return (
    <Dialog
      isOpen
      title={_('Found {{count}} new books', { count: candidates.length })}
      onClose={onCancel}
      boxClassName='sm:min-w-[520px] sm:max-w-[560px] sm:h-auto! sm:max-h-[80%]'
      contentClassName='my-0! px-5! pt-0! pb-4! flex flex-col gap-3 min-h-0'
    >
      {(duplicateCount > 0 || unreadableCount > 0) && (
        <p className='text-base-content/70 text-sm'>
          {duplicateCount > 0 &&
            _('Skipped {{count}} already in your library or duplicated.', {
              count: duplicateCount,
            })}{' '}
          {unreadableCount > 0 &&
            _('Could not read {{count}} files.', {
              count: unreadableCount,
            })}
        </p>
      )}

      <label className='flex cursor-pointer items-center gap-3 text-sm font-medium'>
        <input
          type='checkbox'
          className='checkbox checkbox-sm'
          checked={isAllSelected}
          onChange={() =>
            setSelected(isAllSelected ? new Set() : new Set(candidates.map(({ path }) => path)))
          }
        />
        {_('Select All')}
      </label>

      <ul className='border-base-200 divide-base-200 min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border'>
        {candidates.map(({ path, size, metadata }) => {
          const title = formatTitle(metadata.title) || getFilename(path);
          return (
            <li key={path}>
              <label
                title={path}
                className={clsx('hover:bg-base-200 flex cursor-pointer items-center gap-3 p-3')}
              >
                <input
                  type='checkbox'
                  className='checkbox checkbox-sm'
                  checked={selected.has(path)}
                  onChange={() => toggle(path)}
                />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>{title}</span>
                  <span className='text-base-content/60 block truncate text-xs'>
                    {[formatAuthors(metadata.author), formatBytes(size), path]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className='flex justify-end gap-2'>
        <button type='button' className='btn btn-ghost btn-sm' onClick={onCancel}>
          {_('Cancel')}
        </button>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          disabled={selected.size === 0}
          onClick={() =>
            onConfirm(candidates.map(({ path }) => path).filter((p) => selected.has(p)))
          }
        >
          {_('Add {{count}} books', { count: selected.size })}
        </button>
      </div>
    </Dialog>
  );
};

export default ScanResultsDialog;
