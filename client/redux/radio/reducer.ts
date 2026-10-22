import type { Reducer } from 'redux';
import type { RadioQuery, RadioStation, RadioTag } from '../../../types/radio';
import { isAppAction } from '../types';

export interface RadioState {
  query: RadioQuery;
  stations: RadioStation[];
  tags: RadioTag[];
  loading: boolean;
  error?: string;
}

const initialState: RadioState = { query: {}, stations: [], tags: [], loading: false };

const isSameQuery = (a: RadioQuery, b: RadioQuery) => a.name === b.name && a.tag === b.tag;

const reducer: Reducer<RadioState> = (state = initialState, action) => {
  if (!isAppAction(action)) return state;

  switch (action.type) {
    case 'SEARCH_RADIO':
      return { ...state, query: action.payload.query, loading: true, error: undefined };
    case 'RADIO_STATIONS': {
      // the answer of a search that was replaced in the meantime is dropped
      if (!isSameQuery(state.query, action.payload.query)) return state;
      const { stations, error } = action.payload;
      return { ...state, stations, error, loading: false };
    }
    case 'RADIO_TAGS_LOADED':
      return { ...state, tags: action.payload.tags };
    default:
      return state;
  }
};

export default reducer;
