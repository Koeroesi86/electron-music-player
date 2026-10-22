import type { OnlineView } from '../../client/redux/types';
import OnlineSourcePanel from '../online-source-panel';
import RadioStations from '../radio-stations';
import ViewSwitcher from '../view-switcher/ViewSwitcher';
import type { ViewItem } from '../view-switcher/ViewSwitcher';

interface OnlineSourcesProps {
  view: OnlineView;
  setView: (view: OnlineView) => void;
}

const views: ViewItem<OnlineView>[] = [
  { view: 'radio', label: 'Radio', panel: <RadioStations /> },
  { view: 'spotify', label: 'Spotify', panel: <OnlineSourcePanel src={'https://open.spotify.com/browse'} /> },
];

const OnlineSources = ({ view, setView }: OnlineSourcesProps) => <ViewSwitcher views={views} current={view} setView={setView} />;

export default OnlineSources;
