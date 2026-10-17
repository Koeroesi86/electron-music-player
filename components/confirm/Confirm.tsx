import type { MouseEventHandler } from 'react'
import classNames from 'classnames'
import style from './Confirm.scss'

interface ConfirmProps {
  message?: string | null
  confirmLabel?: string
  cancelLabel?: string
  confirm?: MouseEventHandler<HTMLButtonElement>
  cancel: MouseEventHandler<HTMLButtonElement>
}

function Confirm ({ message, confirm = () => {}, cancel, confirmLabel = 'Yes', cancelLabel = 'No' }: ConfirmProps) {
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

export default Confirm
