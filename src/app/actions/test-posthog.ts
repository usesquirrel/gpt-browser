"use server";

import { posthogOpenAI } from "../lib/openai";

export async function testPostHogObservability() {
  try {
    // console.log(
    //   "🔍 Testing PostHog LLM observability with hello world call..."
    // );
    // const response = await posthogOpenAI.chat.completions.create({
    //   model: "gpt-5-nano",
    //   messages: [
    //     {
    //       role: "user",
    //       content: 'Say "Hello World" and nothing else.',
    //     },
    //   ],
    // });
    // console.log(
    //   "✅ PostHog test call successful:",
    //   response.choices[0]?.message?.content
    // );
    // console.log("RESPONSE", response);
    // return {
    //   success: true,
    //   response: response.choices[0]?.message?.content || "No response",
    //   usage: response.usage,
    // };
  } catch (error) {
    console.error("❌ PostHog test call failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
