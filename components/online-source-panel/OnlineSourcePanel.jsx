import React from 'react'
import PropTypes from 'prop-types'
import style from './OnlineSourcePanel.scss'

function OnlineSourcePanel ({ src = 'about:blank' }) {
  return (
    <webview
      className={style.shoutCastPanel}
      src={src}
      disablewebsecurity='false'
      webpreferences={'webSecurity'}
    />
  )
}

OnlineSourcePanel.propTypes = {
  src: PropTypes.string
}

export default OnlineSourcePanel
