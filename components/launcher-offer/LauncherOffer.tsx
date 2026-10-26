import { useTranslation } from '../../client/i18n';
import Confirm from '../confirm';

interface LauncherOfferProps {
  available: boolean;
  enabled: boolean;
  offered: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Asks once, on the first run from an AppImage, whether to add the app to the application menu; either answer is remembered */
const LauncherOffer = ({ available, enabled, offered, setEnabled }: LauncherOfferProps) => {
  const { t } = useTranslation();

  return (
    <Confirm
      message={available && !enabled && !offered ? t('launcher.offer') : null}
      confirmLabel={t('launcher.offerAdd')}
      cancelLabel={t('launcher.offerLater')}
      confirm={() => setEnabled(true)}
      cancel={() => setEnabled(false)}
    />
  );
};

export default LauncherOffer;
