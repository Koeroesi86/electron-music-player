import type { ReactNode } from 'react';
import classNames from 'classnames';
import style from './ViewSwitcher.scss';

export interface ViewItem<V extends string> {
  view: V;
  label: string;
  panel: ReactNode;
}

interface ViewSwitcherProps<V extends string> {
  views: ViewItem<V>[];
  current: V;
  setView: (view: V) => void;
  controls?: ReactNode;
}

const ViewSwitcher = <V extends string>({ views, current, setView, controls }: ViewSwitcherProps<V>) => (
  <div className={style.viewSwitcher}>
    <div className={style.viewControls}>
      {views.map(({ view, label }) => (
        <div key={view} className={classNames(style.view, { [style.current]: view === current })} onClick={() => setView(view)}>
          {label}
        </div>
      ))}
      {controls}
    </div>
    <div className={style.viewPanels}>
      {views.map(({ view, panel }) => (
        <div key={view} className={classNames(style.viewPanel, { [style.active]: view === current })}>
          {panel}
        </div>
      ))}
    </div>
  </div>
);

export default ViewSwitcher;
