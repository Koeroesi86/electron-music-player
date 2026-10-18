import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Navigation from './Navigation'

describe('Navigation', () => {
  afterEach(cleanup)

  it.each([
    ['Now playing', 'now-playing'],
    ['Local collection', 'local'],
    ['Online', 'online-sources'],
    ['Equalizer', 'equalizer'],
    ['Settings', 'settings']
  ])('selects the %s tab on click', (label, tab) => {
    const setTab = vi.fn()
    render(<Navigation setTab={setTab} />)

    fireEvent.click(screen.getByText(label))

    expect(setTab).toHaveBeenCalledWith(tab)
  })

  it('marks only the current tab as active', () => {
    render(<Navigation tab="equalizer" />)

    const active = Array.from(document.querySelectorAll('.active')).map(item => item.textContent)
    expect(active).toEqual(['Equalizer'])
  })

  it('defaults to the local collection', () => {
    render(<Navigation />)

    expect(document.querySelector('.active')?.textContent).toBe('Local collection')
  })
})
