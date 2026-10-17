const { app, ipcMain, session } = require('electron')
const fs = require('fs')
const { resolve } = require('path')
const playlistParser = require('playlist-parser')
const executeQuery = require('./executeQuery')
const executeQueries = require('./executeQueries')
const scanFolders = require('./scanFolders')
const rescanLibrary = require('./rescanLibrary')

function memorySizeOf (obj) {
  let bytes = 0

  function sizeOf (obj) {
    if (obj !== null && obj !== undefined) {
      switch (typeof obj) {
        case 'number':
          bytes += 8
          break
        case 'string':
          bytes += obj.length * 2
          break
        case 'boolean':
          bytes += 4
          break
        case 'object':
          const objClass = Object.prototype.toString.call(obj).slice(8, -1)
          if (objClass === 'Object' || objClass === 'Array') {
            for (let key in obj) {
              if (!obj || !obj.hasOwnProperty(key)) continue
              sizeOf(obj[key])
            }
          } else bytes += obj.toString().length * 2
          break
      }
    }
    return bytes
  }

  function formatByteSize (bytes) {
    if (bytes < 1024) return bytes + ' bytes'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + ' KiB'
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + ' MiB'
    else return (bytes / 1073741824).toFixed(3) + ' GiB'
  }

  return formatByteSize(sizeOf(obj))
}

const isWin = process.platform === 'win32'
const enableTransparency = true

function setupListeners (database, windows) {
  // loading.openDevTools()

  ipcMain.once('APP_LOADED', () => {
    setTimeout(() => {
      windows.main.show()
      if (enableTransparency) {
        if (isWin) windows.main.setBackgroundMaterial('acrylic')
        else windows.main.setVibrancy('dark')
      }
      windows.loading.close()
      windows.loading = null

      // windows.main.webContents.openDevTools()

      if (isWin) {
        windows.main.setThumbarButtons([
          {
            tooltip: 'Play',
            icon: resolve(__dirname, '../assets/icons_play.png'),
            click () {
              console.log('play clicked')
              windows.main.webContents.send('SET_PLAYING', { isPlaying: true })
            }
          },
          {
            tooltip: 'Pause',
            icon: resolve(__dirname, '../assets/icons_pause.png'),
            click () {
              console.log('pause clicked.')
              windows.main.webContents.send('SET_PLAYING', { isPlaying: false })
            }
          }
        ])
      }
    }, 200)
  })

  ipcMain.on('CLOSE_APP', () => {
    windows.main.close()
  })

  ipcMain.on('MINIMIZE_APP', () => {
    windows.main.minimize()
  })

  let isMaximized = false
  ipcMain.on('MAXIMIZE_APP', (event) => {
    // windows.main.isMaximized() is not working
    if (isMaximized) {
      windows.main.unmaximize()
    } else {
      windows.main.maximize()
    }
  })

  windows.main.on('maximize', () => {
    isMaximized = true
    windows.main.webContents.send('MAXIMIZED_APP', { maximized: isMaximized })
  })

  windows.main.on('unmaximize', () => {
    isMaximized = false
    windows.main.webContents.send('MAXIMIZED_APP', { maximized: isMaximized })
  })

  ipcMain.on('APP_READY', (event) => {
    // main.openDevTools()
    Promise.resolve()
      .then(() => executeQuery(database, {
        query: `SELECT * FROM folders ORDER BY path ASC`,
        variables: []
      }))
      .then(folders => {
        event.sender.send('STORE_FOLDERS', { folders })
        return Promise.resolve()
      })
      .then(() => executeQuery(database, {
        query: `SELECT settings FROM settings WHERE id = ?`,
        variables: [1]
      }))
      .then(s => {
        if (s[0]) {
          const { settings } = s[0]
          event.sender.send('RESTORE_SETTINGS', { settings: JSON.parse(settings) })
        }
        return Promise.resolve()
      })
      .catch(e => console.error(e))
  })

  /** @param {Array} files */
  ipcMain.on('ADD_FOLDERS_TO_LIBRARY', (event, files) => {
    const folders = files.filter(file => fs.statSync(file.path).isDirectory())
    const toRemoveQueries = files.map(file => ({
      query: `SELECT * FROM folders WHERE path LIKE ?`,
      variables: [file.path + '%']
    }))
    executeQueries(database, toRemoveQueries)
      .then(results => {
        if (!results.length) return Promise.resolve()
        const removeQueries = results[0].map(result => ({
          query: `DELETE FROM folders WHERE path = ?`,
          variables: [result.path]
        }))

        return executeQueries(database, removeQueries)
      })
      .then(() => {
        const queries = files.map(file => ({
          query: `INSERT OR REPLACE INTO folders (path, lastModified) VALUES (?, ?)`,
          variables: [file.path, file.lastModified]
        }))

        return executeQueries(database, queries)
      })
      .then(() => {
        event.sender.send('FOLDERS_ADDED_TO_LIBRARY', { folders })

        return scanFolders(folders, event.sender)
      })
      .then(() => {
        event.sender.send('TRACKS_ADDED_TO_LIBRARY', {})
      })
      .catch(e => console.error(e))
  })

  ipcMain.on('RESCAN_LIBRARY', (event, { forced }) => {
    rescanLibrary(event.sender, forced)
  })

  session.defaultSession.on('will-download', (event, item, webContents) => {
    event.preventDefault()
    const url = item.getURL()
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download ${url}: ${response.status}`)
        }
        return response.text()
      })
      .then(body => {
        const playlist = playlistParser.PLS.parse(body)
        windows.main.webContents.send('CLICKED_URL', { playlist, url })
      })
      .catch(error => console.error(error))
  })

  ipcMain.on('NOTIFICATION_CLICKED', (event) => {
    windows.main.setAlwaysOnTop(true)
    windows.main.show()
    windows.main.focus()
    windows.main.setAlwaysOnTop(false)
  })

  ipcMain.on('SAVE_SETTINGS', (event, settings) => {
    Promise.resolve()
      .then(() => executeQuery(database, {
        query: `INSERT OR REPLACE INTO settings (id, settings) VALUES (?, ?)`,
        variables: [1, JSON.stringify(settings)]
      }))
      .then(() => {
        event.sender.send('SETTINGS_SAVED', { settings })
      })
      .catch(e => console.error(e))
  })
}

module.exports = setupListeners
