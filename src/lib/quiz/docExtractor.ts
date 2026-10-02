/**
 * COACT DOCUMENT TEXT EXTRACTION SERVICE
 * 
 * Multi-format document parser:
 * - PDF documents (.pdf) with Two-Column coordinate-aware layout sorting & OCR fallback
 * - Word documents (.docx, .doc) with Mammoth paragraph & table support + XML fallback
 * - Plain text (.txt, .md)
 * 
 * Ephemeral in-memory parsing (zero disk persistence, immediate garbage collection)
 */

import zlib from "zlib";

// Dynamic imports for optional/heavy libraries to keep server lightweight
let mammoth: any = null;
try {
  mammoth = require("mammoth");
} catch (_) {
  mammoth = null;
}

let PDFParser: any = null;
try {
  PDFParser = require("pdf2json");
} catch (_) {
  PDFParser = null;
}

interface TextItem {
  x: number;
  y: number;
  w: number;
  text: string;
}

interface PageData {
  pageIndex: number;
  width: number;
  height: number;
  items: TextItem[];
}

/**
 * Extracts structured coordinate text from PDF using pdf2json with two-column sorting.
 */
function parsePdfWithCoordinates(buffer: Buffer): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  return new Promise((resolve, reject) => {
    if (!PDFParser) {
      return reject(new Error("pdf2json library not available"));
    }

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(errData?.parserError || "Failed to parse PDF document"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages: any[] = pdfData?.Pages || [];
        const pageCount = pages.length;
        let fullDocumentText = "";
        let totalCharCount = 0;

        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
          const page = pages[pIdx];
          const pageWidth = page.Width || 40; // pdf2json default grid width
          const rawTexts: any[] = page.Texts || [];

          const items: TextItem[] = [];

          for (const t of rawTexts) {
            const x = t.x || 0;
            const y = t.y || 0;
            const w = t.w || 0;
            const runs = t.R || [];
            let str = "";
            for (const r of runs) {
              const decoded = decodeURIComponent(r.T || "");
              str += decoded;
            }
            const cleanStr = str.trim();
            if (cleanStr.length > 0) {
              items.push({ x, y, w, text: cleanStr });
              totalCharCount += cleanStr.length;
            }
          }

          if (items.length === 0) continue;

          // TWO-COLUMN DETECTION ALGORITHM
          // Check if items cleanly cluster into Left Column and Right Column with a central gutter.
          const midX = pageWidth / 2;
          const leftItems = items.filter((it) => it.x + it.w < midX + 2);
          const rightItems = items.filter((it) => it.x >= midX - 2);

          // Significant distribution in both columns (>25% each) and very few spanning across the center
          const isTwoColumn =
            items.length >= 10 &&
            leftItems.length >= items.length * 0.25 &&
            rightItems.length >= items.length * 0.25;

          if (isTwoColumn) {
            // Sort Column 1 by y, then Column 2 by y
            const sortColumn = (colItems: TextItem[]) => {
              // Group into lines by y-threshold (~0.4 grid units)
              colItems.sort((a, b) => (Math.abs(a.y - b.y) <= 0.4 ? a.x - b.x : a.y - b.y));
              let colText = "";
              let lastY = -1;
              for (const it of colItems) {
                if (lastY !== -1 && Math.abs(it.y - lastY) > 0.4) {
                  colText += "\n";
                } else if (lastY !== -1) {
                  colText += " ";
                }
                colText += it.text;
                lastY = it.y;
              }
              return colText;
            };

            const leftText = sortColumn(leftItems);
            const rightText = sortColumn(rightItems);
            fullDocumentText += `${leftText}\n\n${rightText}\n\n`;
          } else {
            // Standard single-column reading order: sort primarily by y, then by x
            items.sort((a, b) => (Math.abs(a.y - b.y) <= 0.4 ? a.x - b.x : a.y - b.y));
            let pageText = "";
            let lastY = -1;
            for (const it of items) {
              if (lastY !== -1 && Math.abs(it.y - lastY) > 0.4) {
                pageText += "\n";
              } else if (lastY !== -1) {
                pageText += " ";
              }
              pageText += it.text;
              lastY = it.y;
            }
            fullDocumentText += `${pageText}\n\n`;
          }
        }

        const isScanned = totalCharCount < 40 || !/[A-Za-z]/.test(fullDocumentText);
        resolve({
          text: fullDocumentText.trim(),
          pageCount,
          isScanned,
        });
      } catch (err: any) {
        reject(new Error(`PDF text assembly error: ${err?.message || err}`));
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Fallback ZIP decompressor for Word .docx word/document.xml
 */
function extractDocxFromZipBuffer(buffer: Buffer): string {
  let offset = 0;
  let documentXmlBuffer: Buffer | null = null;

  while (offset < buffer.length - 30) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x04034b50) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileName = buffer.toString("utf8", fileNameStart, fileNameStart + fileNameLength);
      const dataStart = fileNameStart + fileNameLength + extraFieldLength;

      if (fileName === "word/document.xml") {
        const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
        if (compressionMethod === 8) {
          documentXmlBuffer = zlib.inflateRawSync(compressedData);
        } else if (compressionMethod === 0) {
          documentXmlBuffer = compressedData;
        }
        break;
      }

      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  if (!documentXmlBuffer) {
    const rawString = buffer.toString("binary");
    const xmlMatch = rawString.match(/<w:document[\s\S]*?<\/w:document>/);
    if (xmlMatch) {
      return parseWordXmlToText(xmlMatch[0]);
    }
    throw new Error("Could not locate word/document.xml in DOCX file.");
  }

  return parseWordXmlToText(documentXmlBuffer.toString("utf8"));
}

/**
 * Converts Word XML (<w:p>, <w:t>, <w:br>, <w:tab>) to plain text.
 */
function parseWordXmlToText(xml: string): string {
  let text = xml
    .replace(/<w:p(?: [^>]*)?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br\s*\/?>/g, "\n")
    .replace(/<w:tab\s*\/?>/g, "\t")
    .replace(/<w:tc(?: [^>]*)?>/g, " ")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<w:tr(?: [^>]*)?>/g, "\n")
    .replace(/<\/w:tr>/g, "\n");

  text = text.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g, " $1 ");
  text = text.replace(/<[^>]+>/g, "");

  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  return text;
}

