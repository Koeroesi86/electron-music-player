import type { RadioQuery, RadioStation, RadioTag } from '../types/radio';

const directoryUrl = 'https://all.api.radio-browser.info';
const requestTimeout = 10000;
const maxQueryLength = 100;
const stationLimit = 60;
const tagLimit = 40;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// the audio element can not play an HLS playlist, and the directory filter for them does not catch all
const isPlayable = (value: JsonRecord) => text(value.stationuuid) && text(value.name).trim() && value.hls !== 1;

const toStation = (value: unknown): RadioStation | undefined => {
  if (!isRecord(value) || !isPlayable(value)) return undefined;

  return {
    uuid: text(value.stationuuid),
    name: text(value.name).trim(),
    country: text(value.country),
    tags: text(value.tags).split(',').filter(Boolean),
    codec: text(value.codec),
    bitrate: count(value.bitrate),
  };
};

const toTag = (value: unknown): RadioTag | undefined =>
  isRecord(value) && text(value.name) ? { name: text(value.name), stationCount: count(value.stationcount) } : undefined;

const toServer = (value: unknown) => (isRecord(value) && text(value.name) ? `https://${text(value.name)}` : undefined);

const toList = <T>(value: unknown, convert: (item: unknown) => T | undefined) => {
  if (!Array.isArray(value)) throw new Error('Unexpected answer of the station directory');

  return value.map(convert).filter((item): item is T => item !== undefined);
};

/** A stream is only played when it is a plain http(s) address */
const toStreamUrl = (value: unknown) => {
  const url = isRecord(value) && URL.canParse(text(value.url)) ? new URL(text(value.url)) : undefined;
  if (!url || !/^https?:$/.test(url.protocol)) throw new Error('The station has no playable stream');

  return url.href;
};

const shuffled = <T>(items: T[]) =>
  items
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);

const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, maxQueryLength) : '');

/** The query of a renderer message, anything but plain text is dropped */
export const toRadioQuery = (payload: unknown): RadioQuery => {
  const { name, tag } = isRecord(payload) ? payload : {};

  return { name: clean(name) || undefined, tag: clean(tag) || undefined };
};

/** Client of the radio-browser.info API: it has no single host, so a server is picked at random and the next one is tried when it fails */
export const createRadioBrowser = (userAgent: string) => {
  let servers: Promise<string[]> | undefined;

  const fetchJson = async (url: string): Promise<unknown> => {
    const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(requestTimeout) });
    if (!response.ok) throw new Error(`Station directory ${url} answered ${response.status}`);

    return response.json();
  };

  const discoverServers = () =>
    fetchJson(`${directoryUrl}/json/servers`)
      .then((list) => shuffled(toList(list, toServer)))
      .then((list) => (list.length ? list : [directoryUrl]))
      .catch(() => [directoryUrl]);

  const getServers = () => {
    servers ??= discoverServers();
    return servers;
  };

  const fetchFrom = async ([server, ...others]: string[], path: string, lastError?: unknown): Promise<unknown> => {
    if (!server) throw lastError ?? new Error('No station directory server is available');

    return fetchJson(`${server}${path}`).catch((error) => fetchFrom(others, path, error));
  };

  const request = async (path: string) => fetchFrom(await getServers(), path);

  const searchStations = async ({ name, tag }: RadioQuery) => {
    const parameters = new URLSearchParams({ hidebroken: 'true', hls: 'false', order: 'clickcount', reverse: 'true', limit: `${stationLimit}` });
    if (name) parameters.set('name', name);
    if (tag) parameters.set('tag', tag);

    return toList(await request(`/json/stations/search?${parameters}`), toStation);
  };

  const getTags = async () => {
    const parameters = new URLSearchParams({ hidebroken: 'true', order: 'stationcount', reverse: 'true', limit: `${tagLimit}` });

    return toList(await request(`/json/tags?${parameters}`), toTag);
  };

  /** Also registers a click of the station, which ranks it in the directory */
  const resolveStream = async (uuid: string) => toStreamUrl(await request(`/json/url/${encodeURIComponent(uuid)}`));

  return { searchStations, getTags, resolveStream };
};

export type RadioBrowser = ReturnType<typeof createRadioBrowser>;
