import { posthogOpenAI } from "../lib/openai";

export type ImageSize = `${number}x${number}`;
export type ImageQuality = string;

export interface ImageGenerationOptions {
  size?: ImageSize;
  quality?: ImageQuality;
  seed?: number;
  stream?: boolean;
  partialImages?: number;
  distinctId?: string;
}

export interface ImageGenerationResult {
  base64: string;
  uint8Array: Uint8Array;
  mediaType: string;
  revisedPrompt?: string;
  isPartial?: boolean;
  partialIndex?: number;
}

export abstract class ImageProvider {
  abstract readonly modelName: string;
  abstract readonly supportedSizes: ReadonlyArray<ImageSize>;
  abstract readonly supportedQualities: ReadonlyArray<ImageQuality>;
  abstract readonly defaultSize: ImageSize;
  abstract readonly defaultQuality: ImageQuality;
  abstract readonly maxPromptLength: number;

  protected validateSize(size?: ImageSize): ImageSize {
    if (!size) return this.defaultSize;
    if (!this.supportedSizes.includes(size)) {
      console.warn(
        `Size "${size}" not supported for ${this.modelName}. Using default: ${this.defaultSize}`
      );
      return this.defaultSize;
    }
    return size;
  }

  protected validateQuality(quality?: ImageQuality): ImageQuality {
    if (!quality) return this.defaultQuality;
    if (!this.supportedQualities.includes(quality)) {
      console.warn(
        `Quality "${quality}" not supported for ${this.modelName}. Using default: ${this.defaultQuality}`
      );
      return this.defaultQuality;
    }
    return quality;
  }

  protected validatePrompt(prompt: string): string {
    if (prompt.length > this.maxPromptLength) {
      console.warn(
        `Prompt exceeds ${this.maxPromptLength} chars for ${this.modelName}. Truncating.`
      );
      return prompt.substring(0, this.maxPromptLength);
    }
    return prompt;
  }

  abstract generate(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult>;

  abstract generateStream(
    prompt: string,
    options?: ImageGenerationOptions
  ): AsyncGenerator<ImageGenerationResult, void, unknown>;
}

export class GPTImage1Provider extends ImageProvider {
  readonly modelName = "gpt-image-1" as const;
  readonly supportedSizes: ReadonlyArray<ImageSize> = [
    "1024x1024",
    "1024x1536",
    "1536x1024",
  ];
  readonly supportedQualities = ["low", "medium", "high", "auto"] as const;
  readonly defaultSize: ImageSize = "1024x1024"; // Changed to avoid mapping issues
  readonly defaultQuality = "high";
  readonly maxPromptLength = 32000;

