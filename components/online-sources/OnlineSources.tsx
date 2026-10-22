import type { OnlineView } from '../../client/redux/types';
import OnlineSourcePanel from '../online-source-panel';
import ViewSwitcher from '../view-switcher/ViewSwitcher';
import type { ViewItem } from '../view-switcher/ViewSwitcher';

interface OnlineSourcesProps {
  view: OnlineView;
  setView: (view: OnlineView) => void;
}

const views: ViewItem<OnlineView>[] = [
  { view: 'shoutcast', label: 'Shoutcast', panel: <OnlineSourcePanel src={'http://www.shoutcast.com/scradioinwinamp/'} /> },
  { view: 'spotify', label: 'Spotify', panel: <OnlineSourcePanel src={'https://open.spotify.com/browse'} /> },
];

const OnlineSources = ({ view, setView }: OnlineSourcesProps) => <ViewSwitcher views={views} current={view} setView={setView} />;

export default OnlineSources;
