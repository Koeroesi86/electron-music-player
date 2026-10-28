import appIcon from '../../assets/icon.svg';
import style from './TitleBar.scss';

interface TitleBarProps {
  title?: string;
}

function TitleBar({ title = 'eMusic' }: TitleBarProps) {
  return (
    <div className={style.titleBar}>
      <div className={style.title}>
        <img className={style.icon} src={appIcon} alt="" />
        {title}
      </div>
    </div>
  );
}

export default TitleBar;