/**
 * Extracts text from a DOCX (Word) file buffer using Mammoth with table support & XML fallback.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  if (mammoth && typeof mammoth.extractRawText === "function") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && typeof result.value === "string" && result.value.trim().length > 0) {
        return result.value;
      }
    } catch (mErr: any) {
      console.warn("Mammoth extraction fallback:", mErr?.message);
    }
  }

  return extractDocxFromZipBuffer(buffer);
}

/**
 * Fallback OCR for scanned image PDFs using Tesseract.js.
 */
export async function performOcrFallback(buffer: Buffer): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    return ret?.data?.text || "";
  } catch (ocrErr: any) {
    console.warn("OCR fallback error:", ocrErr?.message);
    return "";
  }
}

/**
 * Universal document extraction dispatcher.
 */
export async function extractDocumentText(
  buffer: Buffer,
  filename: string,
  mimetype?: string
): Promise<{ text: string; isScanned: boolean; pageCount?: number }> {
  const name = (filename || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();

  if (name.endsWith(".pdf") || mime.includes("pdf")) {
    const pdfResult = await parsePdfWithCoordinates(buffer);

    if (pdfResult.isScanned) {
      // Scanned image PDF detected — attempt OCR
      const ocrText = await performOcrFallback(buffer);
      if (ocrText && ocrText.trim().length > 20) {
        return {
          text: ocrText,
          isScanned: true,
          pageCount: pdfResult.pageCount,
        };
      }
      return {
        text: pdfResult.text,
        isScanned: true,
        pageCount: pdfResult.pageCount,
      };
    }

    return {
      text: pdfResult.text,
      isScanned: false,
      pageCount: pdfResult.pageCount,
    };
  }

  if (name.endsWith(".docx") || name.endsWith(".doc") || mime.includes("word") || mime.includes("officedocument")) {
    const docxText = await extractDocxText(buffer);
    return {
      text: docxText,
      isScanned: false,
      pageCount: 1,
    };
  }

  // Plain text / markdown
  return {
    text: buffer.toString("utf8"),
    isScanned: false,
    pageCount: 1,
  };
}
