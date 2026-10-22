import style from './LauncherIntegration.scss';

interface LauncherIntegrationProps {
  available: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Adds the AppImage to the application menu of the desktop and removes it again, an AppImage has no install step of its own */
const LauncherIntegration = ({ available, enabled, setEnabled }: LauncherIntegrationProps) => {
  if (!available) return null;

  return (
    <section className={style.launcherIntegration}>
      <div className={style.sectionTitle}>Application menu</div>
      <div className={style.toggle} onClick={() => setEnabled(!enabled)}>
        {enabled ? 'Remove from application menu' : 'Add to application menu'}
      </div>
    </section>
  );
};

export default LauncherIntegration;
