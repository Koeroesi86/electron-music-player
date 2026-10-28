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
  /** False when the sidebar picks the view: the header then names the current one */
  tabs?: boolean;
}

const ViewSwitcher = <V extends string>({ views, current, setView, controls, tabs = true }: ViewSwitcherProps<V>) => (
  <div className={style.viewSwitcher}>
    <div className={style.viewControls}>
      {tabs ? (
        views.map(({ view, label }) => (
          <div key={view} className={classNames(style.view, { [style.current]: view === current })} onClick={() => setView(view)}>
            {label}
          </div>
        ))
      ) : (
        <div className={style.title}>{views.find(({ view }) => view === current)?.label}</div>
      )}
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
