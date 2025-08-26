import { put, head, type PutBlobResult } from '@vercel/blob';
import crypto from 'crypto';

export interface CachedImageResult {
  base64: string;
  mediaType: string;
  revisedPrompt?: string;
  cached: boolean;
  blobUrl?: string;
}

export interface CacheMetadata {
  originalUrl: string;
  timestamp: number;
  revisedPrompt?: string;
  mediaType: string;
}

/**
 * Generate a consistent cache key for a URL and provider using URL-encoded name + hash
 */
export function generateCacheKey(url: string, provider?: string): string {
  // Include provider in the hash to create unique keys per model
  const cacheInput = provider ? `${url}_${provider}` : url;
  
  // URL-encode the URL for the filename, but limit length and add hash for uniqueness
  const encodedUrl = encodeURIComponent(url)
    .replace(/[.*+?^${}()|[\]\\]/g, '_') // Replace regex special chars
    .substring(0, 100); // Limit length
  
  // Create a hash of the URL + provider for uniqueness
  const hash = crypto.createHash('sha256').update(cacheInput).digest('hex').substring(0, 16);
  
  // Include provider in filename if provided
  const providerSegment = provider ? `_${provider.replace(/[^a-zA-Z0-9-]/g, '_')}` : '';
  
  return `image-cache/${encodedUrl}${providerSegment}_${hash}.png`;
}

/**
 * Generate a metadata key for storing additional info about cached images
 */
export function generateMetadataKey(url: string, provider?: string): string {
  // Include provider in the hash to create unique keys per model
  const cacheInput = provider ? `${url}_${provider}` : url;
  
  // URL-encode the URL for the filename, but limit length and add hash for uniqueness
  const encodedUrl = encodeURIComponent(url)
    .replace(/[.*+?^${}()|[\]\\]/g, '_') // Replace regex special chars
    .substring(0, 100); // Limit length
  
  const hash = crypto.createHash('sha256').update(cacheInput).digest('hex').substring(0, 16);
  
  // Include provider in filename if provided
  const providerSegment = provider ? `_${provider.replace(/[^a-zA-Z0-9-]/g, '_')}` : '';
  
  return `image-metadata/${encodedUrl}${providerSegment}_${hash}.json`;
}

/**
 * Check if an image is cached in Vercel Blob storage
 */
export async function getCachedImage(url: string, provider?: string): Promise<CachedImageResult | null> {
  try {
    const imageKey = generateCacheKey(url, provider);
    const metadataKey = generateMetadataKey(url, provider);

    console.log(`🔍 Checking cache for URL: ${url}`);
    console.log(`🔍 Image key: ${imageKey}`);
    console.log(`🔍 Metadata key: ${metadataKey}`);

    // Check if both image and metadata exist
    const [imageExists, metadataExists] = await Promise.all([
      checkBlobExists(imageKey),
      checkBlobExists(metadataKey)
    ]);

    if (!imageExists || !metadataExists) {
      console.log(`❌ Cache miss for URL: ${url}`);
      return null;
    }

    console.log(`✅ Cache hit for URL: ${url}`);

    // Fetch both the image and metadata using the blob URLs from head() response
    const imageHeadResponse = await head(imageKey);
    const metadataHeadResponse = await head(metadataKey);
    
    // Fetch the actual content
    const [imageBlob, metadataBlob] = await Promise.all([
      fetch(imageHeadResponse.url),
      fetch(metadataHeadResponse.url)
    ]);

    if (!imageBlob.ok || !metadataBlob.ok) {
      console.log(`❌ Failed to fetch cached data for URL: ${url}`);
      return null;
    }

    const imageBuffer = await imageBlob.arrayBuffer();
    const metadata: CacheMetadata = await metadataBlob.json();

    // Convert to base64
    const base64 = Buffer.from(imageBuffer).toString('base64');

    return {
      base64,
      mediaType: metadata.mediaType,
      revisedPrompt: metadata.revisedPrompt,
      cached: true,
      blobUrl: imageHeadResponse.url,
    };
  } catch (error) {
    console.error(`❌ Error checking cache for ${url}:`, error);
    return null;
  }
}

/**
 * Store an image in Vercel Blob storage
 */
export async function cacheImage(
  url: string,
  imageData: {
    base64: string;
    mediaType: string;
    revisedPrompt?: string;
  },
  provider?: string
): Promise<void> {
  try {
    const imageKey = generateCacheKey(url, provider);
    const metadataKey = generateMetadataKey(url, provider);

    console.log(`💾 Caching image for URL: ${url}`);
    console.log(`💾 Image key: ${imageKey}`);
    console.log(`💾 Metadata key: ${metadataKey}`);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData.base64, 'base64');

    // Create metadata
    const metadata: CacheMetadata = {
      originalUrl: url,
      timestamp: Date.now(),
      revisedPrompt: imageData.revisedPrompt,
      mediaType: imageData.mediaType,
    };

    // Store both image and metadata in parallel
    const [imageResult, metadataResult] = await Promise.all([
      put(imageKey, imageBuffer, {
        contentType: imageData.mediaType,
        access: 'public',
        addRandomSuffix: false, // Use exact key for consistency
        allowOverwrite: true, // Allow overwriting existing blobs
      }),
      put(metadataKey, JSON.stringify(metadata), {
        contentType: 'application/json',
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true, // Allow overwriting existing blobs
      })
    ]);

    console.log(`✅ Successfully cached image for URL: ${url}`);
    console.log(`📄 Image blob URL: ${imageResult.url}`);
    console.log(`📄 Metadata blob URL: ${metadataResult.url}`);
  } catch (error) {
    console.error(`❌ Error caching image for ${url}:`, error);
    // Don't throw here - caching failures shouldn't break the main flow
  }
}

/**
 * Check if a blob exists (using HEAD request)
 */
async function checkBlobExists(key: string): Promise<boolean> {
  try {
    await head(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  totalCachedImages: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}

/**
 * Clear old cache entries (if needed for maintenance)
 * Note: This would require listing blobs, which might need additional permissions
 */
export async function clearOldCache(olderThanDays: number = 30): Promise<void> {
  // Implementation would depend on Vercel Blob's listing capabilities
  // For now, this is a placeholder
  console.log(`🧹 Cache cleanup would remove entries older than ${olderThanDays} days`);
}