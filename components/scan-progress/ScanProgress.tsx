import classNames from 'classnames';
import style from './ScanProgress.scss';
import { electronAPI } from '../../client/electron-api';
import { useTranslation } from '../../client/i18n';

interface ScanProgressProps {
  current: number;
  total: number;
  scanningFolder: string | null;
}

const ScanProgress = ({ current, total, scanningFolder }: ScanProgressProps) => {
  const { t, formatNumber } = useTranslation();

  return (
    <div className={classNames(style.scanProgress, { [style.scanning]: !!scanningFolder })}>
      <div className={style.container}>
        <span className={style.pre}>{t('scan.progress', { current: formatNumber(current), total: formatNumber(total) })}</span>
        <span
          onClick={() => scanningFolder && electronAPI.send('OPEN_LIBRARY_PATH', scanningFolder)}
          title={t('scan.open', { folder: scanningFolder ?? '' })}
          className={style.link}
        >
          {scanningFolder}
        </span>
        <div className={style.progressBar}>
          <div className={style.current} style={{ width: total === 0 ? undefined : `${Math.floor((current / total) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

export default ScanProgress;
