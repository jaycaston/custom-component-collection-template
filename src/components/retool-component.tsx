import React from "react"
import type { FC } from "react"
import WaveSurfer from "wavesurfer.js"
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import "../retool-component.css"

// Define a version constant to help track updates
const COMPONENT_VERSION = "v26";

interface AudioTrimmerProps {
  audioUrl?: string  // Now optional
  audioData?: string // Base64 encoded audio data from Retool REST query
  minLength?: number
  maxLength?: number
  showInstructions?: boolean
  showDebug?: boolean  // New prop to control debug visibility
  primaryColor?: string
  onTrimSaved?: (start: number, end: number) => void
  onAudioLoaded?: () => void
  onError?: () => void
}

// Utility function to get RGB values from a color string
const getRgbFromColor = (color: string) => {
  // For hex colors
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }
  // Default fallback
  return "64, 177, 147";
};

const AudioTrimmerComponent: FC<AudioTrimmerProps> = ({
  audioUrl,
  audioData,
  minLength = 15,
  maxLength = 30,
  showInstructions = true,
  showDebug = false,  // Default to false - hide debug section by default
  primaryColor = "#40B193",
  onTrimSaved,
  onAudioLoaded,
  onError
}) => {
  // Basic state
  const [error, setError] = React.useState<string | null>(null);
  const [audioDuration, setAudioDuration] = React.useState<number>(0);
  const [trimStart, setTrimStart] = React.useState<number>(0);
  const [trimEnd, setTrimEnd] = React.useState<number>(maxLength);
  const [audioLoaded, setAudioLoaded] = React.useState<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [wavesurferReady, setWavesurferReady] = React.useState<boolean>(false);
  const [audioObjectUrl, setAudioObjectUrl] = React.useState<string | null>(null);
  
  // Refs
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const waveformRef = React.useRef<HTMLDivElement>(null);
  const wavesurferRef = React.useRef<WaveSurfer | null>(null);
  
  // Set CSS variable for primary color
  React.useEffect(() => {
    document.documentElement.style.setProperty('--audio-trimmer-primary', primaryColor);
    
    // Also set the RGB version
    document.documentElement.style.setProperty(
      '--audio-trimmer-primary-rgb', 
      getRgbFromColor(primaryColor)
    );
  }, [primaryColor]);
  
  // Log component load and version
  React.useEffect(() => {
    console.log(`Audio Trimmer ${COMPONENT_VERSION} loaded`);
    
    if (audioData) {
      console.log("Received audio data, will use this instead of URL");
    } else if (audioUrl) {
      console.log("Using audio URL:", audioUrl);
    } else {
      console.warn("No audio data or URL provided");
    }
  }, [audioUrl, audioData]);

  // Create object URL from base64 data if provided
  React.useEffect(() => {
    if (audioData) {
      try {
        // Clear any previous object URL
        if (audioObjectUrl) {
          URL.revokeObjectURL(audioObjectUrl);
        }
        
        console.log("Converting base64 audio data to Blob");
        // Remove data URL prefix if present
        const base64Data = audioData.includes('base64,') 
          ? audioData.split('base64,')[1] 
          : audioData;
        
        // Convert base64 to binary
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and object URL
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioObjectUrl(url);
        
        console.log("Created object URL from audio data:", url);
      } catch (err) {
        console.error("Error creating object URL from audio data:", err);
        setError(`Error processing audio data: ${String(err)}`);
      }
    }
    
    // Cleanup function to revoke object URL
    return () => {
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
      }
    };
  }, [audioData]);

  // Set audio source
  React.useEffect(() => {
    if (!audioRef.current) return;
    
    // Determine which source to use
    const sourceUrl = audioObjectUrl || audioUrl;
    
    if (sourceUrl) {
      console.log("Setting audio source to:", sourceUrl);
      audioRef.current.src = sourceUrl;
      audioRef.current.load();
    }
  }, [audioUrl, audioObjectUrl]);

  // Initialize WaveSurfer AFTER the audio element has loaded
  React.useEffect(() => {
    // Only initialize if audio is loaded and we have the container
    if (!audioLoaded || !waveformRef.current || !audioRef.current) return;
    
    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    
    try {
      console.log("Creating WaveSurfer instance");
      
      // Create WaveSurfer instance
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#d1d5db",
        progressColor: primaryColor,
        cursorColor: "rgba(0, 0, 0, 0.5)",
        height: 100,
        hideScrollbar: true,
        backend: "WebAudio"
      });
      
      // Add regions plugin
      const regionsPlugin = wavesurfer.registerPlugin(RegionsPlugin.create());
      
      // Set up event handlers
      wavesurfer.on("ready", () => {
        console.log("WaveSurfer ready!");
        setWavesurferReady(true);
        
        // Create the region for trimming, ensuring it doesn't exceed maxLength
        try {
          const initialEnd = Math.min(trimStart + maxLength, audioDuration);
          setTrimEnd(initialEnd); // Ensure we start with a valid end time
          
          regionsPlugin.addRegion({
            start: trimStart,
            end: initialEnd,
            color: `rgba(${getRgbFromColor(primaryColor)}, 0.2)`,
            drag: true,
            resize: true,
            minLength: minLength, // Set minimum length constraint
            maxLength: maxLength  // Set maximum length constraint
          });
        } catch (err) {
          console.warn("Could not add region:", err);
        }
      });
      
      wavesurfer.on("play", () => {
        console.log("WaveSurfer play");
        setIsPlaying(true);
      });
      
      wavesurfer.on("pause", () => {
        console.log("WaveSurfer pause");
        setIsPlaying(false);
      });
      
      wavesurfer.on("timeupdate", (time) => {
        setCurrentTime(time);
      });

      // Handle region updates
      // @ts-ignore - WaveSurfer types don't include region-updated but it exists
      wavesurfer.on("region-updated", (region: any) => {
        if (region && typeof region === 'object' && 'start' in region && 'end' in region) {
          // Enforce min/max length constraints
          let start = region.start;
          let end = region.end;
          const length = end - start;
          
          // Enforce max length
          if (length > maxLength) {
            // If dragging the start handle, adjust start
            if (Math.abs(end - trimEnd) < 0.1) {
              start = end - maxLength;
            } else {
              // Otherwise adjust end
              end = start + maxLength;
            }
          }
          
          // Enforce min length
          if (length < minLength) {
            // If dragging the start handle, adjust start
            if (Math.abs(end - trimEnd) < 0.1) {
              start = end - minLength;
            } else {
              // Otherwise adjust end
              end = start + minLength;
            }
          }
          
          // Update state with corrected values
          setTrimStart(start);
          setTrimEnd(end);
          
          // Update region if we had to correct it
          if (start !== region.start || end !== region.end) {
            try {
              // @ts-ignore - types don't match exactly
              region.update({ start, end });
            } catch (err) {
              console.warn("Could not update region:", err);
            }
          }
        }
      });
      
      wavesurfer.on("error", (err) => {
        console.error("WaveSurfer error:", err);
      });
      
      // Load the audio using the URL directly now that CORS is configured
      const sourceToLoad = audioObjectUrl || audioUrl;
      console.log("Loading audio URL directly:", sourceToLoad);
      try {
        if (sourceToLoad) {
          wavesurfer.load(sourceToLoad);
        } else {
          console.error("No audio source available to load");
          setError("No audio source available to load");
        }
      } catch (err) {
        console.error("Error loading audio:", err);
        setError(`Error loading audio: ${String(err)}`);
      }
      
      // Store reference
      wavesurferRef.current = wavesurfer;
      
      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      };
    } catch (err) {
      console.error("Error initializing WaveSurfer:", err);
      setError(`WaveSurfer initialization error: ${String(err)}`);
    }
  }, [audioLoaded, primaryColor, trimStart, trimEnd, audioDuration, minLength, maxLength]);

  // Update waveform region when trim values change
  React.useEffect(() => {
    if (wavesurferRef.current && audioLoaded) {
      try {
        const regions = wavesurferRef.current.getActivePlugins().filter(
          // @ts-ignore - plugin has a name property at runtime
          plugin => plugin.name === "regions"
        );
        
        if (regions.length > 0) {
          const regionsPlugin = regions[0];
          
          // @ts-ignore - clearRegions exists
          regionsPlugin.clearRegions();
          
          // @ts-ignore - addRegion exists
          regionsPlugin.addRegion({
            start: trimStart,
            end: trimEnd,
            color: `rgba(${getRgbFromColor(primaryColor)}, 0.2)`,
            drag: true,
            resize: true,
            minLength: minLength,
            maxLength: maxLength
          });
        }
      } catch (err) {
        console.warn("Could not update regions:", err);
      }
    }
  }, [trimStart, trimEnd, audioLoaded, primaryColor, minLength, maxLength]);

  // Handle audio loaded successfully
  const handleAudioLoaded = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const duration = audio.duration;
    
    console.log("Audio element loaded with duration:", duration);
    setAudioDuration(duration);
    setTrimEnd(Math.min(duration, maxLength));
    setAudioLoaded(true);
    
    if (onAudioLoaded) {
      onAudioLoaded();
    }
  };
  
  // Handle audio loading error
  const handleError = () => {
    const errorMsg = "Failed to load audio file";
    console.error(errorMsg);
    setError(errorMsg);
    
    if (onError) {
      onError();
    }
  };
  
  // Handle audio time updates
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setCurrentTime(audio.currentTime);
  };
  
  // Play/pause toggle using WaveSurfer with more reliable positioning
  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    
    try {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        // Create a cleaner approach to play from trim position
        wavesurferRef.current.pause(); // Ensure paused state first
        
        // Set position to trim start
        wavesurferRef.current.seekTo(trimStart / audioDuration);
        
        // Double check the position setting with direct currentTime
        if (wavesurferRef.current.getMediaElement()) {
          // @ts-ignore - this exists at runtime
          wavesurferRef.current.getMediaElement().currentTime = trimStart;
        }
        
        // Now play
        wavesurferRef.current.play();
        
        console.log("Playing from position:", trimStart, 
                   "Current time:", wavesurferRef.current.getCurrentTime());
      }
    } catch (err) {
      console.error("Error toggling playback:", err);
      setError(`Error toggling playback: ${String(err)}`);
    }
  };
  
  // Replace the click handler effect with a stronger playback solution
  React.useEffect(() => {
    // Both for initial setup and when trim values change
    if (wavesurferRef.current && audioLoaded) {
      // Override the default play function to always respect our trim region
      const originalPlay = wavesurferRef.current.play.bind(wavesurferRef.current);
      
      // Replace the play method with our custom version
      // @ts-ignore - we're monkey patching the play method
      wavesurferRef.current.play = (...args) => {
        // Always start from trim region unless already within it
        const currentTime = wavesurferRef.current?.getCurrentTime() || 0;
        
        if (currentTime < trimStart || currentTime >= trimEnd) {
          console.log("Repositioning to trim start before playing:", trimStart);
          wavesurferRef.current?.seekTo(trimStart / audioDuration);
          
          // Also set media element time directly as a fallback
          if (wavesurferRef.current?.getMediaElement()) {
            // @ts-ignore
            wavesurferRef.current.getMediaElement().currentTime = trimStart;
          }
        }
        
        // Now call the original play method
        return originalPlay(...args);
      };
    }
  }, [wavesurferRef.current, audioLoaded, trimStart, trimEnd, audioDuration]);

  // Monitor current time to stop at trim end
  React.useEffect(() => {
    if (isPlaying && currentTime >= trimEnd && wavesurferRef.current) {
      console.log("Reached end of clip, pausing at:", currentTime);
      wavesurferRef.current.pause();
    }
  }, [currentTime, trimEnd, isPlaying]);
  
  // Save the trim
  const handleSave = () => {
    console.log("Trim saved:", { start: trimStart, end: trimEnd });
    
    if (onTrimSaved) {
      onTrimSaved(trimStart, trimEnd);
    }
  };
  
  // Format time as MM:SS
  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  
  // Show the basic player as a fallback
  const showBasicPlayer = () => {
    if (audioRef.current) {
      audioRef.current.style.display = "block";
      audioRef.current.controls = true;
    }
  };
  
  return (
    <div className="retool-audio-trimmer-root">
      <div className="audio-trimmer-container">
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          {/* Version indicator */}
          <span style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: 'normal'
          }}>{COMPONENT_VERSION}</span>
        </h3>
        
        {/* Debug section - only visible when showDebug is true */}
        {showDebug && (
          <details className="debug-details" style={{
            marginBottom: '16px',
            padding: '8px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
              Debug Info
            </summary>
            <div style={{ marginTop: '8px' }}>
              <p><strong>Audio URL:</strong> {audioUrl ? (audioUrl.length > 50 ? `${audioUrl.substring(0, 50)}...` : audioUrl) : 'none'}</p>
              <p><strong>Using data:</strong> {audioData ? 'Yes' : 'No'}</p>
              <p><strong>Audio loaded:</strong> {audioLoaded ? 'Yes' : 'No'}</p>
              <p><strong>WaveSurfer ready:</strong> {wavesurferReady ? 'Yes' : 'No'}</p>
              <p><strong>Audio duration:</strong> {formatTime(audioDuration)}</p>
              <p><strong>Current time:</strong> {formatTime(currentTime)}</p>
              <p><strong>Trim start:</strong> {formatTime(trimStart)}</p>
              <p><strong>Trim end:</strong> {formatTime(trimEnd)}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={showBasicPlayer}
                  className="audio-trimmer-btn"
                  style={{
                    backgroundColor: '#4f46e5',
                    padding: '4px 8px',
                    fontSize: '12px'
                  }}
                >
                  Show Basic Player
                </button>
              </div>
            </div>
          </details>
        )}
        
        {/* Waveform visualization */}
        <div className="waveform-container" ref={waveformRef} />
        
        {/* Hidden audio element for loading */}
        <audio 
          ref={audioRef}
          preload="auto"
          style={{ display: 'none' }}
          onLoadedMetadata={handleAudioLoaded}
          onTimeUpdate={handleTimeUpdate}
          onError={handleError}
        />
        
        {/* Error message */}
        {error && (
          <div className="error-message">
            {error}
            <audio 
              src={audioObjectUrl || audioUrl || ''} 
              controls
              style={{ width: '100%', marginTop: '12px' }} 
            />
          </div>
        )}
        
        {/* Loading indicator */}
        {!audioLoaded && (audioUrl || audioData) && (
          <div className="audio-loading">
            Loading audio...
          </div>
        )}
        
        {/* Audio controls and trim UI */}
        {audioLoaded && (
          <>
            {/* Time display and trim selection */}
            <div className="audio-trim-info">
              <div>Current: {formatTime(currentTime)} / Duration: {formatTime(audioDuration)}</div>
              <div>
                Selection: {formatTime(trimStart)}-{formatTime(trimEnd)} ({formatTime(trimEnd - trimStart)})
              </div>
            </div>
            
            {/* Main controls row */}
            <div className="audio-player-controls">
              <button 
                className="audio-player-button"
                onClick={togglePlayPause}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              
              <button 
                className="audio-player-button"
                onClick={handleSave}
              >
                Save Clip
              </button>
            </div>
            
            {/* Trim info display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <div>
                Start: {formatTime(trimStart)}
              </div>
              <div>
                Duration: {formatTime(trimEnd - trimStart)}
              </div>
              <div>
                End: {formatTime(trimEnd)}
              </div>
            </div>
            
            {/* Instructions */}
            {showInstructions && (
              <div className="instructions">
                <p>Drag the teal handles to adjust trim start and end points.</p>
                <p>Drag the teal region to move the entire selection.</p>
                <p>Clip length must be between {formatTime(minLength)} and {formatTime(maxLength)} seconds.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AudioTrimmerComponent

