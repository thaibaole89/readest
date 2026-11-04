import { describe, expect, it } from 'vitest';
import { getAdjacentChapterHref, isKeyRepeat } from '@/app/reader/utils/keyboardNavigation';
import type { TOCItem } from '@/libs/document';

const item = (href: string, subitems?: TOCItem[]) =>
  ({ id: 0, label: href, href, subitems }) as TOCItem;

const toc = [
  item('intro'),
  item('part1', [item('ch1'), item('ch2')]),
  item('part2', [item('ch3')]),
  item('outro'),
];

describe('getAdjacentChapterHref', () => {
  it('moves to the next chapter across a part boundary', () => {
    expect(getAdjacentChapterHref(toc, 'ch2', 1)).toBe('ch3');
  });

  it('skips a part heading when stepping back so the reader never stays put', () => {
    expect(getAdjacentChapterHref(toc, 'ch1', -1)).toBe('intro');
    expect(getAdjacentChapterHref(toc, 'ch3', -1)).toBe('ch2');
  });

  it('enters a part from its heading', () => {
    expect(getAdjacentChapterHref(toc, 'part1', 1)).toBe('ch1');
  });

  it('returns undefined at the ends of the book and for an unknown position', () => {
    expect(getAdjacentChapterHref(toc, 'outro', 1)).toBeUndefined();
    expect(getAdjacentChapterHref(toc, 'intro', -1)).toBeUndefined();
    expect(getAdjacentChapterHref(toc, 'missing', 1)).toBeUndefined();
    expect(getAdjacentChapterHref(undefined, 'ch1', 1)).toBeUndefined();
  });
});

describe('isKeyRepeat', () => {
  it('reads the repeat flag from window and iframe key events', () => {
    expect(isKeyRepeat(new KeyboardEvent('keydown', { repeat: true }))).toBe(true);
    expect(isKeyRepeat(new KeyboardEvent('keydown'))).toBe(false);
    expect(isKeyRepeat(new MessageEvent('message', { data: { repeat: true } }))).toBe(true);
    expect(isKeyRepeat(undefined)).toBe(false);
  });
});
