# Setting Up the Audio Trimmer Component for Retool

This document details the steps taken to convert the audio trimmer React component into a Retool custom component.

## Directory Structure

```
audio-trimmer/
├── src/
│   ├── components/
│   │   ├── audio-trimmer.tsx     # Main audio trimming functionality
│   │   ├── retool-component.tsx  # Retool wrapper component
│   │   ├── font-provider.tsx     # Font loading and styling
│   │   └── fonts.ts              # Font definitions
│   ├── ui/
│   │   └── button.tsx            # Button component
│   ├── retool-component.css      # Styling for the component
│   └── index.tsx                 # Main export for Retool
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Usage documentation
```

## Setup Steps

1. **Created the project structure** using Retool's template:
   ```
   git clone https://github.com/tryretool/custom-component-collection-template audio-trimmer
   ```

2. **Installed dependencies**:
   ```
   npm install wavesurfer.js lucide-react
   ```

3. **Configured the component** to work with Retool's TypeScript API:
   - Updated `index.tsx` to use Retool's state management API
   - Refactored the original component to work with React hooks
   - Added proper event handlers for Retool integration

4. **Simplified font handling**:
   - Removed Next.js-specific font loading
   - Added Google Fonts import for Space Grotesk
   - Created CSS variables for consistent font usage

5. **Added CSS for styling**:
   - Created base component styles
   - Set up CSS variables for theming

6. **Built the component**:
   ```
   npm run build
   ```

## Deployment to Retool

To deploy this component to Retool:

1. **Log in to Retool** from the command line:
   ```
   npx retool-ccl login
   ```
   You'll need to generate an API token with the "Custom Component Libraries" permission in Retool.

2. **Initialize the component library**:
   ```
   npx retool-ccl init
   ```
   Follow the prompts to name your library ("Audio Trimmer") and add a description.

3. **Test in development mode**:
   ```
   npx retool-ccl dev
   ```
   This allows you to test changes in real-time in your Retool instance.

4. **Deploy to production**:
   ```
   npx retool-ccl deploy
   ```
   This creates an immutable version in Retool.

5. **Use in Retool apps**:
   - Drag the "AudioTrimmer" component onto your Retool canvas
   - Configure the properties and event handlers

## Troubleshooting

If you encounter issues:

- Ensure your Retool API token has the correct permissions
- Check browser console for any JavaScript errors
- Verify the audio URL is accessible from your Retool instance
- For CORS issues, ensure your audio file server allows cross-origin requests 