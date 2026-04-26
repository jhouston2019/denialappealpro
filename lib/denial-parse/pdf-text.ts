import { PDFParse } from "pdf-parse";

export async function extractTextFromPdfBuffer(buf: ArrayBuffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    await parser.destroy();
    return (result.text || "").trim();
  } catch (e) {
    await parser.destroy().catch(() => {});
    throw e;
  }
}
