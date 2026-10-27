import { PassThrough, Readable, pipeline } from 'stream';
import { IcyMetadataStripper } from './icyMetadata';

export interface RadioStreamDeps {
  /** The address of the stream of a station */
  resolveStream: (uuid: string) => Promise<string>;
  onTitle: (uuid: string, title: string, streamUrl?: string) => void;
}

export const stationUuid = /^[0-9a-zA-Z-]{1,64}$/;

/** The audio of a station without its ICY metadata, whose titles go to `onTitle`; aborting the signal closes the upstream connection */
export const openRadioStream = async (uuid: string, signal: AbortSignal, { resolveStream, onTitle }: RadioStreamDeps) => {
  const upstream = await fetch(await resolveStream(uuid), { headers: { 'Icy-MetaData': '1' }, signal });
  if (!upstream.ok || !upstream.body) throw new Error(`The stream answered ${upstream.status}`);

  const metaint = Number(upstream.headers.get('icy-metaint'));
  const strippers = metaint > 0 ? [new IcyMetadataStripper(metaint, (title, streamUrl) => onTitle(uuid, title, streamUrl))] : [];

  // one pipeline: destroying the audio ends every stage, and the abort of the upstream is an end, not an unhandled error that opens an error dialog and holds the app
  const audio = new PassThrough();
  pipeline([Readable.from(upstream.body), ...strippers, audio], () => undefined);

  return { contentType: upstream.headers.get('content-type') ?? 'audio/mpeg', audio };
};
