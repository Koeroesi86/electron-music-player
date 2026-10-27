import { openRadioStream, stationUuid } from './radioProxy';
import type { RadioStreamDeps } from './radioProxy';

const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

/** Serves `emusic://radio/<uuid>`: the audio of a station as it arrives, and the connection to the station closes when the player cancels */
export const handleRadioRequest = (deps: RadioStreamDeps) => async (request: Request) => {
  const uuid = new URL(request.url).pathname.replace(/^\//, '');
  if (!stationUuid.test(uuid)) return new Response(undefined, { status: 404, headers: corsHeaders });

  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());

  try {
    const { contentType, audio } = await openRadioStream(uuid, abort.signal, deps);
    const chunks = audio[Symbol.asyncIterator]();
    // a pull per chunk keeps the pace of the player, and a cancelled response destroys the stream: the upstream connection ends with it
    const body = new ReadableStream<Uint8Array>({
      pull: (controller) => chunks.next().then(({ done, value }) => (done ? controller.close() : controller.enqueue(value))),
      cancel: () => {
        audio.destroy();
        abort.abort();
      },
    });

    return new Response(body, { headers: { ...corsHeaders, 'Content-Type': contentType, 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(undefined, { status: 502, headers: corsHeaders });
  }
};
