"use client";

import { useState, useCallback, useRef } from "react";

export type GenerationStep = 
  | "idle"
  | "checking_cache"
  | "validating"
  | "validated"
  | "fetching"
  | "fetched"
  | "describing"
  | "described"
  | "generating"
  | "partial_image"
  | "completed"
  | "error";

export interface PartialImage {
  base64: string;
  mediaType: string;
  partialIndex: number;
}

export interface GenerationState {
  step: GenerationStep;
  message: string;
  image?: string;
  mediaType?: string;
  partialImages?: PartialImage[];
  error?: string;
  cached?: boolean;
  blobUrl?: string;
}

export function useImageGeneration() {
  const [state, setState] = useState<GenerationState>({
    step: "idle",
    message: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateImage = useCallback(
    async (url: string) => {
      // Cancel any existing generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsGenerating(true);
      setState({ step: "fetching", message: "Starting generation..." });

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";

        while (true) {
          // Check if request was aborted
          if (abortController.signal.aborted) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete SSE messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === "") continue; // Skip empty lines
            
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              
              if (data === "[DONE]") {
                setIsGenerating(false);
                return;
              }

              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.step === "partial_image") {
                    // Handle partial image - replace the current partial image
                    const newPartial: PartialImage = {
                      base64: parsed.image,
                      mediaType: parsed.mediaType,
                      partialIndex: parsed.partialIndex,
                    };
                    
                    setState(prevState => ({
                      ...prevState,
                      step: "partial_image",
                      message: parsed.message,
                      partialImages: [newPartial], // Only keep the latest partial image
                      image: undefined, // Clear any final image
                    }));
                  } else if (parsed.step === "completed") {
                    // Handle final image - clear partials and show final image
                    setState(prevState => ({
                      ...prevState,
                      step: "completed",
                      message: parsed.message,
                      image: parsed.image,
                      mediaType: parsed.mediaType,
                      revisedPrompt: parsed.revisedPrompt,
                      partialImages: undefined, // Clear partials when final image arrives
                    }));
                  } else {
                    // Handle other state updates normally
                    setState(prevState => ({
                      ...prevState,
                      ...parsed,
                    }));
                  }
                } catch (e) {
                  console.error("Failed to parse SSE data:", e, "Data:", data);
                }
              }
            }
          }
        }
      } catch (error) {
        // Don't show error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("Generation cancelled");
          // Reset to idle state when cancelled
          setState({ step: "idle", message: "", partialImages: undefined });
        } else {
          console.error("Generation error:", error);
          setState({
            step: "error",
            message: "Generation failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        setIsGenerating(false);
        // Clear abort controller reference if it's the current one
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  const cancel = useCallback(() => {
    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    // Cancel any ongoing generation
    cancel();
    setState({ step: "idle", message: "", partialImages: undefined });
  }, [cancel]);

  return {
    state,
    isGenerating,
    generateImage,
    reset,
    cancel,
  };
}

// Non-streaming version for simpler use cases
export function useSimpleImageGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    image: string;
    mediaType: string;
    revisedPrompt?: string;
    cached?: boolean;
    blobUrl?: string;
  } | null>(null);

  const generateImage = useCallback(
    async (url: string) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/generate-image", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Generation failed");
        }

        setResult(data);
      } catch (error) {
        console.error("Generation error:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    result,
    generateImage,
  };
}