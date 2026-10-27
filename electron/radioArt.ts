import { createHash } from 'crypto';

export interface RadioArtImage {
  type: string;
  data: Buffer;
}

type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

const lookupTimeout = 5000;
const maxImageBytes = 2_000_000;
const maxTitles = 100;

const searchUrl = (title: string) => `https://itunes.apple.com/search?${new URLSearchParams({ term: title, media: 'music', entity: 'song', limit: '1' })}`;

const getOk = async (fetcher: Fetcher, url: string) => {
  const response = await fetcher(url, { signal: AbortSignal.timeout(lookupTimeout) });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);

  return response;
};

const getImage = async (fetcher: Fetcher, url: string): Promise<RadioArtImage> => {
  const response = await getOk(fetcher, url);
  const type = response.headers.get('content-type') ?? '';
  const data = Buffer.from(await response.arrayBuffer());
  if (!type.startsWith('image/') || data.length === 0 || data.length > maxImageBytes) throw new Error('Not a usable image');

  return { type, data };
};

const isHttpUrl = (value: string | undefined): value is string => value !== undefined && URL.canParse(value) && /^https?:$/.test(new URL(value).protocol);

const artworkOf = (answer: unknown) => {
  const url =
    typeof answer === 'object' && answer !== null && 'results' in answer && Array.isArray(answer.results) ? answer.results[0]?.artworkUrl100 : undefined;
  return typeof url === 'string' ? url.replace('100x100bb', '600x600bb') : undefined;
};

const fromSearch = async (fetcher: Fetcher, title: string) => {
  const artwork = artworkOf(await (await getOk(fetcher, searchUrl(title))).json());
  if (!isHttpUrl(artwork)) throw new Error('The search found no art');

  return getImage(fetcher, artwork);
};

/**
 * The art of the song a station announces: the image the station names in its `StreamUrl`, else the first match of a music search.
 * The answer of a title is kept (also when there is none), so a title is looked up once; the oldest titles are dropped past a limit.
 */
export const createRadioArt = (fetcher: Fetcher = fetch) => {
  const lookups = new Map<string, Promise<string | undefined>>();
  const images = new Map<string, RadioArtImage>();

  const keyOf = (title: string) => createHash('sha1').update(title).digest('hex').slice(0, 16);

  const find = async (title: string, streamUrl: string | undefined) => {
    const image = await (isHttpUrl(streamUrl) ? getImage(fetcher, streamUrl) : Promise.reject(new Error('No stream url')))
      .catch(() => fromSearch(fetcher, title))
      .catch(() => undefined);
    if (image) images.set(keyOf(title), image);
    return image && keyOf(title);
  };

  const forget = () => {
    const oldest = lookups.keys().next().value;
    if (oldest === undefined) return;

    lookups.delete(oldest);
    images.delete(keyOf(oldest));
  };

  return {
    /** The key of the art of a title, undefined when none was found */
    lookup: (title: string, streamUrl?: string) => {
      const known = lookups.get(title);
      if (known) return known;

      const lookup = find(title, streamUrl);
      lookups.set(title, lookup);
      if (lookups.size > maxTitles) forget();
      return lookup;
    },
    get: (key: string) => images.get(key),
  };
};
