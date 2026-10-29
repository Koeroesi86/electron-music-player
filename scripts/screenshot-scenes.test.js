import { describe, expect, it } from 'vitest'
import { scenes, setup } from './screenshot-scenes'

const kinds = ['click', 'wait', 'waitFor', 'run']
const steps = [...setup, ...scenes.flatMap(scene => scene.steps)]

describe('scenes', () => {
  it('have a name each, which is the name of the picture', () => {
    expect(new Set(scenes.map(scene => scene.name)).size).toBe(scenes.length)
    expect(scenes.map(scene => scene.name)).toEqual(['songs', 'now', 'album', 'radio', 'albums', 'genre', 'folders', 'liked', 'playlist', 'equalizer', 'home', 'settings', 'light'])
  })

  it.each(steps.map(step => [JSON.stringify(step, (key, value) => (typeof value === 'function' ? String(value) : value)).slice(0, 60), step]))('use a step the runner knows: %s', (name, step) => {
    expect(kinds.filter(kind => kind in step)).toHaveLength(1)
  })

  it('hold the clock of the player where the picture shows it', () => {
    const held = steps.filter(step => 'run' in step).map(step => step.run.match(/currentTime( = |\s*>=\s*)(\d+)/)?.[2]).filter(Boolean)

    expect(held).toEqual(['16', '22', '97', '12'])
  })
})
