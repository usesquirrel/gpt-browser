"use client";

import { useState, useCallback } from "react";

export type GenerationStep = 
  | "idle"
  | "fetching"
  | "fetched"
  | "processing"
  | "processed"
  | "generating"
  | "completed"
  | "error";

export interface DualGenerationState {
  step: GenerationStep;
  message: string;
  htmlBasedImage?: {
    base64: string;
    mediaType: string;
    revisedPrompt?: string;
  };
  descriptionBasedImage?: {
    base64: string;
    mediaType: string;
    revisedPrompt?: string;
  };
  imagePrompt?: string;
  error?: string;
  stats?: {
    originalHTMLLength: number;
    cleanedHTMLLength: number;
    promptLength: number;
    totalTime: number;
    fetchTime: number;
    processingTime: number;
    imageTime: number;
  };
}

export function useDualImageGeneration() {
  const [state, setState] = useState<DualGenerationState>({
    step: "idle",
    message: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDualImages = useCallback(
    async (url: string) => {
      setIsGenerating(true);
      setState({ step: "fetching", message: "Starting dual generation..." });

      try {
        const response = await fetch("/api/generate-image-dual", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
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
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete SSE messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === "") continue;
            
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              
              if (data === "[DONE]") {
                setIsGenerating(false);
                return;
              }

              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  setState(parsed);
                } catch (e) {
                  console.error("Failed to parse SSE data:", e, "Data:", data);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Generation error:", error);
        setState({
          step: "error",
          message: "Generation failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ step: "idle", message: "" });
  }, []);

  return {
    state,
    isGenerating,
    generateDualImages,
    reset,
  };
}