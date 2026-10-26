import style from './WindowBlur.scss';

interface WindowBlurProps {
  available: boolean;
  enabled: boolean;
  toggle: () => void;
}

/** Lets the panels be translucent where the desktop blurs the window (Blur my Shell on GNOME), the app cannot detect that itself */
const WindowBlur = ({ available, enabled, toggle }: WindowBlurProps) => {
  if (!available) return null;

  return (
    <section className={style.windowBlur}>
      <div className={style.sectionTitle}>Window blur</div>
      <div className={style.toggle} onClick={toggle}>
        {enabled ? 'Use opaque panels' : 'Use translucent panels'}
      </div>
      <div className={style.hint}>Needs a blur from the desktop, for example the Blur my Shell extension on GNOME.</div>
    </section>
  );
};

export default WindowBlur;
