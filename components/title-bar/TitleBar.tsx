import appIcon from '../../assets/icon.svg';
import style from './TitleBar.scss';

interface TitleBarProps {
  title?: string;
  /** The window has traffic lights of its own, which need the room above the title */
  nativeControls?: boolean;
}

function TitleBar({ title = 'eMusic', nativeControls = false }: TitleBarProps) {
  return (
    <div className={style.titleBar}>
      {nativeControls && <div className={style.trafficLights} />}
      <div className={style.title}>
        <img className={style.icon} src={appIcon} alt="" />
        {title}
      </div>
    </div>
  );
}

export default TitleBar;
