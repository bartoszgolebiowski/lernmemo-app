import { FileStorageService } from "./fileStorageService";

interface CacheEntry {
  url: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export class PresignedUrlCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number; // in seconds
  private fileStorageService: FileStorageService;

  constructor(
    fileStorageService: FileStorageService,
    ttlSeconds: number = 3600
  ) {
    this.fileStorageService = fileStorageService;
    this.ttl = ttlSeconds;
  }

  /**
   * Gets a presigned URL for any file type, with caching
   * @param userId The user ID
   * @param key The key of the file in R2
   * @returns A presigned URL for accessing the file
   */
  async getFile(key: string): Promise<string> {
    console.log(key)
    if (key.endsWith(".jpg") || key.endsWith(".png")) {
      return this.getImage(key);
    }
    if (key.endsWith(".csv")) {
      return this.getCSV(key);
    }
    throw new Error(`Unsupported file type: ${key}`);
  }

  /**
   * Gets a presigned URL for an image file, with caching
   * @param userId The user ID
   * @param key The key of the image in R2
   * @returns A presigned URL for accessing the image
   */
  async getImage(key: string): Promise<string> {
    const cacheKey = `image-${key}`;

    // Check if URL exists in cache
    const cachedUrl = this.get(cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Get from actual service
    const presignedUrl = await this.fileStorageService.getImage(key);

    // Cache the presigned URL
    this.set(cacheKey, presignedUrl);

    return presignedUrl;
  }

  /**
   * Gets a presigned URL for a CSV file, with caching
   * @param userId The user ID
   * @param key The key of the CSV in R2
   * @returns A presigned URL for accessing the CSV
   */
  async getCSV(key: string): Promise<string> {
    const cacheKey = `csv-${key}`;

    // Check if URL exists in cache
    const cachedUrl = this.get(cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Get from actual service
    const presignedUrl = await this.fileStorageService.getCSV(key);

    // Cache the presigned URL
    this.set(cacheKey, presignedUrl);

    return presignedUrl;
  }

  // Private cache methods
  private get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.url;
  }

  private set(key: string, url: string): void {
    const expiresAt = Date.now() + this.ttl * 1000;
    this.cache.set(key, { url, expiresAt });
  }

  /**
   * Clears expired entries from the cache
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Creates a new PresignedUrlCache with the given FileStorageService
 */
export function createPresignedUrlCache(
  fileStorageService: FileStorageService,
  ttlSeconds: number = 3600
): PresignedUrlCache {
  return new PresignedUrlCache(fileStorageService, ttlSeconds);
}
