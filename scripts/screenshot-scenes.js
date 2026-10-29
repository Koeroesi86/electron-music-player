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
      // two more albums played, so the history of Home has more than one row
      ...playAlbum(albums[1]),
      ...playAlbum(albums[3]),
      { click: 'Radio stations' },
      { wait: 'Night Owl FM' },
      { click: 'Night Owl FM', from: name => name.parentElement.parentElement.firstElementChild },
      { waitFor: `document.querySelector('audio')?.src.includes('/radio/')` },
      { run: holdWhenRun(12) },
      { wait: clock(12) }
    ]
  }
]

// the folder of the library is in a folder of the run that has a random name, which a picture would show: it reads as a folder of a home
const hidePaths = `(() => {
  const texts = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = texts.nextNode(); node; node = texts.nextNode()) node.textContent = node.textContent.replace(/\\S*emusic-screenshots-\\w+[\\\\/]?/, '/home/mia/')
})()`

// the version and the update line of a development run are not what the picture is about
const hideAbout = `document.querySelector('[class*="About__about"]').style.display = 'none'`

// a value written into a script of the page: JSON, with what could end the script or its line escaped
const literal = value => JSON.stringify(value).replace(/[<>\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)

// types a name into a field of the app and submits it, as a person does
const typeInto = (label, text) =>
  `(() => { const input = document.querySelector('[aria-label=${literal(label)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${literal(text)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.form.requestSubmit() })()`

// a playlist of the albums, built through the dialog of each: the dialog is the last of the page, so is its menu
const playlist = (name, listed) => [
  { click: 'New playlist' },
  { run: typeInto('Playlist name', name) },
  { wait: name },
  ...listed.flatMap(({ title, tracks }) => [
    { click: 'Albums' },
    { wait: title },
    { click: title },
    { wait: tracks.at(-1) },
    { click: 'Add to a playlist', nth: -1 },
    { click: name, nth: -1 },
    { click: 'Close', nth: -1 }
  ])
]

// the heart in the row or tile that says the text: the nearest parent with a heart of its own
const like = text => ({
  run: `(() => {
    const heart = '[aria-label="Add to favourites"]'
    let element = [...document.body.querySelectorAll('*')].find(candidate => !candidate.children.length && candidate.textContent.trim() === ${literal(text)})
    while (element && element.querySelectorAll(heart).length !== 1) element = element.parentElement
    element.querySelector(heart).click()
  })()`
})

scenes.push(
  { name: 'albums', steps: [{ click: 'Albums' }, { wait: albums[4].title }] },
  { name: 'genre', steps: [{ click: 'Genres' }, { wait: 'Indie' }, { click: 'Indie' }, { wait: 'Play all' }] },
  { name: 'folders', steps: [{ click: 'Folders' }, { wait: 'Drop music folders here' }, { run: hidePaths }] },
  {
    name: 'liked',
    steps: [
      { click: 'Albums' },
      { wait: albums[0].title },
      like(albums[0].title),
      like(albums[2].title),
      like(albums[4].title),
      { click: 'Songs' },
      { wait: '20 tracks' },
      like(albums[1].tracks[0]),
      like(albums[3].tracks[2]),
      { click: 'Radio stations' },
      { wait: 'Night Owl FM' },
      like('Night Owl FM'),
      like('Juniper Classical'),
      like('Harbour Jazz'),
      { click: 'Liked' },
      { wait: 'Night Owl FM' }
    ]
  },
  { name: 'playlist', steps: [...playlist('Late night', [albums[0], albums[4]]), { click: 'Late night' }, { wait: 'Aurora Drift' }] },
  { name: 'equalizer', steps: [{ click: 'Equalizer' }, { wait: 'Drag a dot' }, { click: 'Bass boost' }] },
  { name: 'home', steps: [{ click: 'Home' }, { wait: 'RECENTLY PLAYED' }] },
  { name: 'settings', steps: [{ click: 'Settings' }, { wait: 'Accent colour' }, { run: hideAbout }, { run: hidePaths }] },
  { name: 'light', steps: [{ click: 'Light' }, { click: 'Albums' }, { wait: albums[4].title }] }
)

module.exports = { scenes, setup }
