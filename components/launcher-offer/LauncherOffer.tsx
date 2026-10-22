import Confirm from '../confirm';

interface LauncherOfferProps {
  available: boolean;
  enabled: boolean;
  offered: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Asks once, on the first run from an AppImage, whether to add the app to the application menu; either answer is remembered */
const LauncherOffer = ({ available, enabled, offered, setEnabled }: LauncherOfferProps) => (
  <Confirm
    message={available && !enabled && !offered ? 'Add eMusic to the application menu? You can change this later in the settings.' : null}
    confirmLabel="Add"
    cancelLabel="Not now"
    confirm={() => setEnabled(true)}
    cancel={() => setEnabled(false)}
  />
);

export default LauncherOffer;
