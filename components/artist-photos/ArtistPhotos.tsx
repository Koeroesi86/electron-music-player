import style from './ArtistPhotos.scss';
import { useTranslation } from '../../client/i18n';

interface ArtistPhotosProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Tells where the photos of the artists come from and what that sends, and turns the lookup on and off */
const ArtistPhotos = ({ enabled, setEnabled }: ArtistPhotosProps) => {
  const { t } = useTranslation();

  return (
    <section className={style.artistPhotos}>
      <div className={style.sectionTitle}>{t('artistPhotos.title')}</div>
      <div className={style.description}>{enabled ? t('artistPhotos.on') : t('artistPhotos.off')}</div>
      <div className={style.toggle} onClick={() => setEnabled(!enabled)}>
        {enabled ? t('artistPhotos.disable') : t('artistPhotos.enable')}
      </div>
    </section>
  );
};

export default ArtistPhotos;
