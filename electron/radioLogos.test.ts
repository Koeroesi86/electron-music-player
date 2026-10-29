import { describe, expect, it, vi } from 'vitest';
import { createRadioLogos } from './radioLogos';

const png = () => new Response(Buffer.from('logo'), { headers: { 'content-type': 'image/png' } });

describe('radio logos', () => {
  it('fetches the logo the directory lists for a station once', async () => {
    const fetcher = vi.fn(async () => png());
    const logos = createRadioLogos((uuid) => (uuid === 'a' ? 'https://logo.example/a.png' : undefined), fetcher);

    expect(await logos.get('a')).toEqual({ type: 'image/png', data: Buffer.from('logo') });
    await logos.get('a');

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith('https://logo.example/a.png', expect.anything());
  });

  it('has no logo for a station the directory did not list one for', async () => {
    const fetcher = vi.fn(async () => png());

    expect(await createRadioLogos(() => undefined, fetcher).get('a')).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps the answer of a logo that does not load, so it is not asked for again', async () => {
    const fetcher = vi.fn(async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    const logos = createRadioLogos(() => 'https://logo.example/a.png', fetcher);

    expect(await logos.get('a')).toBeUndefined();
    await logos.get('a');

    expect(fetcher).toHaveBeenCalledOnce();
  });
});
