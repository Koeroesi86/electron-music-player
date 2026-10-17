import React from 'react'
import { connect } from 'react-redux'
import { Audio } from '../../client/audio/context'
import Equalizer from './Equalizer'

const mapState = state => ({
  // gains: state.uiState.equalizer
})

const mapDispatch = dispatch => ({
  changeGain: (value, index) => dispatch({ type: 'SET_GAIN', payload: { value, index } })
})

const ContextualEqualizer = props => (
  <Audio.Consumer>
    {({ connectToSource, createBiquadFilter, createGain, connectDestination, onAudioMounted }) =>
      <Equalizer
        {...props}
        connectToSource={connectToSource}
        createBiquadFilter={createBiquadFilter}
        createGain={createGain}
        connectDestination={connectDestination}
        onAudioMounted={onAudioMounted}
      />
    }
  </Audio.Consumer>
)

export default window ? connect(mapState, mapDispatch)(ContextualEqualizer) : Equalizer
