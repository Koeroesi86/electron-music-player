import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LoadingSplash from './LoadingSplash';

// the main process fills these elements by id while it checks for updates (see splashPreload.ts), the ids are the contract
describe('LoadingSplash', () => {
  const html = renderToStaticMarkup(<LoadingSplash locals={{ title: 'eMusic' }} />);
  const page = new DOMParser().parseFromString(html, 'text/html');

  it('shows the title while loading', () => {
    expect(page.title).toBe('eMusic');
    expect(page.getElementById('status')?.textContent).toBe('eMusic is loading...');
  });

  it('has a progress bar for the download that stays hidden until there is progress', () => {
    expect(page.getElementById('progress-track')?.hasAttribute('hidden')).toBe(true);
    expect(page.getElementById('progress-bar')?.style.width).toBe('0%');
  });
});
