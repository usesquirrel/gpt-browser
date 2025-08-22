import { posthogOpenAI } from "../lib/openai";

export async function cleanHTML(
  htmlContent: string,
  maxOutputTokens: number = 8000,
  distinctId: string = 'anonymous'
): Promise<string> {
  try {
    const response = await posthogOpenAI.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: maxOutputTokens,
      messages: [
        {
          role: "system",
          content: `<role>
You are an HTML optimizer that creates a clean, simplified version of HTML while preserving its visual essence.
</role>

<important-rules>
<remove>
- All <script> tags, JavaScript code, tracking pixels, analytics
- All <link> tags for preloading, external resources, favicons  
- Meta tags, comments, data attributes, IDs that aren't styling-related
- Empty divs, spans, and containers that don't contribute to layout
</remove>

<keep>
- All visible text content, headings, paragraphs, lists
- Basic HTML structure (header, main, footer, nav, sections, articles)
- Essential styling (inline styles, important CSS classes for layout/appearance)
- Images, videos, and media elements (but remove data attributes)
- Keep image alt text
</keep>

<simplify>
- Complex nested structures where possible
- Preserve semantic HTML structure and hierarchy
</simplify>
</important-rules>

<instructions>
Focus on maintaining the visual layout and content that would be rendered on the page. Remove technical implementation details but keep the visual essence.
</instructions>

<constraints>
Stay under ${maxOutputTokens} tokens or about ${maxOutputTokens * 4} characters.
</constraints>

<output-format>
Output clean, well-structured HTML that captures the complete visual layout.
</output-format>`
        },
        {
          role: "user",
          content: htmlContent
        }
      ]
    });

    const text = response.choices[0]?.message?.content || "";

    console.log("[clean-html] Input html length: ", htmlContent.length);
    console.log("[clean-html] Output text length: ", text.length);

    // Ensure we never return empty HTML
    if (!text || text.trim().length === 0) {
      console.warn("Empty cleaned HTML generated, using fallback");
      // Return a minimal valid HTML structure
      return `<html><body><h1>Website Content</h1><p>The original HTML content could not be processed. This is a fallback representation.</p></body></html>`;
    }

    return text.trim();
  } catch (error) {
    console.error("Error cleaning HTML:", error);
    // Return a fallback HTML if cleaning fails
    return `<html><body><h1>Website Content</h1><p>Error processing HTML: ${
      error instanceof Error ? error.message : "Unknown error"
    }</p></body></html>`;
  }
}
