import style from './LauncherIntegration.scss';
import { useTranslation } from '../../client/i18n';

interface LauncherIntegrationProps {
  available: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Adds the AppImage to the application menu of the desktop and removes it again, an AppImage has no install step of its own */
const LauncherIntegration = ({ available, enabled, setEnabled }: LauncherIntegrationProps) => {
  const { t } = useTranslation();

  if (!available) return null;

  return (
    <section className={style.launcherIntegration}>
      <div className={style.sectionTitle}>{t('launcher.title')}</div>
      <div className={style.toggle} onClick={() => setEnabled(!enabled)}>
        {enabled ? t('launcher.remove') : t('launcher.add')}
      </div>
    </section>
  );
};

export default LauncherIntegration;
