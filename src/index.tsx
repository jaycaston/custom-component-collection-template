import React from 'react'
import { type FC } from 'react'
import { Retool } from '@tryretool/custom-component-support'
import AudioTrimmerComponent from './components/retool-component'
import './retool-component.css'

// Export the component for Retool
export { AudioTrimmerComponent }

// Re-export the default component for easier importing
export const AudioTrimmer: FC = () => {
  // Use Retool's state management
  const [audioUrl, setAudioUrl] = Retool.useStateString({
    name: 'audioUrl',
    description: 'URL of the audio file to trim'
  })
  
  const [minLength, setMinLength] = Retool.useStateNumber({
    name: 'minLength',
    description: 'Minimum allowed clip length in seconds',
    initialValue: 15
  })
  
  const [maxLength, setMaxLength] = Retool.useStateNumber({
    name: 'maxLength',
    description: 'Maximum allowed clip length in seconds',
    initialValue: 60
  })
  
  const [showInstructions, setShowInstructions] = Retool.useStateBoolean({
    name: 'showInstructions',
    description: 'Whether to show usage instructions',
    initialValue: true
  })
  
  const [primaryColor, setPrimaryColor] = Retool.useStateString({
    name: 'primaryColor',
    description: 'Primary color for the component (hex or CSS color)',
    initialValue: '#40B193'
  })
  
  const onTrimSaved = Retool.useEventCallback({ name: 'onTrimSaved' })
  const onAudioLoaded = Retool.useEventCallback({ name: 'onAudioLoaded' })
  const onError = Retool.useEventCallback({ name: 'onError' })

  Retool.useComponentSettings({
    defaultHeight: 50,
    defaultWidth: 12,
  })

  return (
    <AudioTrimmerComponent 
      audioUrl={audioUrl} 
      minLength={minLength}
      maxLength={maxLength}
      showInstructions={showInstructions}
      primaryColor={primaryColor}
      // Setting up event triggers
      onTrimSaved={onTrimSaved}
      onAudioLoaded={onAudioLoaded}
      onError={onError}
    />
  )
}
