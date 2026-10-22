import { describe, expect, it, vi } from 'vitest';
import { applyMiddleware, createStore } from 'redux';
import { actionMiddleware, onAction } from './on-action';
import type { AppAction } from './types';

const createTestStore = (handlers: ReturnType<typeof onAction>[]) => {
  const seen: AppAction[] = [];
  const store = createStore(
    (state: object = {}, action) => {
      seen.push(action as AppAction);
      return state;
    },
    applyMiddleware(actionMiddleware(() => handlers))
  );
  return { store, seen };
};

describe('actionMiddleware', () => {
  it('runs only the handlers of the action type, with the typed action', () => {
    const volume = vi.fn();
    const tab = vi.fn();
    const { store } = createTestStore([onAction('SET_VOLUME', volume), onAction('SET_TAB', tab)]);

    store.dispatch({ type: 'SET_VOLUME', payload: { volume: 0.2 } });

    expect(volume).toHaveBeenCalledWith({ type: 'SET_VOLUME', payload: { volume: 0.2 } });
    expect(tab).not.toHaveBeenCalled();
  });

  it('passes the action on after its handlers ran', () => {
    const order: string[] = [];
    const { store, seen } = createTestStore([onAction('TOGGLE_REPEAT', () => order.push(`handled after ${seen.length} actions`))]);

    store.dispatch({ type: 'TOGGLE_REPEAT' });

    expect(order).toEqual([`handled after ${seen.length - 1} actions`]);
  });
});
