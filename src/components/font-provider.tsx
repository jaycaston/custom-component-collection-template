"use client"

import React, { useEffect } from "react"
import { spaceGrotesk } from "./fonts"

interface FontProviderProps {
  children: React.ReactNode
}

export default function FontProvider({ children }: FontProviderProps) {
  // Add the font class to the body
  useEffect(() => {
    // Add a style tag for the font
    const style = document.createElement("style")
    style.textContent = `
      :root {
        --font-space-grotesk: ${spaceGrotesk.style.fontFamily};
      }
      
      .font-space-grotesk {
        font-family: var(--font-space-grotesk);
      }

      /* Load Space Grotesk from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return <>{children}</>
}

