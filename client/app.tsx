import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import PlayerHome from '../components/player-home'
import { store } from './redux/store'

if (typeof document !== 'undefined') {
  store.dispatch({ type: 'APP_INIT' })

  createRoot(document.getElementById('root') as HTMLElement).render(
    <Provider store={store}>
      <PlayerHome />
    </Provider>
  )
}
