import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/quiz/docExtractor";
import { parseEducationalText } from "@/lib/quiz/questionParser";

export const maxDuration = 60; // Allow up to 60s for document processing/OCR
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".md"];

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Handle JSON pasted text
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawText = body?.text || "";

      if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
        return NextResponse.json(
          { error: "No text content provided for extraction." },
          { status: 400 }
        );
      }

      const parseResult = parseEducationalText(rawText);

      return NextResponse.json({
        success: true,
        isScanned: false,
        questions: parseResult.questions,
        stats: parseResult.stats,
        metadata: {
          ...parseResult.metadata,
          filename: "Pasted Text",
          filesize: Buffer.byteLength(rawText, "utf8"),
        },
      });
    }

    // 2. Handle Multipart Form Data File Upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file was uploaded. Please upload a PDF or Word document." },
        { status: 400 }
      );
    }

    const filename = file.name || "document.pdf";
    const extension = "." + (filename.split(".").pop() || "").toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${extension}". Supported formats: PDF (.pdf), Microsoft Word (.docx, .doc), and text (.txt).`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB limit. Please upload a smaller file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from document buffer
    const { text, isScanned, pageCount } = await extractDocumentText(buffer, filename, file.type);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: isScanned
            ? "This document appears to be an unreadable scanned image PDF. Please upload a document with clear text."
            : "No readable text could be extracted from this document.",
        },
        { status: 400 }
      );
    }

    // Parse educational text into questions
    const parseResult = parseEducationalText(text);

    if (parseResult.questions.length === 0) {
      return NextResponse.json(
        {
          error: "No multiple choice questions were detected in the document. Please ensure questions are numbered (e.g., 1. or Q1.) with options (A, B, C, D).",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      isScanned,
      questions: parseResult.questions,
      stats: parseResult.stats,
      metadata: {
        ...parseResult.metadata,
        filename,
        filesize: file.size,
        pageCount,
      },
    });
  } catch (err: any) {
    console.error("[Quiz Extractor API] Error:", err?.message || err);
    return NextResponse.json(
      {
        error: err?.message || "An error occurred while processing the document. Please try again.",
      },
      { status: 500 }
    );
  }
}
