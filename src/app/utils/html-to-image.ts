import { cleanHTML } from "./clean-html";
import {
  ImageProviderFactory,
  SmartImageProvider,
  type ImageGenerationOptions,
  type ImageGenerationResult,
} from "./image-providers";

export interface HTMLToImageOptions extends ImageGenerationOptions {
  model?: "dall-e-3" | "gpt-image-1";
  cleanFirst?: boolean;
  cleanMaxTokens?: number;
  fallbackEnabled?: boolean;
}

export interface HTMLToImageResult extends ImageGenerationResult {
  usedModel: string;
  cleanedHTML?: string;
  originalHTMLLength: number;
  finalPromptLength: number;
}

export async function generateImageFromHTML(
  htmlContent: string,
  options?: HTMLToImageOptions
): Promise<HTMLToImageResult> {
  const {
    model = "gpt-image-1",
    cleanFirst = true,
    cleanMaxTokens = 8000,
    fallbackEnabled = true,
    ...imageOptions
  } = options || {};

  const originalHTMLLength = htmlContent.length;
  let processedContent = htmlContent;

  // Step 1: Clean HTML if requested
  if (cleanFirst) {
    console.log(`Cleaning HTML (${originalHTMLLength} chars)...`);
    processedContent = await cleanHTML(htmlContent, cleanMaxTokens);
    console.log(`Cleaned HTML to ${processedContent.length} chars`);
  }

  // Step 2: Create prompt for image generation
  const imagePrompt = createImagePrompt(processedContent);

  // Step 3: Generate image
  if (fallbackEnabled) {
    const smartProvider = new SmartImageProvider([model, 
      model === "dall-e-3" ? "gpt-image-1" : "dall-e-3"
    ]);
    
    const result = await smartProvider.generate(imagePrompt, {
      ...imageOptions,
      preferredModel: model,
    });

    return {
      ...result,
      cleanedHTML: cleanFirst ? processedContent : undefined,
      originalHTMLLength,
      finalPromptLength: imagePrompt.length,
    };
  } else {
    const provider = ImageProviderFactory.getProvider(model);
    const result = await provider.generate(imagePrompt, imageOptions);

    return {
      ...result,
      usedModel: model,
      cleanedHTML: cleanFirst ? processedContent : undefined,
      originalHTMLLength,
      finalPromptLength: imagePrompt.length,
    };
  }
}

function createImagePrompt(htmlContent: string): string {
  return `<task>
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
${htmlContent}
</html-content>`;
}

export async function batchGenerateImagesFromHTML(
  htmlContents: string[],
  options?: HTMLToImageOptions
): Promise<HTMLToImageResult[]> {
  const results: HTMLToImageResult[] = [];
  
  for (let i = 0; i < htmlContents.length; i++) {
    console.log(`Generating image ${i + 1}/${htmlContents.length}...`);
    
    try {
      const result = await generateImageFromHTML(htmlContents[i], options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      throw error;
    }

    // Add delay between requests to avoid rate limiting
    if (i < htmlContents.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

export class HTMLImageGenerator {
  private smartProvider: SmartImageProvider;

  constructor(preferredModels: string[] = ["gpt-image-1", "dall-e-3"]) {
    this.smartProvider = new SmartImageProvider(preferredModels);
  }

  async generateFromHTML(
    htmlContent: string,
    options?: HTMLToImageOptions
  ): Promise<HTMLToImageResult> {
    return generateImageFromHTML(htmlContent, {
      ...options,
      fallbackEnabled: true,
    });
  }

  async generateFromURL(
    url: string,
    options?: HTMLToImageOptions
  ): Promise<HTMLToImageResult> {
    const response = await fetch(url);
    const htmlContent = await response.text();
    
    return this.generateFromHTML(htmlContent, options);
  }

  async compareModels(
    htmlContent: string,
    options?: Omit<HTMLToImageOptions, "model">
  ): Promise<{
    "dall-e-3": HTMLToImageResult;
    "gpt-image-1": HTMLToImageResult;
  }> {
    const [dalle3Result, gptImage1Result] = await Promise.all([
      generateImageFromHTML(htmlContent, { ...options, model: "dall-e-3" }),
      generateImageFromHTML(htmlContent, { ...options, model: "gpt-image-1" }),
    ]);

    return {
      "dall-e-3": dalle3Result,
      "gpt-image-1": gptImage1Result,
    };
  }
}