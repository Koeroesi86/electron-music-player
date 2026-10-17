import React from 'react'
import PropTypes from 'prop-types'
import style from './TitleBar.scss'
import { FiMaximize as MaximizeIcon, FiMinimize2 as MinimizeIcon, FiX as CloseIcon } from 'react-icons/fi'

function TitleBarButton ({ onClick, children }) {
  return (
    <span className={style.button} onClick={onClick}>
      {children}
    </span>
  )
}

TitleBarButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func
}

function TitleBar ({
  close = () => {},
  minimize = () => {},
  maximize = () => {},
  iconSize = '16px',
  title = 'eMusic'
}) {
  return (
    <div className={style.titleBar}>
      <div className={style.buttons}>
        <TitleBarButton onClick={close}>
          <CloseIcon size={iconSize} />
        </TitleBarButton>
        <TitleBarButton onClick={minimize}>
          <MinimizeIcon size={iconSize} />
        </TitleBarButton>
        <TitleBarButton onClick={maximize}>
          <MaximizeIcon size={iconSize} />
        </TitleBarButton>
      </div>
      <div className={style.title}>{title}</div>
    </div>
  )
}

TitleBar.propTypes = {
  iconSize: PropTypes.string,
  title: PropTypes.string,
  maximize: PropTypes.func,
  minimize: PropTypes.func,
  close: PropTypes.func
}

export default TitleBar
