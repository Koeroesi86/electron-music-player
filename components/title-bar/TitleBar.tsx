import type { MouseEventHandler, ReactNode } from 'react';
import appIcon from '../../assets/icon.svg';
import style from './TitleBar.scss';
import { FiMaximize as MaximizeIcon, FiMinimize2 as MinimizeIcon, FiX as CloseIcon } from 'react-icons/fi';

function TitleBarButton({ onClick, children }: { onClick?: MouseEventHandler<HTMLSpanElement>; children?: ReactNode }) {
  return (
    <span className={style.button} onClick={onClick}>
      {children}
    </span>
  );
}

interface TitleBarProps {
  iconSize?: string;
  title?: string;
  maximize?: () => void;
  minimize?: () => void;
  close?: () => void;
}

function TitleBar({ close = () => {}, minimize = () => {}, maximize = () => {}, iconSize = '16px', title = 'eMusic' }: TitleBarProps) {
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
      <div className={style.title}>
        <img className={style.icon} src={appIcon} alt="" />
        {title}
      </div>
    </div>
  );
}

export default TitleBar;
