import { posthogOpenAI } from "../lib/openai";

export interface URLValidationResult {
  isValid: boolean;
  reason?: string;
  category?: "safe" | "potentially_unsafe" | "unsafe";
}

export async function validateURL(url: string): Promise<URLValidationResult> {
  try {
    // Basic URL format validation first
    try {
      new URL(url);
    } catch (error) {
      return {
        isValid: false,
        reason: "Invalid URL format",
        category: "unsafe",
      };
    }

    // Check for obviously unsafe patterns
    const unsafePatterns = [
      /localhost/i,
      /127\.0\.0\.1/i,
      /192\.168\./i,
      /10\./i,
      /172\.1[6-9]\./i,
      /172\.2[0-9]\./i,
      /172\.3[0-1]\./i,
      /file:/i,
      /ftp:/i,
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(url)) {
        return {
          isValid: false,
          reason: "URL points to private/local network or uses unsafe protocol",
          category: "unsafe",
        };
      }
    }

    // Use GPT-5-nano for content safety validation (faster and cheaper)
    const response = await posthogOpenAI.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `<role>
You are a URL safety validator for a web scraping service.
</role>

<task>
Analyze the provided URL and determine if it's safe to fetch for generating website images.
</task>

<safety-criteria>
UNSAFE URLs include:
- Adult/explicit content sites
- Malware/phishing sites
- Sites known for harmful content
- Private/internal network addresses
- File download URLs
- API endpoints that might cause harm
- Sites that typically block scraping aggressively

SAFE URLs include:
- Public business websites
- News sites
- Educational sites
- Government sites
- Documentation sites
- Portfolio/blog sites
- E-commerce sites (main pages)

POTENTIALLY_UNSAFE URLs include:
- Social media sites (may have mixed content)
- User-generated content platforms
- Sites with dynamic/unpredictable content
</safety-criteria>

<response-format>
Respond with exactly one of: SAFE, POTENTIALLY_UNSAFE, or UNSAFE
If POTENTIALLY_UNSAFE or UNSAFE, add a brief reason on the next line.
</response-format>

<examples>
https://example.com -> SAFE
https://github.com -> SAFE
https://malware-site.com -> UNSAFE
Malware distribution site
https://twitter.com -> POTENTIALLY_UNSAFE
Social media with mixed content
</examples>`,
        },
        {
          role: "user",
          content: url,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const lines = text.trim().split("\n");
    const verdict = lines[0].trim().toUpperCase();
    const reason = lines.length > 1 ? lines[1].trim() : undefined;

    switch (verdict) {
      case "SAFE":
        return {
          isValid: true,
          category: "safe",
        };
      case "POTENTIALLY_UNSAFE":
        return {
          isValid: true, // Allow but with warning
          reason: reason || "May contain mixed or user-generated content",
          category: "potentially_unsafe",
        };
      case "UNSAFE":
        return {
          isValid: false,
          reason: reason || "URL deemed unsafe for scraping",
          category: "unsafe",
        };
      default:
        console.warn(`Unexpected validation verdict: ${verdict}`);
        return {
          isValid: true, // Default to allow if unclear
          reason: "Validation result unclear, proceeding with caution",
          category: "potentially_unsafe",
        };
    }
  } catch (error) {
    console.error("Error validating URL:", error);
    // On validation error, allow but mark as potentially unsafe
    return {
      isValid: true,
      reason: "Could not validate URL safety, proceeding with caution",
      category: "potentially_unsafe",
    };
  }
}
