import { NextRequest, NextResponse } from "next/server";
import { fetchHTML } from "@/app/utils/fetch-html";
import { generateImagePromptFromHTML } from "@/app/utils/describe-html";
import { ImageProviderFactory } from "@/app/utils/image-providers";
import { validateURL } from "@/app/utils/validate-url";
import { getCachedImage, cacheImage } from "@/app/utils/image-cache";

export const runtime = 'nodejs';
export const maxDuration = 300; // Pro plan cap for Node.js Serverless

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { url } = body;
    const model = "gpt-image-1"; // Always use GPT-Image-1
    
    // Get distinctId from PostHog cookie or generate one
    const cookies = request.cookies;
    const distinctId = cookies.get('ph_posthog')?.value || 
                      request.headers.get('x-distinct-id') || 
                      `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let cancelled = false;

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Check if cancelled before each major operation
          if (cancelled) return;

          // Step 0: Check cache first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "checking_cache",
                message: "Checking image cache...",
              })}\n\n`
            )
          );

          const cachedResult = await getCachedImage(url);
          
          if (cachedResult && !cancelled) {
            console.log(`🎯 Cache hit for URL: ${url}`);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: "completed",
                  message: "Image loaded from cache",
                  image: cachedResult.base64,
                  mediaType: cachedResult.mediaType,
                  revisedPrompt: cachedResult.revisedPrompt,
                  cached: true,
                  blobUrl: cachedResult.blobUrl,
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          console.log(`🔍 Cache miss for URL: ${url}, generating new image`);

          // Step 1: Validate URL
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "validating",
                message: "Validating URL safety...",
              })}\n\n`
            )
          );

          const validation = await validateURL(url);

          // Check if cancelled after validation
          if (cancelled) {
            controller.close();
            return;
          }

          if (!validation.isValid) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: "error",
                  error: `URL validation failed: ${validation.reason}`,
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          if (validation.category === "potentially_unsafe") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: "validated",
                  message: `URL validated with warning: ${
                    validation.reason || "Proceeding with caution"
                  }`,
                })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: "validated",
                  message: "URL validated as safe",
                })}\n\n`
              )
            );
          }

          // Step 2: Fetch HTML
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

          // Check if cancelled after fetching HTML
          if (cancelled) {
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "fetched",
                message: `HTML fetched`,
              })}\n\n`
            )
          );

          // Step 3: Generate description from HTML
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "describing",
                message:
                  "Analyzing website structure and generating description...",
              })}\n\n`
            )
          );

          const describeStartTime = Date.now();
          const imagePrompt = await generateImagePromptFromHTML(html, distinctId);
          const describeTime = Date.now() - describeStartTime;

          // Check if cancelled after generating description
          if (cancelled) {
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "described",
                message: `Description generated`,
              })}\n\n`
            )
          );

          // Step 4: Generate image from description
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: "generating",
                message: `Generating image with ${model}...`,
              })}\n\n`
            )
          );

          const imageStartTime = Date.now();
          const provider = ImageProviderFactory.getProvider(model);

          // Use tall format for better website visualization (scrollable view)
          const size = "1024x1536";
          // Use streaming with partial images
          const streamGenerator = provider.generateStream(
            "Always generate the header and footer, and start at the top of the website described as follows: " +
              imagePrompt,
            {
              size: size as `${number}x${number}`,
              stream: true,
              partialImages: 3,
              distinctId,
            }
          );

          let finalImageSent = false;

          for await (const result of streamGenerator) {
            // Check if cancelled during streaming
            if (cancelled) {
              controller.close();
              return;
            }

            if (result.isPartial) {
              // Send partial image
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    step: "partial_image",
                    message: `Partial image ${result.partialIndex} received...`,
                    image: result.base64,
                    mediaType: result.mediaType,
                    isPartial: true,
                    partialIndex: result.partialIndex,
                  })}\n\n`
                )
              );
            } else {
              // Final image
              const imageTime = Date.now() - imageStartTime;

              // Cache the final image (don't wait for it to complete)
              cacheImage(url, {
                base64: result.base64,
                mediaType: result.mediaType,
                revisedPrompt: result.revisedPrompt,
              }).catch((error) => {
                console.error(`❌ Failed to cache image for ${url}:`, error);
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    step: "completed",
                    message: `Image generated successfully`,
                    image: result.base64,
                    mediaType: result.mediaType,
                    revisedPrompt: result.revisedPrompt,
                    timing: {
                      imageGeneration: `${imageTime}ms`,
                    },
                  })}\n\n`
                )
              );
              
              finalImageSent = true;
            }
          }

          // Ensure we always send completion event even if no final image was yielded
          if (!finalImageSent) {
            const imageTime = Date.now() - imageStartTime;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: "completed",
                  message: `Image generation completed`,
                  timing: {
                    imageGeneration: `${imageTime}ms`,
                  },
                })}\n\n`
              )
            );
          }

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
      cancel() {
        // This is called when the client disconnects
        cancelled = true;
        console.log('🚫 Stream cancelled by client');
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering on nginx/proxies
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in generate-image API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Alternative non-streaming version for simpler clients
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    const model = "gpt-image-1"; // Always use GPT-Image-1
    
    // Get distinctId from PostHog cookie or generate one
    const cookies = request.cookies;
    const distinctId = cookies.get('ph_posthog')?.value || 
                      request.headers.get('x-distinct-id') || 
                      `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Step 0: Check cache first
    const cachedResult = await getCachedImage(url);
    
    if (cachedResult) {
      console.log(`🎯 Cache hit for URL: ${url} (PUT endpoint)`);
      return NextResponse.json({
        success: true,
        image: cachedResult.base64,
        mediaType: cachedResult.mediaType,
        revisedPrompt: cachedResult.revisedPrompt,
        cached: true,
        blobUrl: cachedResult.blobUrl,
      });
    }

    console.log(`🔍 Cache miss for URL: ${url}, generating new image (PUT endpoint)`);

    // Step 1: Validate URL
    const validation = await validateURL(url);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: `URL validation failed: ${validation.reason}` },
        { status: 400 }
      );
    }

    // Step 2: Fetch HTML
    const html = await fetchHTML(url);

    // Step 3: Generate description from HTML
    const imagePrompt = await generateImagePromptFromHTML(html, distinctId);

    // Step 4: Generate image from description
    const provider = ImageProviderFactory.getProvider(model);

    // Use tall format for better website visualization (scrollable view)
    const size = "1024x1536";
    const result = await provider.generate(
      "Always generate the header and footer, and start at the top of the website described as follows: " +
        imagePrompt,
      {
        size: size as `${number}x${number}`,
        quality: "high",
        distinctId,
      }
    );

    // Cache the generated image (don't wait for it to complete)
    cacheImage(url, {
      base64: result.base64,
      mediaType: result.mediaType,
      revisedPrompt: result.revisedPrompt,
    }).catch((error) => {
      console.error(`❌ Failed to cache image for ${url} (PUT endpoint):`, error);
    });

    return NextResponse.json({
      success: true,
      image: result.base64,
      mediaType: result.mediaType,
      revisedPrompt: result.revisedPrompt,
    });
  } catch (error) {
    console.error("Error in generate-image API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
