import { applyMiddleware, compose, createStore } from 'redux';
import connectionMiddleware from './connection/middleware';
import uiStateMiddleware from './uiState/middleware';
import reducers from './reducers';

const middlewares = [connectionMiddleware, uiStateMiddleware];

const middlewareEnhancers = applyMiddleware(...middlewares);
const enhancers = compose(middlewareEnhancers);

export const store = createStore(reducers, enhancers);
