import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRadioBrowser, toRadioQuery } from './radioBrowser';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const servers = [{ name: 'de1.api.radio-browser.info' }, { name: 'nl1.api.radio-browser.info' }];
const station = { stationuuid: 'abc-1', name: ' Jazz FM ', country: 'Hungary', tags: 'jazz,smooth,', codec: 'MP3', bitrate: 128 };

const requestedUrls = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map(([url]) => String(url));

describe('radio-browser client', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  describe('searchStations', () => {
    it('lists the stations of a query, the most popular first', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json([station]));

      const stations = await createRadioBrowser('eMusic/1.0.0').searchStations({ name: 'jazz', tag: 'smooth' });

      expect(stations).toEqual([{ uuid: 'abc-1', name: 'Jazz FM', country: 'Hungary', tags: ['jazz', 'smooth'], codec: 'MP3', bitrate: 128 }]);
      const url = new URL(requestedUrls(fetchMock)[1]);
      expect(url.pathname).toBe('/json/stations/search');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        name: 'jazz',
        tag: 'smooth',
        hidebroken: 'true',
        hls: 'false',
        order: 'clickcount',
        reverse: 'true',
      });
      expect(url.hostname).toMatch(/^(de1|nl1)\.api\.radio-browser\.info$/);
    });

    it('identifies the app with its user agent', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json([]));

      await createRadioBrowser('eMusic/1.0.0').searchStations({});

      expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual([{ 'User-Agent': 'eMusic/1.0.0' }, { 'User-Agent': 'eMusic/1.0.0' }]);
    });

    it('drops the entries that are not stations and the HLS streams', async () => {
      fetchMock
        .mockResolvedValueOnce(json(servers))
        .mockResolvedValueOnce(
          json([
            station,
            null,
            'x',
            { stationuuid: 'no-name' },
            { name: 'no uuid' },
            { ...station, stationuuid: 'live', hls: 1 },
            { ...station, stationuuid: 'plain', hls: 0 },
          ])
        );

      expect((await createRadioBrowser('eMusic').searchStations({})).map(({ uuid }) => uuid)).toEqual(['abc-1', 'plain']);
    });

    it('fails on an answer that is not a list', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValue(json({ error: 'nope' }));

      await expect(createRadioBrowser('eMusic').searchStations({})).rejects.toThrow('Unexpected answer');
    });

    it('falls back to the second server after the first answered an error', async () => {
      fetchMock
        .mockResolvedValueOnce(json(servers))
        .mockResolvedValueOnce(json({}, 500))
        .mockResolvedValueOnce(json([station]));

      expect(await createRadioBrowser('eMusic').searchStations({})).toHaveLength(1);
      const [, first, second] = requestedUrls(fetchMock).map((url) => new URL(url).hostname);
      expect(first).not.toBe(second);
    });

    it('fails with the status when the directory answers an error', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValue(json({}, 500));

      await expect(createRadioBrowser('eMusic').searchStations({})).rejects.toThrow('answered 500');
    });

    it('uses the round robin host when the servers cannot be discovered', async () => {
      fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json([station]));

      expect(await createRadioBrowser('eMusic').searchStations({})).toHaveLength(1);
      expect(new URL(requestedUrls(fetchMock)[1]).hostname).toBe('all.api.radio-browser.info');
    });

    it('discovers the servers once', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockImplementation(() => Promise.resolve(json([])));

      const radio = createRadioBrowser('eMusic');
      await radio.searchStations({});
      await radio.searchStations({ name: 'rock' });

      expect(requestedUrls(fetchMock).filter((url) => url.endsWith('/json/servers'))).toHaveLength(1);
    });
  });

  describe('getTags', () => {
    it('lists the genres with their station count', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json([{ name: 'jazz', stationcount: 12 }, { name: '' }]));

      expect(await createRadioBrowser('eMusic').getTags()).toEqual([{ name: 'jazz', stationCount: 12 }]);
      expect(new URL(requestedUrls(fetchMock)[1]).pathname).toBe('/json/tags');
    });
  });

  describe('findStations', () => {
    it('lists the stations of the directory among the uuids in one request', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json([station]));

      const stations = await createRadioBrowser('eMusic').findStations(['abc-1', 'gone-2']);

      expect(stations.map(({ uuid }) => uuid)).toEqual(['abc-1']);
      const url = new URL(requestedUrls(fetchMock)[1]);
      expect(url.pathname).toBe('/json/stations/byuuid');
      expect(url.searchParams.get('uuids')).toBe('abc-1,gone-2');
    });

    it('does not ask the directory about no stations', async () => {
      expect(await createRadioBrowser('eMusic').findStations([])).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('resolveStream', () => {
    it('resolves the stream address of a station', async () => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json({ ok: true, url: 'http://stream.example.com/live' }));

      expect(await createRadioBrowser('eMusic').resolveStream('abc/1')).toBe('http://stream.example.com/live');
      expect(new URL(requestedUrls(fetchMock)[1]).pathname).toBe('/json/url/abc%2F1');
    });

    it.each(['file:///etc/passwd', 'ftp://example.com/stream', 'javascript:alert(1)', 'not a url', ''])('refuses the address %j', async (url) => {
      fetchMock.mockResolvedValueOnce(json(servers)).mockResolvedValueOnce(json({ ok: true, url }));

      await expect(createRadioBrowser('eMusic').resolveStream('abc')).rejects.toThrow('no playable stream');
    });
  });
});

describe('toRadioQuery', () => {
  it('keeps the trimmed text of a name and a tag', () => {
    expect(toRadioQuery({ name: '  jazz ', tag: 'smooth' })).toEqual({ name: 'jazz', tag: 'smooth' });
  });

  it('drops empty and non text values', () => {
    expect(toRadioQuery({ name: '  ', tag: 5 })).toEqual({ name: undefined, tag: undefined });
    expect(toRadioQuery(undefined)).toEqual({ name: undefined, tag: undefined });
    expect(toRadioQuery('jazz')).toEqual({ name: undefined, tag: undefined });
  });

  it('limits the length', () => {
    expect(toRadioQuery({ name: 'a'.repeat(500) }).name).toHaveLength(100);
  });
});
