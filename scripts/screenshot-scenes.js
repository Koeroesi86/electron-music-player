// the pictures of site/screenshots, one scene each: node scripts/screenshots.js [name...] takes all of them or the ones named
// a scene is a name and the steps that bring the window to what the picture shows, the picture is taken when they are done; it is saved as <name>.webp
//
// a step is one of
//   { click: 'text' }      clicks the first element (in the order of the page) whose text, aria-label or title is the text; nth: 1 takes the second one and nth: -1 the last one (the window has a Close button of its own before the one of a dialog),
//                          from: element => element.parentElement picks another element to click from the one found (it runs in the page),
//                          until: 'script' clicks again, a second apart, until the script (run in the page) answers a truthy value
//   { wait: 'text' }       waits until the text is on the page
//   { waitFor: 'script' }  waits until a script, run in the page, answers a truthy value
//   { run: 'script' }      runs a script in the page, and waits for the promise it answers
//
// holdAt (a track) and holdWhenRun (a station) are scripts for { run } that stop the clock of the player at a second, so the time on the page is the same in every picture
//
// the library and the stations are the made up ones of scripts/screenshot-fixtures.js, the window is 1360 x 850 in English

const { albums } = require('./screenshot-fixtures')

const audio = `document.querySelector('audio')`

// plays a whole album from its dialog: the dialog has its tracks before the button is pressed, the first track runs before it is closed again
const playAlbum = ({ title, tracks }) => [
  { click: 'Albums' },
  { wait: title },
  { click: title },
  { wait: tracks.at(-1) },
  { click: 'Play album', until: `${audio}?.currentTime > 0.2` },
  { click: 'Close', nth: -1 }
]

// the clock of the page follows the audio element: at a rate of zero it stays where it is while the element keeps playing
const holdAt = seconds => `new Promise(done => { ${audio}.addEventListener('seeked', () => { ${audio}.playbackRate = 0; done() }, { once: true }); ${audio}.playbackRate = 1; ${audio}.currentTime = ${seconds} })`
const holdWhenRun = seconds => `new Promise(done => { const check = () => (${audio}.currentTime >= ${seconds} ? ((${audio}.playbackRate = 0), done()) : setTimeout(check, 50)); check() })`

const clock = seconds => new Date(seconds * 1000).toISOString().slice(11, 19)

// what every scene starts from: an album playing (the library group of the sidebar is open from the start)
const setup = playAlbum(albums[0])

const scenes = [
  {
    name: 'songs',
    steps: [{ click: 'Songs' }, { wait: '20 tracks' }, { run: holdAt(16) }, { wait: clock(16) }]
  },
  {
    name: 'now',
    steps: [{ click: 'Now playing' }, { wait: 'UP NEXT' }, { run: holdAt(22) }, { wait: clock(22) }]
  },
  {
    name: 'album',
    steps: [{ click: 'Albums' }, { wait: albums[4].title }, { click: albums[4].title }, { wait: albums[4].tracks.at(-1) }, { run: holdAt(97) }, { wait: clock(97) }]
  },
  {
    name: 'radio',
    steps: [
      // the dialog of the album before is still open
      { click: 'Close', nth: -1 },
      { click: 'Radio stations' },
      { wait: 'Night Owl FM' },
      { click: 'Night Owl FM', from: name => name.parentElement.firstElementChild },
      { waitFor: `document.querySelector('audio')?.src.includes('/radio/')` },
      { run: holdWhenRun(12) },
      { wait: clock(12) }
    ]
  }
]

module.exports = { scenes, setup }
