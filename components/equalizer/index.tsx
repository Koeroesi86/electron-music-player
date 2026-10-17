import { Audio } from '../../client/audio/context'
import Equalizer from './Equalizer'

const ContextualEqualizer = () => (
  <Audio.Consumer>
    {({ connectToSource, createBiquadFilter, createGain, connectDestination, onAudioMounted }) =>
      <Equalizer
        connectToSource={connectToSource}
        createBiquadFilter={createBiquadFilter}
        createGain={createGain}
        connectDestination={connectDestination}
        onAudioMounted={onAudioMounted}
      />
    }
  </Audio.Consumer>
)

export default ContextualEqualizer
