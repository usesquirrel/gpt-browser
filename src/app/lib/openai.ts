import { OpenAI } from '@posthog/ai'
import { PostHog } from 'posthog-node'
import { openai as aiSDKOpenAI } from '@ai-sdk/openai'

// Create PostHog client
const phClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { 
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1, // Flush events immediately in serverless environment
    flushInterval: 0, // Don't batch events
  }
);

// Create OpenAI client with PostHog integration for direct API calls
export const posthogOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  posthog: phClient,
});

// Export AI SDK OpenAI provider (unfortunately can't inject PostHog directly)
// PostHog tracking will need to be manual for AI SDK calls
export const openai = aiSDKOpenAI;

// Export the PostHog client in case we need it elsewhere
export const posthogClient = phClient;

// Shutdown function to ensure all events are sent
export async function shutdownClients(): Promise<void> {
  await phClient.shutdown();
}

// Optional: Add process cleanup handlers
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    shutdownClients().catch(console.error);
  });
}