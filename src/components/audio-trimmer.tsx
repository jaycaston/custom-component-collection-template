"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { Button } from "../ui/button"
import { Pause, Play, Rewind, Save, AlertTriangle, GripVertical, Move } from "lucide-react"

interface AudioData {
  url: string
  blob?: Blob
  arrayBuffer?: ArrayBuffer
  fileName?: string
  type?: string
}

interface AudioTrimmerProps {
  audioData: AudioData
  onSave?: (start: number, end: number, duration: number) => void
  onAudioLoaded?: (duration: number) => void
  onError?: (error: string) => void
  minLength?: number
  maxLength?: number
  showInstructions?: boolean
}

// Helper function to check if URL needs a CORS proxy
const addCorsProxyIfNeeded = (url: string): string => {
  // Just return the URL as is - CORS should be handled on the server side
  console.log("Using audio URL:", url);
  return url;
};

export default function AudioTrimmer({
  audioData,
  onSave = () => {},
  onAudioLoaded = () => {},
  onError = () => {},
  minLength = 15,
  maxLength = 60,
  showInstructions = true,
}: AudioTrimmerProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragStartPosRef = useRef<number>(0)
  const initialTrimValuesRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const checkEndIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState<"start" | "end" | "region" | null>(null)

  // Cleanup and initialize when URL changes
  useEffect(() => {
    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy()
      wavesurferRef.current = null
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (checkEndIntervalRef.current) {
      clearInterval(checkEndIntervalRef.current)
    }

    // Reset state
    setIsLoaded(false)
    setLoadError(null)
    setIsLoading(true)
    setCurrentTime(0)
    setTrimStart(0)
    setTrimEnd(0)
    setDuration(0)
    setIsDragging(null)

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      const audio = document.createElement("audio")
      audio.controls = false
      audio.style.display = "none"
      document.body.appendChild(audio)
      audioRef.current = audio
    }

    // Set audio source
    if (audioRef.current) {
      audioRef.current.src = addCorsProxyIfNeeded(audioData.url)
      audioRef.current.load()
    }

    // Initialize WaveSurfer
    initWaveSurfer()

    return () => {
      // Clean up on unmount
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
        wavesurferRef.current = null
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (checkEndIntervalRef.current) {
        clearInterval(checkEndIntervalRef.current)
      }

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [audioData.url])

  // Set up interval to check for trim end when playing
  useEffect(() => {
    // Clear any existing interval
    if (checkEndIntervalRef.current) {
      clearInterval(checkEndIntervalRef.current)
    }

    // Only set up the interval if we're playing
    if (isPlaying && isLoaded) {
      checkEndIntervalRef.current = setInterval(() => {
        if (!wavesurferRef.current) return

        const currentPlayTime = wavesurferRef.current.getCurrentTime()

        // Check if we've reached the trim end
        if (currentPlayTime >= trimEnd) {
          wavesurferRef.current.pause()
          wavesurferRef.current.seekTo(trimStart / duration)
        }
      }, 100) // Check every 100ms
    }

    return () => {
      if (checkEndIntervalRef.current) {
        clearInterval(checkEndIntervalRef.current)
      }
    }
  }, [isPlaying, trimStart, trimEnd, duration, isLoaded])

  // Initialize WaveSurfer
  const initWaveSurfer = () => {
    if (!waveformRef.current) return

    try {
      // Make sure the container is empty
      waveformRef.current.innerHTML = ""
      
      console.log("Initializing WaveSurfer with URL:", audioData.url);
      console.log("WaveSurfer container element:", waveformRef.current);
      
      // Check container dimensions
      const containerRect = waveformRef.current.getBoundingClientRect();
      console.log("Container dimensions:", {
        width: containerRect.width,
        height: containerRect.height,
        isVisible: containerRect.width > 0 && containerRect.height > 0
      });
      
      // If container is not properly sized, we might have issues
      if (containerRect.width <= 0 || containerRect.height <= 0) {
        console.warn("WaveSurfer container has invalid dimensions. This may prevent proper rendering.");
      }

      // Create WaveSurfer instance
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgba(120, 180, 170, 0.5)", 
        progressColor: "rgba(var(--audio-trimmer-primary-rgb, 64, 177, 147), 0.9)",
        cursorColor: "rgb(var(--audio-trimmer-primary-rgb, 64, 177, 147))",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 100,
        normalize: true,
        backend: "WebAudio",
      })
      
      // Debug events
      wavesurfer.on('loading', percent => {
        console.log(`WaveSurfer loading: ${percent}%`);
      });
      
      wavesurfer.on('decode', () => {
        console.log("WaveSurfer decoding audio");
      });
      
      // More detailed error logging
      wavesurfer.on('error', err => {
        console.error("WaveSurfer detailed error:", err);
        console.error("Error type:", typeof err);
        console.error("Error string:", String(err));
      });

      // Store reference
      wavesurferRef.current = wavesurfer
      
      // Try loading the audio explicitly
      try {
        console.log("Loading audio with URL:", addCorsProxyIfNeeded(audioData.url));
        wavesurfer.load(addCorsProxyIfNeeded(audioData.url));
      } catch (loadError) {
        console.error("Error during wavesurfer.load():", loadError);
        setLoadError(`Load error: ${String(loadError)}`);
        setIsLoading(false);
      }

      // Error handling
      wavesurfer.on("error", (err) => {
        console.error("WaveSurfer error:", err)
        const errorMessage = `Error loading audio: ${err.toString()}`
        setLoadError(errorMessage)
        setIsLoading(false)
        onError(errorMessage)
        
        // Render fallback player on error
        renderFallbackPlayer();
      })

      // Ready event
      wavesurfer.on("ready", () => {
        console.log("WaveSurfer ready");
        const audioDuration = wavesurfer.getDuration()
        console.log("Audio duration:", audioDuration);
        
        setDuration(audioDuration)

        // Set initial trim values
        const initialEnd = Math.min(audioDuration, maxLength)
        setTrimStart(0)
        setTrimEnd(initialEnd)
        setIsLoaded(true)
        setIsLoading(false)

        // Notify parent component
        onAudioLoaded(audioDuration)
        
        // Set volume to 100%
        wavesurfer.setVolume(1.0)
      })
      
      // Audioprocess event - update current time
      wavesurfer.on("audioprocess", () => {
        const currentPlayTime = wavesurfer.getCurrentTime()
        setCurrentTime(currentPlayTime)
      })

      // Play/pause events
      wavesurfer.on("play", () => setIsPlaying(true))
      wavesurfer.on("pause", () => setIsPlaying(false))
      
      // Add a timeout to handle when wavesurfer might be stuck
      setTimeout(() => {
        if (isLoading && !loadError) {
          console.log("WaveSurfer load timeout - forcing fallback player");
          console.log("Current state at timeout:", { 
            isLoading, 
            isLoaded, 
            loadError, 
            waveformContainerExists: !!waveformRef.current,
            wavesurferExists: !!wavesurferRef.current,
            audioURL: audioData.url
          });
          
          setLoadError("Timeout loading audio visualization. Using fallback player.");
          setIsLoading(false);
        }
      }, 5000);
    } catch (e) {
      const errorMessage = `Failed to initialize audio player: ${e}`
      console.error("WaveSurfer initialization error:", e)
      setLoadError(errorMessage)
      setIsLoading(false)
      onError(errorMessage)
    }
  }

  // Set up drag handlers
  useEffect(() => {
    if (!isLoaded) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !waveformRef.current || !isFinite(duration) || duration <= 0) return

      const rect = waveformRef.current.getBoundingClientRect()
      const clickPosition = (e.clientX - rect.left) / rect.width
      const clickTime = clickPosition * duration

      if (isDragging === "start") {
        // Ensure start is within valid range
        const newStart = Math.max(0, Math.min(clickTime, trimEnd - minLength))
        setTrimStart(newStart)
      } else if (isDragging === "end") {
        // Ensure end is within valid range
        const newEnd = Math.min(duration, Math.max(clickTime, trimStart + minLength))
        setTrimEnd(newEnd)
      } else if (isDragging === "region") {
        // Calculate the drag distance in time
        const currentPos = clickTime
        const dragDistance = currentPos - dragStartPosRef.current

        // Get the initial values from when the drag started
        const { start: initialStart, end: initialEnd } = initialTrimValuesRef.current
        const trimDuration = initialEnd - initialStart

        // Calculate new positions while maintaining the trim duration
        let newStart = initialStart + dragDistance
        let newEnd = initialEnd + dragDistance

        // Ensure we don't go out of bounds
        if (newStart < 0) {
          newStart = 0
          newEnd = newStart + trimDuration
        }

        if (newEnd > duration) {
          newEnd = duration
          newStart = newEnd - trimDuration
        }

        // Update trim values
        setTrimStart(newStart)
        setTrimEnd(newEnd)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(null)
    }

    // Add event listeners to document
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      // Clean up event listeners
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, trimStart, trimEnd, duration, minLength, isLoaded])

  // Safe seek function to prevent errors
  const safeSeek = (position: number) => {
    if (!wavesurferRef.current || !isLoaded) return

    try {
      if (isFinite(position) && isFinite(duration) && duration > 0) {
        const seekPos = position / duration
        if (isFinite(seekPos) && seekPos >= 0 && seekPos <= 1) {
          wavesurferRef.current.seekTo(seekPos)
        }
      }
    } catch (err) {
      console.error("Error in safeSeek:", err)
    }
  }

  // Play/pause toggle
  const togglePlayPause = () => {
    if (!wavesurferRef.current || !isLoaded) return

    try {
      if (!isPlaying) {
        // When starting playback, seek to trim start if we're outside the trim region
        const currentPlayTime = wavesurferRef.current.getCurrentTime()
        if (currentPlayTime < trimStart || currentPlayTime >= trimEnd) {
          safeSeek(trimStart)
        }
      }

      wavesurferRef.current.playPause()
    } catch (err) {
      console.error("Error toggling play/pause:", err)
    }
  }

  // Rewind to trim start
  const resetPosition = () => {
    if (!isLoaded || !isFinite(trimStart)) return

    try {
      safeSeek(trimStart)
    } catch (err) {
      console.error("Error rewinding:", err)
    }
  }

  // Save trim values
  const saveTrim = () => {
    onSave(trimStart, trimEnd, duration)
  }

  // Format time as MM:SS
  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Calculate trim duration
  const trimDuration = trimEnd - trimStart

  // Handle waveform click
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !waveformRef.current || !isLoaded || duration <= 0) return

    const rect = waveformRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width

    // Ensure clickPosition is valid
    if (!isFinite(clickPosition) || clickPosition < 0 || clickPosition > 1) return

    const clickTime = clickPosition * duration

    // Only allow seeking within the trim region
    if (clickTime >= trimStart && clickTime <= trimEnd) {
      safeSeek(clickTime)
    } else if (clickTime < trimStart) {
      safeSeek(trimStart)
    } else if (clickTime > trimEnd) {
      safeSeek(trimStart)
    }
  }

  // Start dragging a handle
  const startDrag = (type: "start" | "end" | "region") => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent waveform click

    if (!waveformRef.current || !isFinite(duration) || duration <= 0) return

    // Store the initial mouse position and trim values
    const rect = waveformRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    dragStartPosRef.current = clickPosition * duration
    initialTrimValuesRef.current = { start: trimStart, end: trimEnd }

    // Set the drag type
    setIsDragging(type)
  }

  // Render fallback player
  const renderFallbackPlayer = () => {
    console.log("Rendering fallback HTML5 audio player");
    return (
      <div className="fallback-player">
        <p>Waveform visualization unavailable. Using basic player:</p>
        <audio 
          src={audioData.url} 
          controls 
          style={{ width: '100%', marginTop: '10px' }}
          onLoadedMetadata={(e) => {
            const audioDuration = e.currentTarget.duration;
            setDuration(audioDuration);
            setTrimStart(0);
            setTrimEnd(Math.min(audioDuration, maxLength));
            setIsLoaded(true);
            setIsLoading(false);
            onAudioLoaded(audioDuration);
            console.log("Fallback player loaded, duration:", audioDuration);
          }}
          onError={(e) => {
            console.error("Fallback player error:", e);
            setLoadError("Error loading audio in fallback player");
            setIsLoading(false);
          }}
        />
      </div>
    );
  };

  // Calculate trim overlay position
  const startPercent = isFinite(duration) && duration > 0 ? (trimStart / duration) * 100 : 0
  const endPercent = isFinite(duration) && duration > 0 ? (trimEnd / duration) * 100 : 0
  const widthPercent = endPercent - startPercent

  // Main render
  return (
    <div className="audio-trimmer-container">
      {loadError ? (
        <div className="error-message">
          <AlertTriangle className="h-5 w-5 mr-2 inline" />
          {loadError}
          {renderFallbackPlayer()}
        </div>
      ) : null}
      
      {isLoading ? (
        <div className="audio-loading">Loading audio...</div>
      ) : null}
      
      {!isLoading && !loadError && (
        <div className="relative">
          <div ref={waveformRef} className="waveform-container"></div>
          
          {/* Always show HTML5 fallback player */}
          <div className="fallback-player">
            <p>Use this player to control audio:</p>
            <audio 
              src={audioData.url} 
              controls 
              style={{ width: '100%', marginTop: '10px' }}
              onLoadedMetadata={(e) => {
                const audioDuration = e.currentTarget.duration;
                if (!isLoaded) {
                  console.log("Fallback player loaded, duration:", audioDuration);
                  setDuration(audioDuration);
                  setTrimStart(0);
                  setTrimEnd(Math.min(audioDuration, maxLength));
                  setIsLoaded(true);
                  setIsLoading(false);
                  onAudioLoaded(audioDuration);
                }
              }}
            />
          </div>
          
          <div className="audio-trim-info">
            <div>
              Start: {formatTime(trimStart)} / End: {formatTime(trimEnd)}
            </div>
            <div>Duration: {formatTime(trimEnd - trimStart)}</div>
          </div>
          
          <div className="audio-player-controls">
            <button
              className="audio-player-button"
              onClick={togglePlayPause}
              disabled={!isLoaded}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPlaying ? "Pause" : "Play"}
            </button>
            
            <button
              className="audio-player-button"
              onClick={resetPosition}
              disabled={!isLoaded}
            >
              <Rewind className="h-4 w-4 mr-1" />
              Reset
            </button>
            
            <button
              className="audio-player-button"
              onClick={saveTrim}
              disabled={!isLoaded}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Trim
            </button>
          </div>
        </div>
      )}
      
      {showInstructions && isLoaded && (
        <div className="instructions">
          <p>Instructions: Adjust the green section to trim the audio. Click Save when done.</p>
          <p>Min length: {formatTime(minLength)} / Max length: {formatTime(maxLength)}</p>
        </div>
      )}
    </div>
  )
}

