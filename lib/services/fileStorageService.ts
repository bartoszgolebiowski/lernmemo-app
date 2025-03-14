import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

export class FileStorageService {
  private tempDir: string;

  constructor() {
    // Use custom temp directory or default to OS temp directory with a subfolder
    this.tempDir = path.join(os.tmpdir(), "lernmemo-app-temp");
  }

  /**
   * Saves a File object to a temporary directory
   * @param file The file to save
   * @param originalFilename Optional original filename to preserve
   * @returns The path to the saved file
   */
  async saveToTemp(file: File): Promise<string> {
    // Ensure temp directory exists
    await this.ensureTempDirectoryExists();

    // Generate a unique filename if one is not provided
    const filename = `${uuidv4()}-${file.name}`;
    const filePath = path.join(this.tempDir, filename);

    // Convert File to Buffer and save it
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  async toFile(content: string, filename: string): Promise<File> {
    const buffer = Buffer.from(content);
    return new File([buffer], filename);
  }

  async toString(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString();
  }

  /**
   * Ensures the temporary directory exists, creating it if necessary
   */
  private async ensureTempDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }
}

/**
 * Creates and returns a new FileStorageService instance
 */
export function createFileStorageService(): FileStorageService {
  return new FileStorageService();
}
