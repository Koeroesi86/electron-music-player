import { ipcRenderer } from 'electron'
import _ from 'lodash'

function addListeners (eventNames, store) {
  eventNames.forEach(eventName => {
    ipcRenderer.on(eventName, (event, payload) => {
      store.dispatch({
        type: eventName,
        payload
      })
    })
  })
}

const eventNames = [
  'STORE_FOLDERS',
  'STORE_LIBRARY',
  'FOLDERS_ADDED_TO_LIBRARY',
  'TRACKS_ADDED_TO_LIBRARY',
  'LIBRARY_SIZE',
  'MAXIMIZED_APP',
  'CLICKED_URL',
  'SCANNING_FILE',
  'SCANNING_FOLDER'
]

function rescanLibrary (forced = false) {
  ipcRenderer.send('RESCAN_LIBRARY', { forced })
}

const appLoaded = _.debounce(() => {
  ipcRenderer.send('APP_LOADED', {})
}, 1000)

const middleware = store => {
  if (window) {
    addListeners(eventNames, store)
    ipcRenderer.send('APP_READY', 'Ready to receive')

    setInterval(() => {
      rescanLibrary(false)
    }, 1000 * 60 * 60)

    // rescanLibrary(false)
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
          path: file.path,
          lastModified: file.lastModified
        })
      })

      ipcRenderer.send('ADD_FOLDERS_TO_LIBRARY', files)
    }

    if (action.type === 'RESCAN_LIBRARY') {
      rescanLibrary(true)
    }

    if (action.type === 'STORE_LIBRARY') {
      appLoaded()
    }

    if (action.type === 'CLOSE_APP') {
      ipcRenderer.send('CLOSE_APP', {})
    }

    if (action.type === 'MINIMIZE_APP') {
      ipcRenderer.send('MINIMIZE_APP', {})
    }

    if (action.type === 'MAXIMIZE_APP') {
      ipcRenderer.send('MAXIMIZE_APP', {})
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
      const notification = {
        title: track.title,
        body: `${track.artist}\n${track.album}`,
        requireInteraction: true,
        sticky: true
      }
      if (track.picture) {
        notification.icon = `http://localhost:${store.getState().uiState.port}/local?path=${encodeURIComponent(track.picture)}&optimized=true`
        notification.image = `http://localhost:${store.getState().uiState.port}/local?path=${encodeURIComponent(track.picture)}&optimized=true`
      }
      const myNotification = new window.Notification(notification.title, notification)
      myNotification.onclick = () => {
        store.dispatch({ type: 'CLICK_NOTIFICATION', payload: {} })
        ipcRenderer.send('NOTIFICATION_CLICKED', { track: action.payload.track })
      }
    }

    next(action)
  }
}

export default middleware
