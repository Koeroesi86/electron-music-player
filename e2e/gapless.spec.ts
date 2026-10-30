import { join } from 'path';
import { addFolder, expect, test } from './app';
import { clearProbe, expectTone, longestGap } from './audio';
import { albums } from './library';
import { player } from './player';

// the probe measures in windows of 1024 frames (about 21 ms): a silent window is a gap, and without gapless playback one or two are heard at every change of track
const noGap = 0;

const formats = [
  { format: 'mp3', folder: 'mp3', album: 'Encoder Delay' },
  { format: 'AAC', folder: 'aac', album: 'Priming' },
];

// the encoder of these formats adds silence at the start and the end of a file (the delay and the padding): Chromium leaves it out, which is why the player does not trim it itself
for (const { format, folder, album } of formats) {
  test(`plays the ${format} tracks of an album one after the other without a gap`, async ({ start }) => {
    const { page } = await start();
    await addFolder(page, join(__dirname, 'fixtures', folder), 2);
    const controls = player(page);
    await controls.playAlbum(album);
    await expectTone(page, 440);

    // the track plays to its end: a seek, as the other tests make to reach the end sooner, leaves a gap of its own in an mp3
    await clearProbe(page);
    await expectTone(page, 880);

    expect(await longestGap(page)).toBe(noGap);
  });
}

const titles = new RegExp(albums[0].tracks.map((track) => track.title).join('|'));

const frequencyOf = (title: string) => albums[0].tracks.find((track) => track.title === title)?.frequency ?? 0;

test('plays the tracks in shuffled order without a gap, each once', async ({ session: { page } }) => {
  const controls = player(page);
  await controls.shuffle();
  await controls.playAlbum('Pitch Perfect');
  const heard: string[] = [];
  const hear = async () => {
    await expect(controls.title()).toHaveText(titles);
    const title = (await controls.title().textContent()) ?? '';
    await expectTone(page, frequencyOf(title));
    heard.push(title);
  };
  await hear();

  await clearProbe(page);
  await controls.skipToEnd();
  await expect(controls.title()).not.toHaveText(heard[0]);
  await hear();
  await controls.skipToEnd();
  await expect(controls.title()).not.toHaveText(heard[1]);
  await hear();

  expect(new Set(heard).size).toBe(3);
  expect(await longestGap(page)).toBe(noGap);
});
