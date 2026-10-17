import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import PlayerHome from '../components/player-home'
import { store } from './redux/store'
import { Audio } from './audio/context'

if (typeof document !== 'undefined') {
  store.dispatch({ type: 'APP_INIT' })

  createRoot(document.getElementById('root')).render(
    <Provider store={store} audio={Audio}>
      <PlayerHome />
    </Provider>
  )
}
