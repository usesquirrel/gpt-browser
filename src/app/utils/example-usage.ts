import {
  cleanHTML,
  generateImageFromHTML,
  HTMLImageGenerator,
  ImageProviderFactory,
  SmartImageProvider,
} from "./index";

// Example 1: Basic HTML to image generation
async function basicExample() {
  const html = `
    <div>
      <h1>Welcome to My Site</h1>
      <p>This is a sample paragraph with some content.</p>
      <ul>
        <li>Feature 1</li>
        <li>Feature 2</li>
        <li>Feature 3</li>
      </ul>
    </div>
  `;

  const result = await generateImageFromHTML(html, {
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
  });

  console.log("Generated image:", {
    usedModel: result.usedModel,
    mediaType: result.mediaType,
    revisedPrompt: result.revisedPrompt,
  });

  return result.base64;
}

// Example 2: Clean large HTML before generating image
async function cleanAndGenerateExample() {
  const largeHTML = `<!-- Large HTML with lots of scripts and styles -->`;

  const result = await generateImageFromHTML(largeHTML, {
    model: "dall-e-3",
    cleanFirst: true,
    cleanMaxTokens: 4000,
    size: "1792x1024",
    quality: "hd",
  });

  console.log("Cleaning stats:", {
    originalSize: result.originalHTMLLength,
    cleanedSize: result.cleanedHTML?.length,
    reduction: `${Math.round(
      (1 - (result.cleanedHTML?.length || 0) / result.originalHTMLLength) * 100
    )}%`,
  });

  return result;
}

// Example 3: Using the HTMLImageGenerator class
async function classBasedExample() {
  const generator = new HTMLImageGenerator(["gpt-image-1", "dall-e-3"]);

  const html = "<h1>Hello World</h1>";
  
  const result = await generator.generateFromHTML(html, {
    size: "1024x1024",
    quality: "high",
  });

  return result;
}

// Example 4: Compare both models
async function compareModelsExample() {
  const generator = new HTMLImageGenerator();
  
  const html = `
    <article>
      <h1>Article Title</h1>
      <p>Some interesting content here...</p>
    </article>
  `;

  const results = await generator.compareModels(html, {
    size: "1024x1024",
    cleanFirst: true,
  });

  console.log("DALL-E 3 result:", results["dall-e-3"].usedModel);
  console.log("GPT-Image-1 result:", results["gpt-image-1"].usedModel);

  return results;
}

// Example 5: Using smart provider with fallback
async function smartProviderExample() {
  const smartProvider = new SmartImageProvider(["dall-e-3", "gpt-image-1"]);

  const prompt = "A beautiful landscape based on this HTML structure";
  
  const result = await smartProvider.generate(prompt, {
    size: "1024x1024",
    quality: "high",
  });

  console.log(`Successfully generated with: ${result.usedModel}`);
  return result;
}

// Example 6: Get provider information
function getProviderInfoExample() {
  const dalle3Info = ImageProviderFactory.getProviderInfo("dall-e-3");
  const gptImage1Info = ImageProviderFactory.getProviderInfo("gpt-image-1");

  console.log("DALL-E 3 capabilities:", dalle3Info);
  console.log("GPT-Image-1 capabilities:", gptImage1Info);

  return { dalle3Info, gptImage1Info };
}