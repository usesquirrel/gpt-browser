"use client";

import { ReactNode, useState, useEffect, useRef } from "react";

interface DesktopScreenProps {
  children: ReactNode;
  screenWidth?: number;
  screenHeight?: number;
  url?: string;
  onUrlChange?: (url: string) => void;
  onNavigate?: (url: string) => void;
  onHomeClick?: () => void;
  isGenerating?: boolean;
  isCached?: boolean;
  provider?: string;
  onProviderChange?: (provider: string) => void;
}

export default function DesktopScreen({
  children,
  screenWidth = 1600,
  screenHeight = 900,
  url,
  onUrlChange,
  onNavigate,
  onHomeClick,
  isGenerating,
  isCached,
  provider = "gemini-2.5-flash-image-preview",
  onProviderChange,
}: DesktopScreenProps) {
  const [localUrl, setLocalUrl] = useState(url || "");
  const [scale, setScale] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("top left");
  const [translateX, setTranslateX] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper function to normalize URLs
  const normalizeUrl = (inputUrl: string): string => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return trimmed;
    
    // Check if URL already has a protocol
    if (!/^https?:\/\//i.test(trimmed)) {
      // Add https:// if no protocol is specified
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  useEffect(() => {
    setLocalUrl(url || "");
  }, [url]);

  // Handle dial-up sound playback
  useEffect(() => {
    if (isGenerating && !isCached) {
      // Start playing the dial-up sound (once, not looped)
      if (audioRef.current && !isMuted) {
        audioRef.current.volume = 1;
        audioRef.current.loop = false;
        audioRef.current.play().catch(err => {
          console.log("Failed to play dial-up sound:", err);
        });
      }
    } else {
      // Stop playing when not generating
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isGenerating, isCached]);

  // Handle mute/unmute while playing
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  // Update scale factor when window resizes
  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      let baseScale = viewportWidth / screenWidth;

      // Add zoom factor for narrow screens to crop in horizontally
      if (viewportWidth < 600) {
        const zoomFactor = 1.95; // 150% zoom for mobile
        baseScale *= zoomFactor;
        setTransformOrigin("top left"); // Keep consistent origin

        // Calculate translation to center the zoomed image
        // We want the center of the scaled image (screenWidth * baseScale / 2)
        // to align with the center of the viewport (viewportWidth / 2)
        const scaledImageCenter = (screenWidth * baseScale) / 2;
        const viewportCenter = viewportWidth / 2;
        const translateXValue = viewportCenter - scaledImageCenter;
        setTranslateX(translateXValue);
      } else {
        setTransformOrigin("top left"); // Normal scaling from top-left
        setTranslateX(0); // No translation needed for desktop
      }

      setScale(baseScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [screenWidth]);

  // Monitor coordinates relative to the original image size
  const monitorTopLeft = { x: 456, y: 170 };
  const monitorBottomRight = { x: 1147, y: 675 };

  const monitorWidth = monitorBottomRight.x - monitorTopLeft.x; // 691px
  const monitorHeight = monitorBottomRight.y - monitorTopLeft.y; // 505px

  // Calculate scale factor for content within monitor bounds
  const contentScale = Math.min(1, scale); // Don't scale content beyond 1x for readability

  return (
    <div
      id="desktop-screen-root"
      className="fixed inset-0 w-full h-[505px]"
      style={{ margin: 0, padding: 0 }}
    >
      {/* Scaled container that maintains aspect ratio */}
      <div
        id="desktop-screen-scaled"
        className="absolute top-0 left-0"
        style={{
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
          transform: `translateX(${translateX}px) scale(${scale})`,
          transformOrigin: transformOrigin,
        }}
      >
        {/* Background image at original size */}
        <img
          src="/desk-tall.png"
          alt="Desktop setup"
          className="absolute top-0 left-0 z-10"
          style={{
            pointerEvents: "none",
            width: `${screenWidth}px`,
            height: "auto",
          }}
        />

        {/* Monitor content at original coordinates */}
        <div
          className="z-20 relative"
          style={{
            left: `${monitorTopLeft.x}px`,
            top: `${monitorTopLeft.y}px`,
            width: `${monitorWidth}px`,
            height: `${monitorHeight}px`,
          }}
        >
          <div className="relative w-full h-full bg-gray-100 flex flex-col">
            {/* Browser URL Bar - Always visible */}
            <div id="browser-url-bar" className="w-full bg-white border-b border-gray-300 flex items-center gap-3 px-2 py-1">
              <button
                onClick={onHomeClick}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-purple-400 flex items-center justify-center transition-colors"
                title="Home"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </button>
              <div className="relative flex-1 flex items-center">
                {isCached && (
                  <div className="absolute left-3 z-10 flex items-center" title="Loaded from cache">
                    <svg
                      className="w-4 h-4 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                  </div>
                )}
                <input
                  type="url"
                  value={localUrl}
                  onChange={(e) => {
                    setLocalUrl(e.target.value);
                    onUrlChange?.(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && localUrl && !isGenerating) {
                      onNavigate?.(normalizeUrl(localUrl));
                    }
                  }}
                  placeholder="Enter a website URL"
                  className={`h-8 w-full bg-gray-100 rounded-full py-2.5 text-base font-mono outline-none focus:bg-gray-50 focus:ring-2 focus:ring-blue-500 ${
                    !localUrl ? "text-gray-500" : "text-gray-700"
                  } ${isCached ? "pl-10 pr-5" : "px-5"}`}
                  disabled={isGenerating}
                  suppressHydrationWarning
                />
              </div>
              <button
                onClick={() =>
                  localUrl && !isGenerating && onNavigate?.(normalizeUrl(localUrl))
                }
                disabled={!localUrl || isGenerating}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  localUrl && !isGenerating
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-200 text-purple-400 cursor-not-allowed"
                }`}
                title="Go"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
              <button
                onClick={() => {
                  const newProvider = provider === "gemini-2.5-flash-image-preview" 
                    ? "gpt-image-1" 
                    : "gemini-2.5-flash-image-preview";
                  onProviderChange?.(newProvider);
                }}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                title={provider === "gemini-2.5-flash-image-preview" ? "Switch to GPT" : "Switch to Gemini"}
              >
                <img
                  src={provider === "gemini-2.5-flash-image-preview" ? "/google.svg" : "/openai.svg"}
                  alt={provider === "gemini-2.5-flash-image-preview" ? "Google Gemini" : "OpenAI"}
                  className="w-5 h-5"
                />
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                title={isMuted ? "Unmute dial-up sound" : "Mute dial-up sound"}
              >
                {isMuted ? (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Content area with scrolling */}
            <div className="overflow-y-auto overflow-x-hidden scrollbar-custom h-[460px]">
              <div className="min-w-full h-[460px] bg-white">{children}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio element for dial-up sound */}
      <audio
        ref={audioRef}
        src="/dial-up-internet-sound.mp3"
        preload="none"
      />
    </div>
  );
}
