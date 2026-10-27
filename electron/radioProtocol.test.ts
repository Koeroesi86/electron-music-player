import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import { handleRadioRequest } from './radioProtocol';

const metadata = (text: string) => {
  const padded = Buffer.alloc(Math.ceil(Buffer.byteLength(text) / 16) * 16);
  padded.write(text);
  return Buffer.concat([Buffer.from([padded.length / 16]), padded]);
};

describe('handleRadioRequest', () => {
  const titles: string[] = [];
  const connections = { open: 0 };
  let station: http.Server;
  let url: string;
  const handle = () => handleRadioRequest({ resolveStream: () => Promise.resolve(url), onTitle: (_uuid, title) => titles.push(title) });

  beforeAll(async () => {
    station = http.createServer((_request, response) => {
      connections.open += 1;
      response.writeHead(200, { 'content-type': 'audio/aac', 'icy-metaint': '4' });
      // never ends
      const timer = setInterval(() => response.write(Buffer.concat([Buffer.from('aaaa'), metadata("StreamTitle='Artist - Song';")])), 5);
      response.on('close', () => {
        clearInterval(timer);
        connections.open -= 1;
      });
    });
    await new Promise<void>((resolve) => station.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(station.address() as AddressInfo).port}/`;
  });

  afterAll(() => {
    station.closeAllConnections();
    station.close();
  });

  it('streams the audio of a station that never ends, without its metadata, and closes the station when the player cancels', async () => {
    const response = await handle()(new Request('emusic://radio/abc-1'));
    const reader = response.body?.getReader();
    const received: Buffer[] = [];
    while (Buffer.concat(received).length < 40) received.push(Buffer.from((await reader?.read())?.value ?? []));
    await reader?.cancel();

    expect(Buffer.concat(received).toString()).toMatch(/^(aaaa)+$/);
    expect(titles).toContain('Artist - Song');
    await expect.poll(() => connections.open).toBe(0);
  });

  it.each(['emusic://radio/', 'emusic://radio/a%20b'])('does not serve the station %s', async (address) => {
    expect((await handle()(new Request(address))).status).toBe(404);
  });
});
