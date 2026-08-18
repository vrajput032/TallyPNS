import { PDFParse } from "pdf-parse";
import { ApiError } from "../../middleware/errorHandler.js";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";
    if (!text) {
      throw new ApiError(400, "Could not read any text from this PDF");
    }
    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Failed to read PDF. Try a clearer tax-invoice export.");
  } finally {
    await parser.destroy();
  }
}
