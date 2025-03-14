import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FileMetadataResponse,
  GoogleAIFileManager,
} from "@google/generative-ai/server";

import { env } from "../env";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
  }

  async uploadToGemini(path: string, mimeType: string) {
    const uploadResult = await this.fileManager.uploadFile(path, {
      mimeType,
      displayName: path,
    });
    const file = uploadResult.file;
    return file;
  }

  async waitForFilesActive(...files: FileMetadataResponse[]) {
    for (const name of files.map((file) => file.name)) {
      let file = await this.fileManager.getFile(name);
      while (file.state === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        file = await this.fileManager.getFile(name);
      }
      if (file.state !== "ACTIVE") {
        throw Error(`File ${file.name} failed to process`);
      }
    }
  }

  async imageToText(
    tmpFilePath: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      // Determine MIME type based on file extension or use a default
      // In a production environment, you'd want to detect this properly
      const mimeType = tmpFilePath.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";

      // Upload the image file to Gemini
      const file = await this.uploadToGemini(tmpFilePath, mimeType);
      await this.waitForFilesActive(file);

      const prompt = `
You are an advanced OCR and language processing assistant.
Your task is to analyze the provided image and extract all text that appears in ${targetLanguage} language.
Ignore any text in other languages, numbers, or symbols unless they are essential parts of words. 
Ensure the extracted text is accurate and preserves the original formatting as much as possible. 
Do not translate—only extract the text in its original form.
`;

      // Use the uploaded file in the model's generateContent method
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                fileData: { mimeType: file.mimeType, fileUri: file.uri },
              },
            ],
          },
        ],
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Failed to process image: ${error}`);
    }
  }

  async textToCsvFormat(text: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const prompt = `You are a multilingual language assistant. The input consists of extracted text in [TARGET LANGUAGE]. Your task is to process this text and create a structured CSV format with two columns: 'word' and 'translation'.

Extract only nouns, verbs, and adjectives from the text. Ignore other word types like conjunctions, pronouns, and prepositions.
Avoid duplicates—each word should appear only once.
Provide an accurate English translation for each word.
Format the output as a CSV with each word on a new line.

Output example:
word,translation
apple,Apfel
house,Haus

Ensure the output is clean and formatted correctly for CSV compatibility.
Please provide the output strictly as CSV in plain text. Do not include any markdown formatting, code fences (e.g., csv), or any additional commentary.
Input:
${text}`;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Failed to convert text to CSV format: ${error}`);
    }
  }
}

export function createGeminiService() {
  return new GeminiService(env.GEMINI_API_KEY);
}
