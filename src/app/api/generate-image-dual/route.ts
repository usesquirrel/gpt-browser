import { NextRequest, NextResponse } from "next/server";
import { fetchHTML } from "@/app/utils/fetch-html";
import { cleanHTML } from "@/app/utils/clean-html";
import { generateImagePromptFromHTML } from "@/app/utils/describe-html";
import { ImageProviderFactory } from "@/app/utils/image-providers";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { url } = body;
    const model = "gpt-image-1"; // Always use GPT-Image-1

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Fetch HTML
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "fetching",
                message: "Fetching HTML from URL...",
              })}\n\n`
            )
          );

          const startTime = Date.now();
          const html = await fetchHTML(url);
          const fetchTime = Date.now() - startTime;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "fetched",
                message: `HTML fetched (${html.length} chars, ${fetchTime}ms)`,
              })}\n\n`
            )
          );

          // Step 2: Process HTML in parallel
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "processing",
                message: "Processing HTML in two ways...",
              })}\n\n`
            )
          );

          const processingStartTime = Date.now();

          // Run both processes in parallel
          const [cleanedHTML, imagePrompt] = await Promise.all([
            // Path 1: Clean HTML for direct rendering
            (async () => {
              const maxTokens = 28000; // GPT-Image-1 has high token limit
              const cleaned = await cleanHTML(html, maxTokens);
              // Ensure cleaned HTML is not empty
              if (!cleaned || cleaned.trim().length === 0) {
                throw new Error("Failed to clean HTML - empty result");
              }
              return cleaned;
            })(),

            // Path 2: Generate descriptive prompt
            (async () => {
              const prompt = await generateImagePromptFromHTML(html);
              // Double-check prompt is not empty
              if (!prompt || prompt.trim().length === 0) {
                throw new Error(
                  "Failed to generate description - empty result"
                );
              }
              return prompt;
            })(),
          ]);

          const processingTime = Date.now() - processingStartTime;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "processed",
                message: `HTML processed both ways (${processingTime}ms)`,
                stats: {
                  cleanedLength: cleanedHTML.length,
                  promptLength: imagePrompt.length,
                },
              })}\n\n`
            )
          );

          // Step 3: Generate images in parallel
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "generating",
                message: `Generating both images with ${model}...`,
              })}\n\n`
            )
          );

          const imageStartTime = Date.now();
          const provider = ImageProviderFactory.getProvider(model);
          
          // Use tall format for better website visualization (scrollable view)
          const size = "1024x1536";
          const imageOptions = {
            size: size as `${number}x${number}`,
            quality: "high"
          };

          // Generate both images in parallel
          const [htmlBasedResult, descriptionBasedResult] = await Promise.all([
            // Image from cleaned HTML
            provider.generate(`<task>
Create a visual representation of this HTML content as it would appear rendered in a web browser.
</task>

<requirements>
- Render the layout and structure accurately
- Include all visible text content
- Maintain proper hierarchy and spacing
- Apply appropriate styling for headers, paragraphs, lists
- Show images as placeholder boxes with labels if present
- Use a clean, modern web design aesthetic
</requirements>

<html-content>
${cleanedHTML}
</html-content>`, imageOptions),

            // Image from description
            provider.generate(
              "Always generate the header and footer of the website described as follows: " +
                imagePrompt,
              imageOptions
            ),
          ]);

          const imageTime = Date.now() - imageStartTime;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "completed",
                message: `Both images generated successfully (${imageTime}ms)`,
                htmlBasedImage: {
                  base64: htmlBasedResult.base64,
                  mediaType: htmlBasedResult.mediaType,
                  revisedPrompt: htmlBasedResult.revisedPrompt,
                },
                descriptionBasedImage: {
                  base64: descriptionBasedResult.base64,
                  mediaType: descriptionBasedResult.mediaType,
                  revisedPrompt: descriptionBasedResult.revisedPrompt,
                },
                imagePrompt: imagePrompt,
                stats: {
                  originalHTMLLength: html.length,
                  cleanedHTMLLength: cleanedHTML.length,
                  promptLength: imagePrompt.length,
                  totalTime: Date.now() - startTime,
                  fetchTime,
                  processingTime,
                  imageTime,
                },
              })}\n\n`
            )
          );

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "error",
                error: errorMessage,
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in generate-image-dual API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
