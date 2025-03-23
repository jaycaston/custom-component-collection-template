# Retool Audio Trimmer Component

This is a custom Retool component that provides audio trimming functionality for Retool applications.

## Features

- Audio waveform visualization
- Trim audio by selecting start and end points
- Preview playback of the trimmed audio
- Save the trimmed selection

## Installation and Deployment

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the component:
   ```
   npm run build
   ```
4. Log in to Retool:
   ```
   npx retool-ccl login
   ```
   (You'll need to generate an API token with custom component permissions in Retool)

5. Initialize the component library:
   ```
   npx retool-ccl init
   ```
   (Follow the prompts to name and describe your component library)

6. Start development mode:
   ```
   npx retool-ccl dev
   ```

7. When ready to deploy:
   ```
   npx retool-ccl deploy
   ```

## Usage in Retool

After deploying the component, you can use it in your Retool apps:

1. Drag the "AudioTrimmer" component onto your Retool app canvas
2. Set the `audioUrl` property to the URL of the audio file you want to trim
3. Configure the min/max length and other properties as needed
4. Use the event handlers to capture trim actions

## Properties

- `audioUrl`: URL of the audio file to trim
- `minLength`: Minimum allowed clip length in seconds (default: 15)
- `maxLength`: Maximum allowed clip length in seconds (default: 60)
- `showInstructions`: Whether to show usage instructions (default: true)
- `primaryColor`: Primary color for the component (default: #40B193)

## Events

- `onTrimSaved`: Triggered when the user saves a trim selection
- `onAudioLoaded`: Triggered when the audio file is successfully loaded
- `onError`: Triggered when an error occurs

## Dependencies

- WaveSurfer.js: For audio visualization
- Lucide React: For UI icons
- React: For component framework
