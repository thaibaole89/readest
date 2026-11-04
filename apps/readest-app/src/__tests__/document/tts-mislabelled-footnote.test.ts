import { describe, expect, it } from 'vitest';
import { createTTSNodeFilter } from '@/services/tts/nodeFilter';

describe('TTS filter and duokan footnote classes', () => {
  const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

  it('reads paragraphs a converter wrapped in a footnote-classed list', () => {
    const list = parse('<ol class="duokan-footnote-content"><p>Body text.</p></ol>')
      .firstElementChild!;
    expect(createTTSNodeFilter()(list)).toBe(NodeFilter.FILTER_SKIP);
  });

  it('still rejects a real note list', () => {
    const list = parse(
      '<ol class="duokan-footnote-content"><li class="duokan-footnote-item">Note.</li></ol>',
    ).firstElementChild!;
    expect(createTTSNodeFilter()(list)).toBe(NodeFilter.FILTER_REJECT);
  });
});