  async generate(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const validatedPrompt = this.validatePrompt(prompt);
    const size = this.validateSize(options?.size);
    const quality = this.validateQuality(options?.quality);

    console.log("🖼️ GPT-Image-1 Generation Request:", {
      model: this.modelName,
      prompt: validatedPrompt.substring(0, 100) + "...",
      size,
      quality,
    });

    try {
      // For GPT-Image-1, use minimal parameters as it may not support all DALL-E parameters
      const requestParams = {
        model: this.modelName,
        prompt: validatedPrompt,
        size: size as any,
        n: 1,
      };

      console.log("🖼️ Making OpenAI API call with params:", requestParams);

      const response = await posthogOpenAI.images.generate(requestParams);

      console.log("🖼️ OpenAI API response:", {
        hasData: !!response.data,
        dataLength: response.data?.length,
        firstImageKeys: response.data?.[0] ? Object.keys(response.data[0]) : [],
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No image data returned from OpenAI");
      }

      const imageData = response.data[0];

      // Handle both b64_json and url response formats
      let base64Data: string;
      let revisedPrompt: string | undefined;

      if (imageData.b64_json) {
        base64Data = imageData.b64_json;
        revisedPrompt = imageData.revised_prompt;
      } else if (imageData.url) {
        console.log(
          "🖼️ Received image URL, fetching to convert to base64:",
          imageData.url
        );
        // Fetch the image from URL and convert to base64
        const imageResponse = await fetch(imageData.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        base64Data = Buffer.from(imageBuffer).toString("base64");
        revisedPrompt = imageData.revised_prompt;
      } else {
        throw new Error("No image data (b64_json or url) returned");
      }

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log(
        "🖼️ Successfully generated image, base64 length:",
        base64Data.length
      );

      return {
        base64: base64Data,
        uint8Array: bytes,
        mediaType: "image/png",
        revisedPrompt,
      };
    } catch (error) {
      console.error("🖼️ GPT-Image-1 generation failed:", error);
      throw new Error(
        `GPT-Image-1 generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async *generateStream(
    prompt: string,
    options?: ImageGenerationOptions
  ): AsyncGenerator<ImageGenerationResult, void, unknown> {
    const validatedPrompt = this.validatePrompt(prompt);
    const size = this.validateSize(options?.size);
    const partialImages = options?.partialImages ?? 2;

    console.log("🖼️ GPT-Image-1 Streaming Request:", {
      model: this.modelName,
      prompt: validatedPrompt.substring(0, 100) + "...",
      size,
      partialImages,
    });

    let lastPartialImage: ImageGenerationResult | null = null;

    try {
      const requestParams = {
        model: this.modelName,
        prompt: validatedPrompt,
        size: size as any,
        stream: true,
        partial_images: partialImages,
      };

      console.log(
        "🖼️ Making streaming OpenAI API call with params:",
        requestParams
      );

      const stream = (await posthogOpenAI.images.generate(
        requestParams
      )) as any;

      for await (const event of stream) {
        console.log("🖼️ Stream event:", {
          type: event.type,
          hasData: !!event.data,
          hasB64Json: !!(event as any).b64_json,
          keys: Object.keys(event),
        });

        if ((event as any).type === "image_generation.partial_image") {
          const base64Data = (event as any).b64_json;
          const partialIndex = (event as any).partial_image_index;

          console.log("🖼️ Received partial image:", {
            index: partialIndex,
            base64Length: base64Data?.length,
          });

          if (base64Data) {
            // Convert base64 to Uint8Array
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const partialResult = {
              base64: base64Data,
              uint8Array: bytes,
              mediaType: "image/png",
              isPartial: true,
              partialIndex,
            };

            lastPartialImage = partialResult; // Keep track of the last partial
            yield partialResult;
          }
        } else if ((event as any).type === "image_generation.image") {
          // Final image with actual image data
          const imageData = (event as any).data || event;
          let base64Data: string;
          let revisedPrompt: string | undefined;

          if (imageData.b64_json) {
            base64Data = imageData.b64_json;
            revisedPrompt = imageData.revised_prompt;
          } else if (imageData.url) {
            console.log(
              "🖼️ Received final image URL, fetching to convert to base64"
            );
            const imageResponse = await fetch(imageData.url);
            const imageBuffer = await imageResponse.arrayBuffer();
            base64Data = Buffer.from(imageBuffer).toString("base64");
            revisedPrompt = imageData.revised_prompt;
          } else {
            console.log("🖼️ Final image event but no image data found");
            continue;
          }

          console.log(
            "🖼️ Received final image, base64 length:",
            base64Data.length
          );

          // Convert base64 to Uint8Array
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          yield {
            base64: base64Data,
            uint8Array: bytes,
            mediaType: "image/png",
            revisedPrompt,
            isPartial: false,
          };
        } else if ((event as any).type === "image_generation.completed") {
          console.log(
            "🖼️ Stream completed - checking for final image data in completed event"
          );

          // Check if the completed event has image data
          const imageData = (event as any).data || event;
          if (imageData && (imageData.b64_json || imageData.url)) {
            let base64Data: string;
            let revisedPrompt: string | undefined;

            if (imageData.b64_json) {
              base64Data = imageData.b64_json;
              revisedPrompt = imageData.revised_prompt;
            } else if (imageData.url) {
              console.log(
                "🖼️ Received final image URL in completed event, fetching to convert to base64"
              );
              const imageResponse = await fetch(imageData.url);
              const imageBuffer = await imageResponse.arrayBuffer();
              base64Data = Buffer.from(imageBuffer).toString("base64");
              revisedPrompt = imageData.revised_prompt;
            } else {
              base64Data = "";
            }

            if (base64Data) {
              console.log(
                "🖼️ Found final image in completed event, base64 length:",
                base64Data.length
              );

              // Convert base64 to Uint8Array
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              yield {
                base64: base64Data,
                uint8Array: bytes,
                mediaType: "image/png",
                revisedPrompt,
                isPartial: false,
              };
            }
          } else if (lastPartialImage) {
            // If no final image in completed event, use the last partial as final
            console.log(
              "🖼️ No final image in completed event, promoting last partial to final image"
            );
            yield {
              ...lastPartialImage,
              isPartial: false, // Convert partial to final
            };
          } else {
            console.log("🖼️ Stream completed but no image data available");
          }

          return; // Always exit after completed event
        }
      }
    } catch (error) {
      console.error("🖼️ GPT-Image-1 streaming failed:", error);
      throw new Error(
        `GPT-Image-1 streaming failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export class ImageProviderFactory {
  private static providers = new Map<string, ImageProvider>([
    ["gpt-image-1", new GPTImage1Provider()],
  ]);

  static getProvider(modelName: string): ImageProvider {
    const provider = this.providers.get(modelName);
    if (!provider) {
      throw new Error(`Unknown image model: ${modelName}`);
    }
    return provider;
  }

  static getAllProviders(): Map<string, ImageProvider> {
    return new Map(this.providers);
  }

  static getProviderInfo(modelName: string): {
    modelName: string;
    supportedSizes: ReadonlyArray<ImageSize>;
    supportedQualities: ReadonlyArray<ImageQuality>;
    maxPromptLength: number;
  } {
    const provider = this.getProvider(modelName);
    return {
      modelName: provider.modelName,
      supportedSizes: provider.supportedSizes,
      supportedQualities: provider.supportedQualities,
      maxPromptLength: provider.maxPromptLength,
    };
  }
}

export class SmartImageProvider {
  private fallbackChain: ImageProvider[];

  constructor(preferredModels: string[] = ["gpt-image-1"]) {
    this.fallbackChain = preferredModels.map((model) =>
      ImageProviderFactory.getProvider(model)
    );
  }

  async generate(
    prompt: string,
    options?: ImageGenerationOptions & { preferredModel?: string }
  ): Promise<ImageGenerationResult & { usedModel: string }> {
    let providers = [...this.fallbackChain];

    if (options?.preferredModel) {
      const preferred = ImageProviderFactory.getProvider(
        options.preferredModel
      );
      providers = [preferred, ...providers.filter((p) => p !== preferred)];
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`Attempting image generation with ${provider.modelName}`);
        const result = await provider.generate(prompt, options);
        return {
          ...result,
          usedModel: provider.modelName,
        };
      } catch (error) {
        console.error(
          `Failed with ${provider.modelName}:`,
          error instanceof Error ? error.message : String(error)
        );
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error("All image providers failed");
  }

  selectOptimalProvider(prompt: string): ImageProvider {
    // Always use GPT-Image-1
    return ImageProviderFactory.getProvider("gpt-image-1");
  }
}
