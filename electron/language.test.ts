import { beforeEach, describe, expect, it, vi } from 'vitest';

const locale = vi.hoisted(() => ({ current: 'en-US' }));

vi.mock('electron', () => ({ app: { getLocale: () => locale.current } }));

describe('main process language', () => {
  beforeEach(() => {
    locale.current = 'en-US';
    vi.resetModules();
  });

  const load = () => import('./language');

  it('follows the system language of the app without a picked language', async () => {
    locale.current = 'hu';
    const { getMainTranslator } = await load();

    expect(getMainTranslator().language).toBe('hu');
  });

  it('shows English for a system language without a translation', async () => {
    locale.current = 'de-DE';
    const { getMainTranslator } = await load();

    expect(getMainTranslator().language).toBe('en');
    expect(getMainTranslator().t('player.play')).toBe('Play');
  });

  it('prefers the language of the saved settings, and returns to the system one when it is gone', async () => {
    locale.current = 'en-US';
    const { getMainTranslator, setPickedLanguage } = await load();

    setPickedLanguage({ language: 'hu' });
    expect(getMainTranslator().t('player.play')).toBe('Lejátszás');

    setPickedLanguage({ volume: 1 });
    expect(getMainTranslator().t('player.play')).toBe('Play');
  });

  it('tells the listeners only when the picked language changed', async () => {
    const { onLanguageChange, setPickedLanguage } = await load();
    const listener = vi.fn();
    onLanguageChange(listener);

    setPickedLanguage({ language: 'hu' });
    setPickedLanguage({ language: 'hu', volume: 1 });
    setPickedLanguage(undefined);

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
