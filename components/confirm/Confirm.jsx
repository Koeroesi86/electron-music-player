import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import style from './Confirm.scss'

function Confirm ({ message, confirm = () => {}, cancel, confirmLabel = 'Yes', cancelLabel = 'No' }) {
  return (
    <div className={classNames(style.confirm, {
      [style.show]: message
    })}>
      <div className={style.message}>{message}</div>
      <div className={style.buttons}>
        <button onClick={confirm} className={style.button}>{confirmLabel}</button>
        <button onClick={cancel} className={style.button}>{cancelLabel}</button>
      </div>
    </div>
  )
}

Confirm.propTypes = {
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  confirm: PropTypes.func,
  cancel: PropTypes.func.isRequired
}

export default Confirm
