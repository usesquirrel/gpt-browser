"use client";

import { useState, useEffect } from "react";
import { useImageGeneration } from "./hooks/useImageGeneration";
import DesktopScreen from "./components/DesktopScreen";
import { usePostHog } from "posthog-js/react";
import { testPostHogObservability } from "./actions/test-posthog";

export default function Home() {
  const [url, setUrl] = useState("");
  const { state, isGenerating, generateImage, reset, cancel } =
    useImageGeneration();
  const posthog = usePostHog();

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
      cached: false, // Will be updated later if cached
      llm_observability_enabled: true,
    });

    // Cancel any ongoing generation before starting new one
    if (isGenerating) {
      cancel();
    }

    setUrl(newUrl);
    await generateImage(newUrl);
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
                    className="group relative bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <span className="text-white text-lg">🐿️</span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          SquirrelRecruit
                        </h3>
                        <p className="text-gray-500 text-md truncate">
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
                    className="group relative bg-white rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 hover:scale-102 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
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
