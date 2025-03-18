import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export class LocalFileStorageService {
  /**
   * Creates a File object from string content
   * @param content The string content
   * @param filename The desired filename
   * @returns File object
   */
  async toFile(content: string, filename: string): Promise<File> {
    const buffer = Buffer.from(content);
    return new File([buffer], filename);
  }

  /**
   * Converts a File to string
   * @param file The file to convert
   * @returns The string content of the file
   */
  async toString(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString();
  }

  /**
   * Saves a File object to a temporary location on the filesystem
   * @param file The file to save
   * @param prefix Optional filename prefix for the temporary file
   * @returns Path to the temporary file
   */
  async saveToTemp(file: File, prefix: string = 'lernmemo-'): Promise<string> {
    // Create a unique temporary filename
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${prefix}${Date.now()}-${file.name}`);
    
    // Convert File to buffer and write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write the buffer to the temporary file
    await fs.writeFile(tempFilePath, buffer);
    
    return tempFilePath;
  }

  /**
   * Saves a string to a temporary file
   * @param content The string content to save
   * @param extension The file extension to use (e.g., '.csv', '.txt')
   * @param prefix Optional filename prefix for the temporary file
   * @returns Path to the temporary file
   */
  async saveStringToTemp(content: string, extension: string, prefix: string = 'lernmemo-'): Promise<string> {
    // Create a unique temporary filename
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${prefix}${Date.now()}${extension}`);
    
    // Write the string content to the temporary file
    await fs.writeFile(tempFilePath, content, 'utf8');
    
    return tempFilePath;
  }
}

/**
 * Creates and returns a new FileStorageService instance
 */
export function createLocalFileStorageService(): LocalFileStorageService {
  return new LocalFileStorageService();
}
