import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { createRadioStreamHandler } from './radioProxy';

const listen = (server: http.Server) => new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

const close = (server: http.Server) => new Promise((resolve) => server.close(resolve));

const metadata = (text: string) => {
  const padded = Buffer.alloc(Math.ceil(Buffer.byteLength(text) / 16) * 16);
  padded.write(text);
  return Buffer.concat([Buffer.from([padded.length / 16]), padded]);
};

describe('radio stream proxy', () => {
  const titles: [string, string][] = [];
  const resolved: Record<string, string> = {};
  let upstream: http.Server;
  let proxy: http.Server;
  let upstreamUrl: string;
  let proxyUrl: string;

  beforeAll(async () => {
    upstream = http.createServer((request, response) => {
      if (request.url === '/icy') {
        response.writeHead(200, { 'content-type': 'audio/aac', 'icy-metaint': '4' });
        response.end(Buffer.concat([Buffer.from('aaaa'), metadata("StreamTitle='Artist - Song';"), Buffer.from('bbbb')]));
        return;
      }
      if (request.url === '/plain') {
        response.writeHead(200, { 'content-type': 'audio/mpeg' });
        response.end(`asked for metadata: ${request.headers['icy-metadata']}`);
        return;
      }
      response.writeHead(404).end();
    });
    upstreamUrl = `http://127.0.0.1:${await listen(upstream)}`;

    const app = express();
    app.get(
      '/radio/:uuid',
      createRadioStreamHandler({
        resolveStream: (uuid) => (resolved[uuid] ? Promise.resolve(resolved[uuid]) : Promise.reject(new Error('unknown station'))),
        onTitle: (uuid, title) => titles.push([uuid, title]),
      })
    );
    proxy = http.createServer(app);
    proxyUrl = `http://127.0.0.1:${await listen(proxy)}`;
  });

  afterAll(async () => {
    await Promise.all([close(upstream), close(proxy)]);
  });

  it('serves the audio of an ICY stream without its metadata and reports the title', async () => {
    resolved.icy = `${upstreamUrl}/icy`;

    const response = await fetch(`${proxyUrl}/radio/icy`, { headers: { origin: 'http://127.0.0.1:3000' } });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/aac');
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:3000');
    expect(await response.text()).toBe('aaaabbbb');
    expect(titles).toContainEqual(['icy', 'Artist - Song']);
  });

  it('asks the station for metadata', async () => {
    resolved.plain = `${upstreamUrl}/plain`;

    expect(await (await fetch(`${proxyUrl}/radio/plain`)).text()).toBe('asked for metadata: 1');
  });

  it('answers 502 when the stream is not available', async () => {
    resolved.gone = `${upstreamUrl}/gone`;

    expect((await fetch(`${proxyUrl}/radio/gone`)).status).toBe(502);
  });

  it('answers 502 for a station the directory does not know', async () => {
    expect((await fetch(`${proxyUrl}/radio/unknown`)).status).toBe(502);
  });

  it.each(['..%2Fsecret', 'a%20b', 'x'.repeat(65)])('answers 404 for the invalid station %s', async (uuid) => {
    expect((await fetch(`${proxyUrl}/radio/${uuid}`)).status).toBe(404);
  });
});
