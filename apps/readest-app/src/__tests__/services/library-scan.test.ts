import { describe, expect, it, vi } from 'vitest';
import { findNewBooks, type ScannedBookIdentity } from '@/services/libraryScan';
import type { Book } from '@/types/book';
import type { BookMetadata } from '@/libs/document';
import { getMetadataHash } from '@/utils/book';

const metadata = (title: string) =>
  ({ title, author: 'A', language: 'vi', identifier: `id-${title}` }) as unknown as BookMetadata;

const identityOf =
  (table: Record<string, Partial<ScannedBookIdentity>>) =>
  async (path: string): Promise<ScannedBookIdentity> => {
    const identity = table[path];
    if (!identity) throw new Error('not a book');
    return { hash: path, format: 'EPUB', metadata: metadata(path), ...identity };
  };

const entry = (fullPath: string) => ({ fullPath, size: 1024 });

describe('findNewBooks', () => {
  it('suggests only books the library does not have', async () => {
    const books = [
      { hash: 'same-bytes', format: 'EPUB', title: 'Owned' },
      { hash: 'other', format: 'EPUB', metaHash: getMetadataHash(metadata('Reexport')) },
    ] as Book[];

    const outcome = await findNewBooks(
      [entry('/new.epub'), entry('/copy.epub'), entry('/reexport.epub')],
      books,
      identityOf({
        '/new.epub': { hash: 'n' },
        '/copy.epub': { hash: 'same-bytes' },
        '/reexport.epub': { hash: 'r', metadata: metadata('Reexport') },
      }),
    );

    expect(outcome.candidates.map((c) => c.path)).toEqual(['/new.epub']);
    expect(outcome.duplicateCount).toBe(2);
  });

  it('skips a file already imported from the same path without reading it', async () => {
    const identify = vi.fn(identityOf({}));
    const books = [{ hash: 'h', format: 'EPUB', filePath: '/lib/a.epub' }] as Book[];

    const outcome = await findNewBooks([entry('/lib/a.epub')], books, identify);

    expect(identify).not.toHaveBeenCalled();
    expect(outcome.duplicateCount).toBe(1);
  });

  it('keeps one copy when the same book appears twice in the scan', async () => {
    const outcome = await findNewBooks(
      [entry('/a/book.epub'), entry('/b/book.epub')],
      [],
      identityOf({
        '/a/book.epub': { hash: 'x', metadata: metadata('One') },
        '/b/book.epub': { hash: 'x', metadata: metadata('One') },
      }),
    );

    expect(outcome.candidates).toHaveLength(1);
    expect(outcome.duplicateCount).toBe(1);
  });

  it('suggests a book the reader deleted from the library', async () => {
    const books = [{ hash: 'gone', format: 'EPUB', deletedAt: 1 }] as Book[];

    const outcome = await findNewBooks(
      [entry('/gone.epub')],
      books,
      identityOf({ '/gone.epub': { hash: 'gone' } }),
    );

    expect(outcome.candidates).toHaveLength(1);
  });

  it('reports unreadable files instead of failing the scan', async () => {
    const onProgress = vi.fn();
    const outcome = await findNewBooks(
      [entry('/broken.epub'), entry('/ok.epub')],
      [],
      identityOf({ '/ok.epub': {} }),
      { onProgress },
    );

    expect(outcome.candidates.map((c) => c.path)).toEqual(['/ok.epub']);
    expect(outcome.unreadableCount).toBe(1);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });
});
