import type { Book, BookFormat } from '@/types/book';
import { DocumentLoader, type BookMetadata } from '@/libs/document';
import type { ClosableFile } from '@/utils/file';
import { partialMD5 } from '@/utils/md5';
import { tryNativeParseEpub } from '@/utils/tauriEpubBridge';
import type { AppService, OsPlatform } from '@/types/system';
import { runWithConcurrency } from '@/utils/concurrency';
import { getBaseFilename } from '@/utils/path';
import { getMetadataHash, getStableMetadataHash } from '@/utils/book';
import {
  buildBookLookupIndex,
  hasVolatileIdentifiers,
  normalizeFilePathForIndex,
  type ScannedFileEntry,
} from './bookService';

const IDENTIFY_CONCURRENCY = 6;

/** Reads a file's identity the way importBook does, without importing it. */
export const identifyBookFile = async (
  appService: Pick<AppService, 'openFile'>,
  path: string,
): Promise<ScannedBookIdentity> => {
  const nativeEpub = await tryNativeParseEpub(path);
  if (nativeEpub) {
    return {
      hash: nativeEpub.partialMd5,
      format: 'EPUB',
      metadata: nativeEpub.bookDoc.metadata,
    };
  }
  const file = await appService.openFile(path, 'None');
  try {
    const { book, format } = await new DocumentLoader(file).open();
    return { hash: await partialMD5(file), format, metadata: book.metadata };
  } finally {
    await (file as ClosableFile).close?.();
  }
};

export interface ScannedBookIdentity {
  hash: string;
  format: BookFormat;
  metadata: BookMetadata;
}

export interface ScanCandidate {
  path: string;
  size: number;
  metadata: BookMetadata;
}

export interface ScanOutcome {
  candidates: ScanCandidate[];
  /** Files skipped because the library, or an earlier file here, already has the book. */
  duplicateCount: number;
  /** Files that could not be read as a book. */
  unreadableCount: number;
}

/**
 * Narrows scanned files to the books the library does not have, using the same
 * identities importBook dedupes on: path, content hash, then metadata. A book the
 * user deleted counts as absent, since it is no longer in the library.
 */
export const findNewBooks = async (
  entries: ScannedFileEntry[],
  books: Book[],
  identify: (path: string) => Promise<ScannedBookIdentity>,
  options: { osPlatform?: OsPlatform; onProgress?: (done: number, total: number) => void } = {},
): Promise<ScanOutcome> => {
  const { osPlatform, onProgress } = options;
  const index = buildBookLookupIndex(books, osPlatform);
  const seen = new Set<string>();
  let done = 0;

  const classify = async (
    entry: ScannedFileEntry,
  ): Promise<ScanCandidate | 'duplicate' | 'unreadable'> => {
    const pathKey = normalizeFilePathForIndex(entry.fullPath, osPlatform);
    if (pathKey && index.byFilePath.has(pathKey)) return 'duplicate';

    let identity: ScannedBookIdentity;
    try {
      identity = await identify(entry.fullPath);
    } catch (error) {
      console.warn('Library scan: skipping unreadable file', entry.fullPath, error);
      return 'unreadable';
    }

    const { hash, format, metadata } = identity;
    const metaHash = getMetadataHash(
      metadata,
      format === 'PDF' ? getBaseFilename(entry.fullPath) : undefined,
    );
    const stableHash = hasVolatileIdentifiers(format) ? getStableMetadataHash(metadata) : undefined;
    const metaKey = metaHash ? `${metaHash}:${format}` : undefined;
    const stableKey = stableHash ? `${stableHash}:${format}` : undefined;

    const inLibrary =
      (index.byHash.get(hash) && !index.byHash.get(hash)?.deletedAt) ||
      (metaKey && index.byMetaKey.has(metaKey)) ||
      (stableKey && index.byStableKey.has(stableKey));
    const keys = [`hash:${hash}`, metaKey, stableKey].filter((key): key is string => !!key);
    if (inLibrary || keys.some((key) => seen.has(key))) return 'duplicate';
    keys.forEach((key) => seen.add(key));

    return { path: entry.fullPath, size: entry.size, metadata };
  };

  const outcomes = await runWithConcurrency(entries, IDENTIFY_CONCURRENCY, async (entry) => {
    const result = await classify(entry);
    done += 1;
    onProgress?.(done, entries.length);
    return result;
  });
  const results = outcomes.map((outcome) => ('result' in outcome ? outcome.result : 'unreadable'));

  return {
    candidates: results.filter((r): r is ScanCandidate => typeof r === 'object'),
    duplicateCount: results.filter((r) => r === 'duplicate').length,
    unreadableCount: results.filter((r) => r === 'unreadable').length,
  };
};
