import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

export class FileStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    bucketName: string;
  }) {
    this.bucketName = config.bucketName;

    this.s3Client = new S3Client({
      region: "auto", // R2 uses "auto" region
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // R2 requires path-style requests.
    });
  }

  /**
   * Saves a File object to R2 storage
   * @param file The file to save
   * @returns The key of the saved file in R2
   */
  async save(userId: string, file: File): Promise<string> {
    // Generate a unique key for the file
    const key = `${userId}/${uuidv4()}-${file.name}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await this.s3Client.send(command);

    return key; // Return the key instead of file path
  }

  /**
   * Saves an image file to R2 storage
   * @param userId The user ID
   * @param file The image file to save
   * @returns The key of the saved file in R2
   */
  async saveImage(userId: string, file: File): Promise<string> {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    return this.save(userId, file);
  }

  /**
   * Saves a CSV file to R2 storage
   * @param userId The user ID
   * @param file The CSV file to save
   * @returns The key of the saved file in R2
   */
  async saveCSV(userId: string, file: File): Promise<string> {
    // Validate file is a CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      throw new Error('File is not a CSV');
    }
    
    return this.save(userId, file);
  }

  /**
   * Gets a presigned URL for an image file
   * @param userId The user ID
   * @param key The key of the image in R2
   * @returns A presigned URL for accessing the image
   */
  async getImage(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    // Generate a presigned URL that expires in 1 hour
    const presignedUrl = await getSignedUrl(this.s3Client, command, { 
      expiresIn: 3600 
    });

    return presignedUrl;
  }

  /**
   * Gets a presigned URL for a CSV file
   * @param userId The user ID
   * @param key The key of the CSV in R2
   * @returns A presigned URL for accessing the CSV
   */
  async getCSV(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    // Generate a presigned URL that expires in 1 hour
    const presignedUrl = await getSignedUrl(this.s3Client, command, { 
      expiresIn: 3600 
    });

    return presignedUrl;
  }
}

/**
 * Creates and returns a new FileStorageService instance
 */
export function createFileStorageService(config: {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
}): FileStorageService {
  return new FileStorageService(config);
}
