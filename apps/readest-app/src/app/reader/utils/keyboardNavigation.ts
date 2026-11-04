import type { TOCItem } from '@/libs/document';

export const HELD_KEY_PAGE_TURN_MS = 350;

export const isKeyRepeat = (event?: KeyboardEvent | MessageEvent) =>
  event instanceof KeyboardEvent ? event.repeat : !!event?.data?.repeat;

const flatten = (items: TOCItem[]): TOCItem[] =>
  items.flatMap((item) => [item, ...flatten(item.subitems ?? [])]);

/**
 * The next or previous chapter in reading order. Only leaves count: a part
 * heading usually opens on the same page as its first chapter, so stepping back
 * onto it would land on the page the reader is already on.
 */
export const getAdjacentChapterHref = (
  toc: TOCItem[] | undefined,
  currentHref: string | undefined,
  direction: 1 | -1,
): string | undefined => {
  if (!toc || !currentHref) return undefined;
  const items = flatten(toc);
  const start = items.findIndex((item) => item.href === currentHref);
  if (start < 0) return undefined;
  for (let i = start + direction; i >= 0 && i < items.length; i += direction) {
    if (items[i]?.href && !items[i]?.subitems?.length) return items[i]?.href;
  }
  return undefined;
};
