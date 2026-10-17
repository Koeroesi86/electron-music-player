import { electronAPI } from '../../electron-api'
import _ from 'lodash'

function addListeners (eventNames, store) {
  eventNames.forEach(eventName => {
    electronAPI.on(eventName, payload => {
      store.dispatch({
        type: eventName,
        payload
      })
    })
  })
}

const eventNames = [
  'STORE_FOLDERS',
  'RESCAN_COMPLETE',
  'FOLDERS_ADDED_TO_LIBRARY',
  'TRACKS_ADDED_TO_LIBRARY',
  'LIBRARY_SIZE',
  'MAXIMIZED_APP',
  'CLICKED_URL',
  'SET_PLAYING',
  'RESTORE_SETTINGS',
  'SCANNING_FILE',
  'SCANNING_FOLDER'
]

function rescanLibrary (forced = false) {
  electronAPI.send('RESCAN_LIBRARY', { forced })
}

const appLoaded = _.debounce(() => {
  electronAPI.send('APP_LOADED', {})
}, 500)

const getLibrary = (store) => {
  const { port } = store.getState().uiState
  return Promise.resolve()
    .then(() => fetch(`http://localhost:${port}/library`))
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch library: ${response.status}`)
      }
      return response.json()
    })
}

const saveSettings = (uiState) => {
  const {
    view,
    onlineView,
    tab,
    nowPlaying,
    played,
    currentSong,
    currentTime,
    volume,
    selectedAlbum,
    maximized,
    shuffle,
    repeat,
    equalizer
  } = uiState

  electronAPI.send('SAVE_SETTINGS', {
    view,
    onlineView,
    tab,
    nowPlaying,
    played,
    currentSong,
    currentTime,
    volume,
    selectedAlbum,
    maximized,
    shuffle,
    repeat,
    equalizer
  })
}

const middleware = store => {
  if (window) {
    addListeners(eventNames, store)
    electronAPI.send('APP_READY', 'Ready to receive')

    setInterval(() => {
      if (store.getState().uiState.scanningFolder.totalCount === 0) {
        rescanLibrary(false)
      }
    }, 1000 * 60 * 60)

    // rescanLibrary(false)

    getLibrary(store).then(library => {
      appLoaded()
      store.dispatch({ type: 'STORE_LIBRARY', payload: { library, finished: true } })
    })
  }

  return next => action => {
    // if (!['SET_CURRENT_TIME', 'SCANNING_FOLDER', 'SCANNING_FILE'].includes(action.type)) {
    //   console.log(action.type, action.payload)
    // }

    if (action.type === 'FILES_ADDED') {
      /** @var {FileList} fileList */
      const { fileList } = action.payload

      const files = []
      Array.prototype.forEach.call(fileList, file => {
        files.push({
          name: file.name,
          path: electronAPI.getPathForFile(file),
          lastModified: file.lastModified
        })
      })

      electronAPI.send('ADD_FOLDERS_TO_LIBRARY', files)
    }

    if (action.type === 'RESCAN_LIBRARY') {
      rescanLibrary(true)
    }

    if (action.type === 'RESCAN_COMPLETE') {
      getLibrary(store).then(library => {
        store.dispatch({ type: 'STORE_LIBRARY', payload: { library, finished: true } })
      })
    }

    // if (action.type === 'STORE_LIBRARY') {
    //   appLoaded()
    // }

    if (action.type === 'CLOSE_APP') {
      store.dispatch({ type: 'SAVE_SETTINGS', payload: {} })
      electronAPI.send('CLOSE_APP', {})
    }

    if (action.type === 'MINIMIZE_APP') {
      electronAPI.send('MINIMIZE_APP', {})
    }

    if (action.type === 'MAXIMIZE_APP') {
      electronAPI.send('MAXIMIZE_APP', {})
    }

    if (action.type === 'CLICKED_URL') {
      const tracks = action.payload.playlist.map(item => ({
        path: item.file,
        title: item.title,
        duration: 0
      }))
      store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks } })
    }

    if (action.type === 'PLAY_TRACK') {
      const { track } = action.payload
      if (track) {
        const notification = {
          title: track.title,
          body: `${track.artist}\n${track.album}`,
          silent: false,
          sound: false
        }
        if (track.picture) {
          const { port } = store.getState().uiState
          const cover = `${track.picture.split(/[\\/]/).pop().replace(/\.[^.]*$/, '')}-optimized.png`
          const url = `http://localhost:${port}/albumart/${cover}`
          notification.icon = url
          notification.image = url
        }
        const myNotification = new window.Notification(notification.title, notification)
        myNotification.onclick = () => {
          store.dispatch({ type: 'CLICK_NOTIFICATION', payload: {} })
          electronAPI.send('NOTIFICATION_CLICKED', { track: action.payload.track })
        }
      }
    }

    if (action.type === 'SAVE_SETTINGS') {
      saveSettings(store.getState().uiState)
    }

    next(action)
  }
}

export default middleware
