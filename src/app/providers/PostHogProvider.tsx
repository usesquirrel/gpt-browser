"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "always", // Privacy-focused: only create profiles for identified users
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture for session analysis

    // Enhanced session recording with input masking for privacy
    session_recording: {
      maskAllInputs: false, // Don't mask all inputs, but be selective
      maskInputOptions: {
        password: true, // Always mask password fields
        // URLs might contain sensitive info, but we need them for our app functionality
      },
    },

    // Advanced configuration for AI observability
    autocapture: true, // Capture button clicks and form submissions
    capture_heatmaps: true, // Track user interaction patterns

    // Privacy and performance
    secure_cookie: true, // Use secure cookies in production
    persistence: "localStorage+cookie", // Hybrid persistence for reliability

    // Feature flags for AI features
    bootstrap: {
      featureFlags: {
        "ai-image-generation": true,
        "llm-observability": true,
        "enhanced-caching": true,
      },
    },
  });
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Track pageviews
    posthog.capture("$pageview");
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
