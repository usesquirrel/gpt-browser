import { posthogOpenAI } from "../lib/openai";

export async function describeHTML(
  htmlContent: string,
  maxOutputTokens: number = 2000
): Promise<string> {
  const response = await posthogOpenAI.chat.completions.create({
    model: "gpt-5-nano",
    max_completion_tokens: maxOutputTokens,
    messages: [
      {
        role: "system",
        content: `<role>
You are a visual design analyzer that describes exactly what a website looks like when rendered in a browser.
</role>

<task>
Analyze the provided HTML and describe in vivid detail what the rendered website would look like visually.
</task>

<important-instructions>
- Focus ONLY on visual appearance, not code or technical details
- Describe layout, colors, typography, spacing, and visual hierarchy
- Be specific about positioning (top, center, left-aligned, etc.)
- Mention actual text content that would be visible
- Describe images/media as placeholder boxes if no actual images
- Include details about buttons, links, forms, and interactive elements
- Describe the visual flow from top to bottom
- Use descriptive language a designer would understand
</important-instructions>

<format>
Start with the overall layout, then describe each section from top to bottom:
- Header/Navigation
- Hero/Main content area  
- Body sections
- Footer

Be specific about colors, sizes, alignment, and visual styling.
</format>

<constraints>
Maximum ${maxOutputTokens} tokens. Be concise but visually descriptive.
</constraints>`,
      },
      {
        role: "user",
        content: htmlContent,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateImagePromptFromHTML(
  htmlContent: string,
  distinctId: string = "anonymous"
): Promise<string> {
  try {
    const response = await posthogOpenAI.chat.completions.create({
      model: "gpt-5-nano",
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content: `<role>
You are an expert at creating detailed image generation prompts based on website designs.
</role>

<task>
Analyze the HTML and create a detailed prompt for an AI image generator to recreate the website's visual appearance.
</task>

<instructions>
1. Start with the overall layout and color scheme
2. Describe the header/navigation bar in detail
3. Describe the main content sections with specific details
4. Include actual visible text content
5. Describe buttons, links, and interactive elements
6. Mention spacing, alignment, and visual hierarchy
7. Include footer details
</instructions>

<style-guide>
- Use clear, descriptive language
- Be specific about colors (e.g., "navy blue" not just "blue")
- Mention sizes relatively (large heading, small text, etc.)
- Describe positioning clearly (centered, left-aligned, etc.)
- Include visual effects (shadows, gradients, borders)
</style-guide>

<output-format>
Write a single flowing paragraph that an image AI can use to generate the website layout.
Start with: "A website design with..."
</output-format>`,
        },
        {
          role: "user",
          content: htmlContent,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";

    console.log("[describe-html] Input html length: ", htmlContent.length);
    console.log("[describe-html] Output text length: ", text.length);

    // Ensure we always return a valid prompt
    if (!text || text.trim().length === 0) {
      console.warn("Empty description generated, using fallback");
      return `A website design with a modern layout featuring a header navigation bar at the top, a main content area with text and sections, and a footer at the bottom. The page has a clean, professional appearance with structured content, headings, paragraphs, and standard web elements arranged in a typical website layout.`;
    }

    return text.trim();
  } catch (error) {
    console.error("Error generating image prompt from HTML:", error);

    // Return a fallback prompt if generation fails
    return `A website design with a modern layout featuring a header navigation bar at the top, a main content area with text and sections, and a footer at the bottom. The page has a clean, professional appearance with structured content, headings, paragraphs, and standard web elements arranged in a typical website layout.`;
  }
}
