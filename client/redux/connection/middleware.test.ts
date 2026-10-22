import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMiddleware, createStore } from 'redux';

const setup = async () => {
  const send = vi.fn();
  const on = vi.fn();
  vi.resetModules();
  vi.stubGlobal('fetch', () => Promise.reject(new Error('no server')));
  window.electronAPI = { send, on, getPathForFile: () => '' };

  const { default: reducers } = await import('../reducers');
  const { default: middleware } = await import('./middleware');
  const store = createStore(reducers, applyMiddleware(middleware));

  const listen = (channel: string, payload: unknown) => on.mock.calls.find(([name]) => name === channel)?.[1](payload);

  return { store, send, listen };
};

describe('connection middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('asks the main process for the state when it starts', async () => {
    const { send } = await setup();

    expect(send).toHaveBeenCalledWith('APP_READY', 'Ready to receive');
  });

  it('stores the launcher state the main process reports', async () => {
    const { store, listen } = await setup();

    listen('LAUNCHER_STATE', { available: true, enabled: true });

    expect(store.getState().uiState.launcher).toEqual({ available: true, enabled: true });
  });

  it('sends the request to add or remove the launcher to the main process', async () => {
    const { store, send } = await setup();

    store.dispatch({ type: 'SET_LAUNCHER', payload: { enabled: true } });

    expect(send).toHaveBeenCalledWith('SET_LAUNCHER', { enabled: true });
  });
});
