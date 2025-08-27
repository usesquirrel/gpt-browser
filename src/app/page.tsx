"use client";

import { useState, useEffect, useRef } from "react";
import { useImageGeneration } from "./hooks/useImageGeneration";
import DesktopScreen from "./components/DesktopScreen";
import { usePostHog } from "posthog-js/react";
import { testPostHogObservability } from "./actions/test-posthog";

export default function Home() {
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState("gemini-2.5-flash-image-preview");
  const { state, isGenerating, generateImage, reset, cancel } =
    useImageGeneration();
  const posthog = usePostHog();
  const postitRef = useRef<HTMLDivElement | null>(null);
  const [postitTop, setPostitTop] = useState<number | null>(null);

  // Pin post-it to the bottom of the desktop screen responsively
  useEffect(() => {
    const updatePosition = () => {
      const scaled = document.getElementById("desktop-screen-scaled");
      const postit = postitRef.current;
      if (!scaled || !postit) return;

      const scaledRect = scaled.getBoundingClientRect();

      // Derive the current scale from the scaled container height.
      // Matches DesktopScreen's screenHeight default: 900px
      const screenHeightPx = 900;
      const monitorBottomOriginalY = 675; // from DesktopScreen monitorBottomRight.y
      const scale = scaledRect.height / screenHeightPx;
      const monitorBottomViewportY = scaledRect.top + (monitorBottomOriginalY * scale);

      // Account for the masking tape overlap above the card and a small gap
      const tapeOverlapAboveCardPx = 10; // ::before is positioned top:-10px
      const gapBelowPx = 8; // visual spacing from the bottom of the screen

      const desiredTop = monitorBottomViewportY + gapBelowPx + tapeOverlapAboveCardPx;
      const postHeight = postit.offsetHeight || 0;
      const maxTop = window.innerHeight - postHeight - 8; // keep fully visible within viewport
      const finalTop = Math.min(desiredTop, maxTop);
      setPostitTop(finalTop);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, []);

  // Test PostHog observability on page load
  useEffect(() => {
    const testObservability = async () => {
      console.log('🔍 Testing PostHog LLM observability on page load...');
      try {
        const result = await testPostHogObservability();
        console.log('✅ PostHog test result:', result);
        
        // Track the test in PostHog web analytics too
        if (result) {
          posthog?.capture('llm_observability_test', {
            success: result.success,
            response: result.success && 'response' in result ? result.response : undefined,
            error: !result.success && 'error' in result ? result.error : undefined,
            usage: result.success && 'usage' in result ? result.usage : undefined,
          });
        }
      } catch (error) {
        console.error('❌ PostHog test failed:', error);
        posthog?.capture('llm_observability_test', {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    testObservability();
  }, [posthog]);

  const handleNavigate = async (newUrl: string) => {
    if (!newUrl) return;

    // Track image generation attempt
    posthog?.capture("image_generation_started", {
      url: newUrl,
      provider: provider,
      cached: false, // Will be updated later if cached
      llm_observability_enabled: true,
    });

    // Cancel any ongoing generation before starting new one
    if (isGenerating) {
      cancel();
    }

    setUrl(newUrl);
    await generateImage(newUrl, provider);
  };

  // Track when image generation completes or fails
  useEffect(() => {
    if (state.step === "completed" && state.image) {
      posthog?.capture("image_generation_completed", {
        url: url,
        cached: state.cached,
        success: true,
      });
    } else if (state.step === "error") {
      posthog?.capture("image_generation_completed", {
        url: url,
        cached: false,
        success: false,
        error: state.error,
      });
    }
  }, [state.step, state.image, state.cached, state.error, url, posthog]);

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      style={{ margin: 0, padding: 0 }}
    >
      {/* Squirrel Logo */}
      <div 
        ref={postitRef}
        className="absolute left-1/2 -translate-x-1/2 transform z-50"
        style={{ top: postitTop ?? undefined }}
      >
        <style jsx>{`
          .postit-card {
            position: relative;
            background: linear-gradient(180deg, #fff9c4 0%, #fff59d 100%);
            border: 1px solid #fde68a;
            border-radius: 0;
            padding: 16px 14px;
            box-shadow: 0 18px 30px rgba(0, 0, 0, 0.12), 0 8px 12px rgba(0, 0, 0, 0.06), 0 2px 0 #fcd34d inset;
            transform: rotate(-2.2deg);
            transition: transform 200ms ease, box-shadow 200ms ease;
          }
          .postit-card:hover {
            transform: rotate(-1deg) translateY(-1px);
            box-shadow: 0 22px 36px rgba(0, 0, 0, 0.16), 0 10px 16px rgba(0, 0, 0, 0.08), 0 2px 0 #fcd34d inset;
          }
          .postit-card::before {
            /* masking tape */
            content: "";
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%) rotate(-3deg);
            width: 60%;
            height: 14px;
            background: rgba(245, 245, 220, 0.75);
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 2px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          }
          .postit-card::after {
            /* folded corner */
            content: "";
            position: absolute;
            right: 0;
            bottom: 0;
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-top: 12px solid rgba(0, 0, 0, 0.06);
          }
        `}</style>
        <a
          href="https://squirrelrecruit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="postit-card transition-all duration-300 group-hover:scale-110">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 229.32 62.14"
              className="h-8 w-auto"
              style={{ fill: '#6953a3' }}
            >
              <path d="m12.44,48.93c-1.12,0-2.34-.12-3.64-.37-1.3-.25-2.56-.61-3.77-1.08-1.21-.47-2.26-1.03-3.13-1.69-.88-.65-1.45-1.38-1.72-2.19-.13-.45-.19-.89-.17-1.31.02-.43.16-.88.4-1.35.25-.47.57-.95.98-1.45.4-.49.83-.77,1.28-.84.45-.07.99.08,1.62.44.63.23,1.29.52,1.99.88.7.36,1.42.72,2.16,1.08.74.36,1.5.65,2.29.88.79.23,1.56.34,2.33.34,1.66,0,2.98-.28,3.94-.84.97-.56,1.45-1.36,1.45-2.39,0-.58-.15-1.09-.44-1.52-.29-.43-.71-.8-1.25-1.11-.54-.31-1.15-.58-1.82-.81-.67-.22-1.42-.45-2.22-.67-.81-.22-1.62-.45-2.43-.67-1.17-.31-2.3-.7-3.4-1.15-1.1-.45-2.1-1.03-3-1.75-.9-.72-1.62-1.63-2.16-2.73-.54-1.1-.81-2.46-.81-4.08,0-2.02.49-3.74,1.48-5.16.99-1.42,2.4-2.5,4.25-3.27,1.84-.76,4.07-1.15,6.67-1.15.9,0,1.76.07,2.59.2.83.13,1.64.33,2.43.57.79.25,1.55.55,2.29.91.74.36,1.45.76,2.12,1.21,1.12.63,1.71,1.36,1.75,2.19.04.83-.27,1.72-.94,2.66-.5.67-.99,1.14-1.48,1.38-.49.25-1.01.24-1.55-.03-.72-.36-1.49-.74-2.33-1.15-.83-.4-1.69-.76-2.56-1.08-.88-.31-1.79-.47-2.73-.47s-1.71.13-2.43.4c-.72.27-1.26.65-1.62,1.15-.36.49-.54,1.06-.54,1.68s.18,1.15.54,1.55c.36.4.83.74,1.42,1.01.58.27,1.28.51,2.09.71.81.2,1.66.39,2.56.57,1.26.27,2.54.61,3.84,1.01,1.3.4,2.5.97,3.61,1.68,1.1.72,1.99,1.67,2.66,2.86.67,1.19,1.01,2.73,1.01,4.62,0,3.28-1.2,5.82-3.61,7.62-2.4,1.8-5.74,2.7-10.01,2.7Z"/>
              <path d="m45.4,48.05c-2.02,0-3.95-.4-5.8-1.21-1.84-.81-3.47-1.94-4.89-3.4-1.42-1.46-2.53-3.18-3.34-5.16-.81-1.98-1.21-4.13-1.21-6.47s.4-4.44,1.21-6.44c.81-2,1.92-3.76,3.34-5.29,1.42-1.53,3.04-2.72,4.89-3.57,1.84-.85,3.77-1.28,5.8-1.28,2.2,0,4.16.43,5.86,1.28,1.71.85,3.16,2.02,4.35,3.5,1.19,1.48,2.1,3.22,2.73,5.22.63,2,.94,4.15.94,6.44.04,2.29-.25,4.43-.88,6.4-.63,1.98-1.54,3.72-2.73,5.22-1.19,1.51-2.64,2.67-4.35,3.5-1.71.83-3.69,1.25-5.93,1.25Zm1.15-7.55c1.53,0,2.91-.37,4.15-1.11,1.24-.74,2.22-1.77,2.97-3.1.74-1.32,1.11-2.82,1.11-4.48s-.36-3.14-1.08-4.45c-.72-1.3-1.7-2.33-2.93-3.07-1.24-.74-2.66-1.11-4.28-1.11-1.53,0-2.92.37-4.18,1.11-1.26.74-2.26,1.76-3,3.07-.74,1.3-1.11,2.79-1.11,4.45s.37,3.16,1.11,4.48c.74,1.33,1.75,2.36,3.03,3.1,1.28.74,2.68,1.11,4.21,1.11Zm12.33,21.63c-1.21,0-2.11-.19-2.7-.57-.58-.38-.96-.88-1.11-1.48-.16-.61-.21-1.29-.17-2.06V17.66c.13-.58.37-1.04.71-1.38s.79-.58,1.35-.74c.56-.16,1.22-.24,1.99-.24,1.26,0,2.17.19,2.73.57.56.38.91.88,1.04,1.48s.2,1.29.2,2.06v38.69c0,.76-.07,1.44-.2,2.02-.13.58-.5,1.07-1.08,1.45-.58.38-1.51.57-2.76.57Z"/>
              <path d="m83.27,48.46c-2.07,0-3.98-.37-5.73-1.11-1.75-.74-3.28-1.81-4.58-3.2-1.3-1.39-2.31-3.05-3.03-4.99-.72-1.93-1.08-4.07-1.08-6.4v-13.41c0-.76.08-1.45.24-2.06.16-.61.53-1.09,1.11-1.45.58-.36,1.48-.54,2.7-.54,1.3,0,2.23.18,2.8.54.56.36.91.85,1.04,1.48.13.63.2,1.33.2,2.09v13.34c0,1.62.28,3.01.84,4.18.56,1.17,1.38,2.08,2.46,2.73,1.08.65,2.4.98,3.98.98s2.99-.33,4.11-.98c1.12-.65,2-1.57,2.63-2.76.63-1.19.94-2.57.94-4.15v-13.41c0-.76.08-1.46.24-2.09.16-.63.52-1.11,1.08-1.45.56-.34,1.49-.51,2.8-.51s2.16.18,2.7.54c.54.36.89.85,1.04,1.48.16.63.24,1.33.24,2.09v25.21c0,.67-.08,1.3-.24,1.89-.16.58-.52,1.06-1.08,1.42-.56.36-1.47.54-2.73.54-.9,0-1.62-.1-2.16-.3s-.93-.47-1.18-.81c-.25-.34-.4-.68-.47-1.04-.07-.36-.1-.72-.1-1.08l.61-1.75c-.31.36-.74.82-1.28,1.38-.54.56-1.2,1.12-1.99,1.68-.79.56-1.69,1.02-2.7,1.38-1.01.36-2.15.54-3.4.54Z"/>
              <path d="m110.97,8.9c-1.35,0-2.33-.2-2.93-.61-.61-.4-.99-.94-1.15-1.62-.16-.67-.24-1.42-.24-2.22s.09-1.54.27-2.19c.18-.65.57-1.17,1.18-1.55.61-.38,1.58-.57,2.93-.57s2.31.2,2.9.61c.58.4.97.94,1.15,1.62.18.67.27,1.42.27,2.22s-.09,1.54-.27,2.19c-.18.65-.56,1.17-1.15,1.55-.58.38-1.57.57-2.97.57Zm0,39.63c-1.26,0-2.17-.19-2.73-.57-.56-.38-.91-.88-1.04-1.48-.13-.61-.2-1.29-.2-2.06v-25c0-.76.07-1.45.2-2.06s.49-1.09,1.08-1.45c.58-.36,1.5-.54,2.76-.54s2.17.18,2.73.54c.56.36.91.85,1.04,1.48.13.63.2,1.35.2,2.16v24.94c0,.76-.07,1.45-.2,2.06-.13.61-.48,1.09-1.04,1.45-.56.36-1.49.54-2.8.54Z"/>
              <path d="m126.34,48.53c-1.26,0-2.17-.19-2.73-.57-.56-.38-.91-.89-1.04-1.52-.13-.63-.2-1.32-.2-2.09v-25c0-.76.08-1.46.24-2.09.16-.63.52-1.11,1.08-1.45.56-.34,1.47-.51,2.73-.51s2.1.16,2.66.47c.56.31.92.72,1.08,1.21.16.49.24.94.24,1.35l-.54,1.21c.22-.36.54-.8.94-1.31.4-.52.94-1.03,1.62-1.55.67-.52,1.48-.94,2.43-1.28.94-.34,2.07-.51,3.37-.51.54,0,1.11.06,1.72.17.61.11,1.21.27,1.82.47.61.2,1.16.46,1.65.78.49.31.88.69,1.15,1.11.27.43.4.91.4,1.45,0,1.44-.36,2.65-1.08,3.64-.72.99-1.57,1.48-2.56,1.48-.67,0-1.17-.07-1.48-.2s-.57-.28-.78-.44c-.2-.16-.49-.3-.88-.44-.38-.14-.98-.2-1.79-.2-.67,0-1.36.11-2.06.34-.7.23-1.34.56-1.92,1.01-.58.45-1.06,1.01-1.42,1.69-.36.67-.54,1.46-.54,2.36v16.38c0,.76-.07,1.45-.2,2.06-.13.61-.49,1.09-1.08,1.45-.58.36-1.53.54-2.83.54Z"/>
              <path d="m154.31,48.53c-1.26,0-2.17-.19-2.73-.57-.56-.38-.91-.89-1.04-1.52-.13-.63-.2-1.32-.2-2.09v-25c0-.76.08-1.46.24-2.09.16-.63.52-1.11,1.08-1.45.56-.34,1.47-.51,2.73-.51s2.1.16,2.66.47c.56.31.92.72,1.08,1.21.16.49.24.94.24,1.35l-.54,1.21c.22-.36.54-.8.94-1.31.4-.52.94-1.03,1.62-1.55.67-.52,1.48-.94,2.43-1.28.94-.34,2.07-.51,3.37-.51.54,0,1.11.06,1.72.17.61.11,1.21.27,1.82.47s1.16.46,1.65.78c.49.31.88.69,1.15,1.11.27.43.4.91.4,1.45,0,1.44-.36,2.65-1.08,3.64-.72.99-1.57,1.48-2.56,1.48-.67,0-1.17-.07-1.48-.2-.32-.13-.57-.28-.78-.44-.2-.16-.5-.3-.88-.44-.38-.14-.98-.2-1.79-.2-.67,0-1.36.11-2.06.34-.7.23-1.34.56-1.92,1.01-.58.45-1.06,1.01-1.42,1.69-.36.67-.54,1.46-.54,2.36v16.38c0,.76-.07,1.45-.2,2.06-.13.61-.5,1.09-1.08,1.45-.58.36-1.53.54-2.83.54Z"/>
              <path d="m194.34,49c-2.92,0-5.48-.48-7.68-1.45-2.2-.97-4.02-2.27-5.46-3.91-1.44-1.64-2.53-3.48-3.27-5.53-.74-2.04-1.11-4.17-1.11-6.37,0-3.24.74-6.11,2.22-8.63,1.48-2.52,3.54-4.49,6.17-5.93,2.63-1.44,5.65-2.16,9.06-2.16,2.43,0,4.56.38,6.4,1.15,1.84.76,3.38,1.76,4.62,3,1.23,1.24,2.18,2.59,2.83,4.08.65,1.48.98,2.92.98,4.31,0,2.38-.57,4.11-1.72,5.19-1.15,1.08-2.57,1.62-4.28,1.62h-17.79c.04,1.53.53,2.85,1.45,3.98.92,1.12,2.09,1.99,3.5,2.59s2.86.91,4.35.91c1.12,0,2.11-.07,2.96-.2s1.59-.3,2.22-.51c.63-.2,1.19-.42,1.68-.64.49-.22.93-.43,1.31-.61.38-.18.75-.29,1.11-.34.54-.04,1.05.07,1.55.34.49.27.9.74,1.21,1.42.27.45.46.87.57,1.25.11.38.17.75.17,1.11,0,.9-.54,1.75-1.62,2.56-1.08.81-2.59,1.47-4.55,1.99-1.96.52-4.26.78-6.91.78Zm-9.03-19.41h13.82c.76,0,1.34-.12,1.72-.37.38-.25.57-.77.57-1.58,0-1.03-.31-1.95-.94-2.76-.63-.81-1.48-1.46-2.56-1.95-1.08-.49-2.31-.74-3.71-.74-1.66,0-3.17.34-4.52,1.01s-2.42,1.57-3.2,2.7c-.79,1.12-1.18,2.36-1.18,3.71Z"/>
              <path d="m226.15,48.53c-1.66,0-3.13-.11-4.41-.34-1.28-.23-2.38-.61-3.3-1.15-.92-.54-1.68-1.27-2.29-2.19-.61-.92-1.04-2.06-1.31-3.4s-.4-2.97-.4-4.85V4.18c0-.81.07-1.52.2-2.12s.49-1.1,1.08-1.48c.58-.38,1.5-.57,2.76-.57s2.17.18,2.73.54c.56.36.92.85,1.08,1.48.16.63.24,1.33.24,2.09v32.15c0,.85.06,1.56.17,2.12.11.56.31,1.01.61,1.35s.67.57,1.15.71c.47.13,1.04.2,1.72.2.58,0,1.11.07,1.58.2s.85.47,1.15,1.01c.29.54.44,1.42.44,2.63s-.15,2.18-.44,2.76c-.29.58-.69.94-1.18,1.08-.5.13-1.01.2-1.55.2Z"/>
            </svg>
          </div>
        </a>
      </div>
      
      <DesktopScreen
        url={url}
        onUrlChange={setUrl}
        onNavigate={handleNavigate}
        onHomeClick={() => {
          setUrl("");
          reset();
        }}
        isGenerating={isGenerating}
        isCached={state.cached}
        provider={provider}
        onProviderChange={setProvider}
      >
        <div className="w-full h-[460px]">
          {state.image ? (
            // Final image - highest priority
            <img
              src={`data:${state.mediaType};base64,${state.image}`}
              alt="Generated website visualization"
              className="w-full h-auto min-w-full"
              style={{
                display: "block",
                minHeight: "100%",
                objectFit: "contain",
                objectPosition: "top center",
              }}
            />
          ) : state.partialImages && state.partialImages.length > 0 ? (
            // Partial image - show the current one
            <img
              src={`data:${state.partialImages[0].mediaType};base64,${state.partialImages[0].base64}`}
              alt={`Partial image ${state.partialImages[0].partialIndex}`}
              className="w-full h-auto opacity-80"
              style={{
                display: "block",
                minHeight: "100%",
                objectFit: "contain",
                objectPosition: "top center",
              }}
            />
          ) : isGenerating &&
            (state.step === "checking_cache" ||
              state.step === "validating" ||
              state.step === "fetching" ||
              state.step === "fetched" ||
              state.step === "describing" ||
              state.step === "described" ||
              state.step === "generating") ? (
            // Loading screen while generating before any partial images arrive
            <div
              className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center"
              style={{ minHeight: "100%" }}
            >
              <div className="flex flex-col items-center justify-center space-y-6 p-8">
                {/* Modern loading spinner */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>

                {/* Loading text */}
                <div className="text-center space-y-2">
                  <p className="text-slate-700 text-2xl font-medium">
                    Generating website visualization...
                  </p>
                  <p className="text-slate-500 text-xl max-w-md mx-auto">
                    {state.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Browser splash screen - properly sized and designed
            <div className="w-full h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col p-4">
              {/* Header Section - Compact horizontal layout */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    GPT Browser
                  </h1>
                  <p className="text-sm text-gray-600">
                    AI-powered web visualization
                  </p>
                </div>
              </div>

              {/* Quick Access Section */}
              <div className="w-full max-w-2xl">
                <h2 className="text-xl font-semibold text-gray-700 text-center my-2">
                  Quick Access
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      handleNavigate("https://squirrelrecruit.com")
                    }
                    className="group relative bg-gradient-to-br from-purple-50 to-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-200 hover:border-purple-300 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <span className="text-white text-lg">🐿️</span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          Squirrel
                        </h3>
                        <p className="text-purple-600 text-md truncate">
                          squirrelrecruit.com
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate("https://xkcd.com/776/")}
                    className="group relative bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-300 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <span className="text-white text-lg">📊</span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          XKCD #776
                        </h3>
                        <p className="text-gray-500 text-md truncate">
                          Still No Sleep
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      handleNavigate("https://en.wikipedia.org/wiki/Squirrel")
                    }
                    className="group relative bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <span className="text-white text-lg">📚</span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          Wikipedia
                        </h3>
                        <p className="text-gray-500 text-md truncate">
                          Squirrel
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      handleNavigate(
                        "https://tenor.com/en-GB/view/sugarbush-sugar-nuts-squirrel-gif-17534167325502687818"
                      )
                    }
                    className="group relative bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <span className="text-white text-lg">🎬</span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          Tenor GIF
                        </h3>
                        <p className="text-gray-500 text-md truncate">
                          Sugar Squirrel
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DesktopScreen>
    </div>
  );
}
