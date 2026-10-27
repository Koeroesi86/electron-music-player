import { describe, expect, it, vi } from 'vitest';
import { createRadioArt } from './radioArt';

const image = (type = 'image/jpeg') => new Response(Buffer.from('cover'), { headers: { 'content-type': type } });

const search = (artworkUrl100?: string) => Response.json({ results: artworkUrl100 ? [{ artworkUrl100 }] : [] });

const answers = (routes: Record<string, () => Response>) =>
  vi.fn(async (url: string) => (routes[new URL(url).host] ?? (() => new Response(null, { status: 404 })))());

describe('radio art', () => {
  it('finds the art of a title with a search and serves it by its key', async () => {
    const fetcher = answers({ 'itunes.apple.com': () => search('https://img.example/a/100x100bb.jpg'), 'img.example': () => image() });
    const art = createRadioArt(fetcher);

    const key = await art.lookup('Artist - Song');

    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(art.get(key ?? '')).toEqual({ type: 'image/jpeg', data: Buffer.from('cover') });
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('img.example/a/600x600bb.jpg'), expect.anything());
  });

  it('prefers the image the station names', async () => {
    const fetcher = answers({ 'station.example': () => image('image/png') });

    const key = await createRadioArt(fetcher).lookup('Artist - Song', 'https://station.example/cover.png');

    expect(key).toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('searches when the station address is not an image', async () => {
    const fetcher = answers({
      'station.example': () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      'itunes.apple.com': () => search('https://img.example/a/100x100bb.jpg'),
      'img.example': () => image(),
    });

    expect(await createRadioArt(fetcher).lookup('Artist - Song', 'https://station.example/')).toBeDefined();
  });

  it.each([
    ['finds nothing', answers({ 'itunes.apple.com': () => search() })],
    ['fails', vi.fn().mockRejectedValue(new Error('offline'))],
    [
      'answers with something that is no image',
      answers({ 'itunes.apple.com': () => search('https://img.example/100x100bb.jpg'), 'img.example': () => image('text/html') }),
    ],
  ])('has no art when the search %s', async (_name, fetcher) => {
    expect(await createRadioArt(fetcher).lookup('Artist - Song')).toBeUndefined();
  });

  it('looks a title up once, also when there was no art', async () => {
    const fetcher = answers({ 'itunes.apple.com': () => search() });
    const art = createRadioArt(fetcher);

    await art.lookup('Nothing');
    await art.lookup('Nothing');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('drops the oldest titles past the limit', async () => {
    const fetcher = answers({ 'itunes.apple.com': () => search('https://img.example/100x100bb.jpg'), 'img.example': () => image() });
    const art = createRadioArt(fetcher);
    const first = await art.lookup('title 0');

    await Promise.all(Array.from({ length: 100 }, (_, index) => art.lookup(`title ${index + 1}`)));

    expect(art.get(first ?? '')).toBeUndefined();
  });
});
