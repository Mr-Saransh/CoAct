/**
 * COACT QUIZ QUESTION EXTRACTION & NORMALIZATION ENGINE
 * 
 * Adapted and enhanced from proven Apni Vidya 2.0 deterministic parser:
 * 1. Unicode & whitespace normalization (smart quotes, dashes, fractions, linebreaks)
 * 2. Header/footer/garbage cleaning & noise reduction
 * 3. Standalone answer key detection (tables, answer sheets, 1. B, 1-C, Q1: D)
 * 4. Question boundary & numbering detection (single-line & multi-line headers, Q1., 1., (1), [1])
 * 5. Universal option extraction (stacked, 2x2 grid, horizontal inline, lowercase, bold answers)
 * 6. Duplicate question detection
 * 7. Question validation, issue tracking & confidence scoring
 */

export interface ExtractedQuestion {
  id: string;
  q: string;
  options: string[];
  correct: number | null; // 0-based index or null if unknown
  time: number;
  status: "valid" | "needs_review" | "invalid";
  issues: string[];
  isDuplicate?: boolean;
  confidence?: number;
  explanation?: string | null;
  sourceQuestionNumber?: number;
}

export interface ParseResult {
  questions: ExtractedQuestion[];
  stats: {
    total: number;
    valid: number;
    needs_review: number;
    invalid: number;
    duplicates: number;
  };
  metadata: {
    subject?: string;
    detectedAnswerKeyCount: number;
  };
}

/**
 * Strips markdown styling (headings, bold, italics, code backticks) while preserving content.
 */
export function cleanMarkdownFormatting(str: string): string {
  if (!str) return "";
  return str
    .replace(/^[ \t]*#{1,6}\s+/gm, "") // Strip markdown header hashes (#, ##, ###)
    .replace(/\*\*(.*?)\*\*/g, "$1") // Strip bold **text**
    .replace(/__(.*?)__/g, "$1") // Strip bold __text__
    .replace(/`([^`]+)`/g, "$1") // Strip backticks `code` -> code
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") // Strip single *italic*
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1") // Strip single _italic_
    .replace(/\*\*/g, "") // Remove dangling **
    .replace(/__/g, "") // Remove dangling __
    .trim();
}

/**
 * Normalizes raw document text by standardizing unicode, line endings, quotes, dashes, and bullets.
 * Also repairs words split across line-breaks by hyphens (e.g. "complex-\nity" -> "complexity").
 */
export function normalizeRawText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText
    // Standardize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove zero-width characters and BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Standardize quotes and apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036«»]/g, '"')
    // Standardize hyphens and dashes
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    // Standardize non-breaking spaces & full-width spaces
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    // Standardize bullets
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA\u25AB]/g, "•")
    // Standardize fractions
    .replace(/\u00BD/g, "1/2")
    .replace(/\u00BC/g, "1/4")
    .replace(/\u00BE/g, "3/4")
    // Repair hyphenated word wrap: "word-\nwrap" -> "wordwrap" (unless it's a list item)
    .replace(/([A-Za-z]{2,})-\n([A-Za-z]{2,})/g, "$1$2")
    // Standardize horizontal divider lines (---, ***, ___, ====)
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, "\n")
    .replace(/^[ \t]*[-=]{5,}[ \t]*$/gm, "\n");

  return text;
}

/**
 * Removes repeated document headers, footers, page numbering, and boilerplate exam instructions.
 */
export function cleanGarbageAndNoise(text: string): string {
  const lines = text.split("\n");
  const cleanedLines: string[] = [];

  const noisePatterns = [
    /^\s*(?:page|pg\.?)\s*\d+\s*(?:of|\/)\s*\d+\s*$/i,
    /^\s*(?:page|pg\.?)\s*\d+\s*$/i,
    /^\s*-\s*\d+\s*-\s*$/,
    /^\s*\[\s*page\s*\d+\s*\]\s*$/i,
    /^\s*(?:all\s+questions\s+are\s+compulsory|time\s*allowed\s*[:\-]|maximum\s*marks\s*[:\-]|total\s*marks\s*[:\-])/i,
    /^\s*(?:general\s+instructions|instructions\s*for\s*candidates|read\s*the\s*following\s*instructions)/i,
    /^\s*(?:question\s+bank|sample\s+paper|mock\s+test\s+series|practice\s+sheet|daily\s+practice\s+problem|dpp\s*[-:\d]*)\s*$/i,
    /^\s*(?:#+\s*)?(?:\d+\s+)?(?:multiple[\s\-]*choice|objective|single\s*correct)\s*questions?\s*[:\.]?\s*$/i,
    /^\s*(?:#+\s*)?(?:section|part)\s*[a-z0-9]+[\s:\-]+(?:\d+\s+)?(?:multiple[\s\-]*choice|objective|single\s*correct|questions?)?.*$/i,
    /^\s*(?:#+\s*)?(?:total\s*(?:no\.?\s*of\s*)?questions?|number\s*of\s*questions?)\s*[:\-]?\s*\d*\s*$/i,
    /^\s*(?:#+\s*)?(?:choose|select)\s+the\s+correct\s+(?:option|answer)\s*(?:from\s+the\s+following)?[:\.]?\s*$/i,
    /^\s*[-=_*~]{3,}\s*$/, // Horizontal rules
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      cleanedLines.push("");
      continue;
    }

    let isNoise = false;
    for (const pattern of noisePatterns) {
      if (pattern.test(line)) {
        isNoise = true;
        break;
      }
    }

    if (!isNoise) {
      cleanedLines.push(lines[i]);
    }
  }

  // Collapse multiple consecutive blank lines into double newline
  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Detects and extracts standalone answer key blocks (e.g. "Answer Key", "Answers: 1-A, 2-B, 3-C...").
 */
export function extractStandaloneAnswerKeys(text: string): {
  cleanedText: string;
  standaloneKeyMap: Record<number, number>;
} {
  const keyMap: Record<number, number> = {};

  const answerKeySectionRegex = /(?:^|\n+)[ \t]*(?:#{1,6}\s*)?(?:\*\*|__|\*|_)?\s*(?:ANSWER\s*KEYS?|ANSWERS?|SOLUTIONS?|KEY\s*SHEET|HINTS?\s*&\s*SOLUTIONS?|ANSWER\s*SHEET|CORRECT\s*ANSWERS?)\b(?:\*\*|__|\*|_)?[:\-]?\s*\n+([\s\S]+?)(?=(?:\n+[ \t]*(?:#{1,6}\s*)?(?:\*\*|__|\*|_)?\s*(?:Instructions?|Notes?|Directions?|End\s*of)\b)|$)/i;
  const match = text.match(answerKeySectionRegex);

  let cleanedText = text;

  if (match && match.index !== undefined) {
    const keySectionText = match[1];
    cleanedText = (text.substring(0, match.index) + "\n" + text.substring(match.index + match[0].length)).trim();

    // Parse: "1. A", "1) (b)", "1-C", "Q1: D", "Q4 = C", "5 - D", "1 -> B", "1.A 2.B", "1.(A)"
    const itemRegex = /(?:(?:Q(?:uestion|ue)?\.?\s*)?(\d+)[\.\:\)\-\=\>\s]+\(?([A-Ea-e1-5]|(?:[ivx]+))\)?)/gi;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(keySectionText)) !== null) {
      const qNum = parseInt(itemMatch[1], 10);
      const optChar = itemMatch[2].toUpperCase();
      let index: number | null = null;
      if (optChar >= "A" && optChar <= "E") {
        index = optChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
      } else if (optChar >= "1" && optChar <= "5") {
        index = parseInt(optChar, 10) - 1;
      } else {
        const romanMap: Record<string, number> = { "I": 0, "II": 1, "III": 2, "IV": 3, "V": 4 };
        if (romanMap[optChar] !== undefined) index = romanMap[optChar];
      }
      if (index !== null) {
        keyMap[qNum] = index;
      }
    }
  }

  return { cleanedText, standaloneKeyMap: keyMap };
}

/**
 * Extracts inline answer and explanation from a question text block.
 */
export function extractInlineAnswer(block: string): {
  answerIndex: number | null;
  answerRawText: string;
  cleanedBlock: string;
  explanation: string;
} {
  let answerIndex: number | null = null;
  let answerRawText = "";
  let explanation = "";
  let cleaned = block;

  // 1. Extract Explanation / Solution if present
  const expRegex = /(?:^|\n)\s*(?:Explanation|Solution|Sol|Exp|Hint|Reason)\s*[:\-.\s]\s*([\s\S]+)$/i;
  const expMatch = cleaned.match(expRegex);
  if (expMatch && expMatch.index !== undefined) {
    explanation = cleanMarkdownFormatting(expMatch[1]);
    cleaned = cleaned.substring(0, expMatch.index).trim();
  }

  // 2. Extract Inline Answer
  const ansPatterns = [
    /(?:^|\n|\s{2,}|\t)\s*(?:\*\*|__|\*|_)?\s*(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Right\s*Answer|Option)\s*[:\-.\s]\s*\(?([A-Ea-e1-5]|(?:[ivx]+))\)?(?:\s*[\.\:\-\–\=]\s*([^\n]*))?(?:\*\*|__|\*|_)?/i,
    /(?:^|\n)\s*\[\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-.\s]*([A-Ea-e1-5]|(?:[ivx]+))\s*\]/i,
    /(?:^|\n)\s*\(\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-.\s]*([A-Ea-e1-5]|(?:[ivx]+))\s*\)/i,
  ];

  for (const pattern of ansPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const char = match[1].toUpperCase();
      if (char >= "A" && char <= "E") {
        answerIndex = char.charCodeAt(0) - 65;
      } else if (char >= "1" && char <= "5") {
        answerIndex = parseInt(char, 10) - 1;
      } else {
        const romanMap: Record<string, number> = { "I": 0, "II": 1, "III": 2, "IV": 3, "V": 4 };
        if (romanMap[char] !== undefined) answerIndex = romanMap[char];
      }
      if (match[2] && !explanation) {
        explanation = cleanMarkdownFormatting(match[2]);
      }
      cleaned = cleaned.replace(match[0], "").trim();
      break;
    }
  }

  // 3. Fallback: "Ans: <Text>" where answer text is given directly
  if (answerIndex === null) {
    const directAnsMatch = cleaned.match(/(?:^|\n)\s*(?:Ans(?:wer)?|Correct\s*Option)\s*[:\-.\s]\s*([^\n]+)$/i);
    if (directAnsMatch) {
      answerRawText = cleanMarkdownFormatting(directAnsMatch[1]);
      cleaned = cleaned.replace(directAnsMatch[0], "").trim();
    }
  }

  return { answerIndex, answerRawText, cleanedBlock: cleaned, explanation };
}

/**
 * Cleans leading question prefixes and multi-line headers from question prompts.
 */
export function cleanQuestionPrompt(text: string): string {
  let cleaned = cleanMarkdownFormatting(text);
  cleaned = cleaned.replace(/^(?:(?:Q(?:uestion|ue)?\.?\s*)?\d+[\.\:\)\-\=\s]*)\s*/i, "");

  const topicMatch = cleaned.match(/^([A-Za-z0-9\s]{2,30})\n+([\s\S]+)$/);
  if (
    topicMatch &&
    !topicMatch[1].includes("?") &&
    !/^(what|which|how|why|when|where|who|is|are|can|could|calculate|find|solve|explain|define|state|evaluate)\b/i.test(topicMatch[1].trim())
  ) {
    cleaned = topicMatch[2].trim();
  }

  return cleaned.trim();
}

/**
 * Universal option extractor:
 * Handles stacked vertical, 2x2 grid, horizontal inline, paren/brackets, bold answers.
 */
export function extractOptions(block: string): {
  questionText: string;
  options: string[];
  boldAnswerIndex: number | null;
} {
  if (!block || typeof block !== "string") {
    return { questionText: "", options: [], boldAnswerIndex: null };
  }

  let boldAnswerIndex: number | null = null;

  const markerRegex = /(?:^|\n|\r|\t|(?<=\s))(?:\*\*|__|\*|_)?\s*(?:\(([A-Ea-e]|(?:[ivx]+)|[0-9]+)\)|\[([A-Ea-e]|(?:[ivx]+)|[0-9]+)\]|([A-Ea-e])\s*[\.\)\:\-]\s*|([0-9]+)\)\s*(?=[A-Za-z0-9]))\s*(?:\*\*|__|\*|_)?/g;

  interface Marker {
    startPos: number;
    endPos: number;
    label: string;
    rawMarker: string;
    index: number;
  }

  const markers: Marker[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(block)) !== null) {
    const rawLabel = (m[1] || m[2] || m[3] || m[4] || "").toUpperCase();
    const matchStr = m[0];
    const leadingWhitespaceLen = matchStr.search(/[^\s]/);
    const startPos = m.index + (leadingWhitespaceLen >= 0 ? leadingWhitespaceLen : 0);
    const markerLen = matchStr.length - (leadingWhitespaceLen >= 0 ? leadingWhitespaceLen : 0);

    markers.push({
      startPos,
      endPos: startPos + markerLen,
      label: rawLabel,
      rawMarker: matchStr.trim(),
      index: markers.length,
    });
  }

  if (markers.length < 2) {
    return { questionText: cleanQuestionPrompt(block), options: [], boldAnswerIndex: null };
  }

  const questionTextRaw = block.substring(0, markers[0].startPos).trim();
  const questionText = cleanQuestionPrompt(questionTextRaw);
  const options: string[] = [];

  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    const next = markers[i + 1];
    let optChunk = next
      ? block.substring(current.endPos, next.startPos).trim()
      : block.substring(current.endPos).trim();

    if (
      current.rawMarker.includes("**") ||
      current.rawMarker.includes("__") ||
      optChunk.startsWith("**") ||
      optChunk.startsWith("__") ||
      optChunk.includes("✓") ||
      optChunk.includes("[x]")
    ) {
      boldAnswerIndex = i;
    }

    if (!next) {
      optChunk = optChunk.split(/\n{2,}(?:[#*_\s]*(?:Note|Random\s*note|Instructions?|Disclaimer|Important|Some\s*extra|This\s*chapter|Page\s*\d+|End\s*of)\b|[-=*_]{3,})/i)[0].trim();
    }

    let cleanOpt = cleanMarkdownFormatting(optChunk);
    cleanOpt = cleanOpt.replace(/^[\.\:\-\s]+/, "").trim();
    if (cleanOpt.length > 0) {
      options.push(cleanOpt);
    }
  }

  if (options.length < 2) {
    return { questionText: cleanQuestionPrompt(block), options: [], boldAnswerIndex: null };
  }

  return { questionText, options, boldAnswerIndex };
}

/**
 * Splits raw document text into question candidate chunks based on numbered boundaries.
 */
export function splitIntoQuestionBlocks(text: string): Array<{
  qNum: number;
  rawBlock: string;
  topic?: string | null;
}> {
  const blocks: Array<{ qNum: number; rawBlock: string; topic?: string | null }> = [];

  const qHeadingRegex = /(?:^|\n+)[ \t]*(?:#{1,6}\s*)?(?:\*\*|__|\*|_)?\s*(?:(?:Q(?:uestion|ue)?\.?\s*)(\d+)[\.\:\)\-\=\s]*|(?:Q(?:uestion|ue)?\.?\s*)(\d+)\)|\[(\d+)\]\s*|(\d+)\.\s+)(?:\*\*|__|\*|_)?[:\s\-]*/gi;

  interface IndexItem {
    index: number;
    length: number;
    qNum: number;
    rawPrefix: string;
  }

  const indices: IndexItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = qHeadingRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1] || match[2] || match[3] || match[4], 10);
    indices.push({
      index: match.index,
      length: match[0].length,
      qNum: qNum || indices.length + 1,
      rawPrefix: match[0],
    });
  }

  if (indices.length === 0) {
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return paragraphs.map((p, idx) => ({ qNum: idx + 1, rawBlock: p, topic: null }));
  }

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    let blockContent = next
      ? text.substring(current.index, next.index)
      : text.substring(current.index);

    blockContent = blockContent
      .replace(/^[ \t]*(?:#{1,6}\s*)?(?:\*\*|__|\*|_)?\s*(?:(?:Q(?:uestion|ue)?\.?\s*)(\d+)[\.\:\)\-\=\s]*|(?:Q(?:uestion|ue)?\.?\s*)(\d+)\)|\[(\d+)\]\s*|(\d+)\.\s+)(?:\*\*|__|\*|_)?[:\s\-]*/i, "")
      .trim();

    let topic: string | null = null;
    const topicHeaderMatch = blockContent.match(/^([A-Za-z0-9\s]{2,30})\n+([\s\S]+)$/);
    if (
      topicHeaderMatch &&
      !topicHeaderMatch[1].includes("?") &&
      !/^(what|which|how|why|when|where|who|is|are|can|could|calculate|find|solve|explain|define|state|evaluate)\b/i.test(topicHeaderMatch[1].trim())
    ) {
      const possibleTopic = topicHeaderMatch[1].trim();
      if (possibleTopic.length < 30) {
        topic = cleanMarkdownFormatting(possibleTopic);
        blockContent = topicHeaderMatch[2].trim();
      }
    }

    if (blockContent.length > 0) {
      blocks.push({
        qNum: current.qNum,
        rawBlock: blockContent,
        topic,
      });
    }
  }

  return blocks;
}

/**
 * Validates a normalized question object and generates a human-readable list of issues if invalid.
 */
export function validateQuestion(q: Partial<ExtractedQuestion>): {
  isValid: boolean;
  status: "valid" | "needs_review" | "invalid";
  issues: string[];
} {
  const issues: string[] = [];

  if (!q.q || q.q.trim().length === 0) {
    issues.push("Question text is missing or empty.");
  }

  if (!Array.isArray(q.options) || q.options.length < 2) {
    issues.push(`Found only ${q.options?.length || 0} option(s). At least 2 options are required.`);
  } else {
    const emptyIndices: string[] = [];
    q.options.forEach((opt, idx) => {
      if (!opt || opt.trim().length === 0) {
        emptyIndices.push(String.fromCharCode(65 + idx));
      }
    });
    if (emptyIndices.length > 0) {
      issues.push(`Option(s) ${emptyIndices.join(", ")} are empty.`);
    }

    const trimmedOpts = q.options.map((o) => o.trim().toLowerCase()).filter(Boolean);
    const uniqueOpts = new Set(trimmedOpts);
    if (uniqueOpts.size < trimmedOpts.length) {
      issues.push("Duplicate option values detected.");
    }
  }

  if (q.correct === null || q.correct === undefined) {
    issues.push("Correct answer has not been selected.");
  } else if (q.correct < 0 || (q.options && q.correct >= q.options.length)) {
    issues.push("Selected correct answer is out of bounds.");
  }

  if (!q.q || q.q.trim().length === 0 || !q.options || q.options.length < 2) {
    return {
      isValid: false,
      status: "invalid",
      issues,
    };
  }

  return {
    isValid: issues.length === 0,
    status: issues.length === 0 ? "valid" : "needs_review",
    issues,
  };
}

/**
 * Normalizes question text for duplicate detection.
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Main parser entrypoint.
 * Ingests raw educational text and produces structured, validated quiz questions.
 */
export function parseEducationalText(rawText: string, defaultTime = 20): ParseResult {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return {
      questions: [],
      stats: { total: 0, valid: 0, needs_review: 0, invalid: 0, duplicates: 0 },
      metadata: { detectedAnswerKeyCount: 0 },
    };
  }

  const normalized = normalizeRawText(rawText);
  const cleaned = cleanGarbageAndNoise(normalized);
  const { cleanedText, standaloneKeyMap } = extractStandaloneAnswerKeys(cleaned);
  const rawBlocks = splitIntoQuestionBlocks(cleanedText);

  const questions: ExtractedQuestion[] = [];
  let detectedSubject = "General";

  const subjectMatch = rawText.match(/(?:^|\n)\s*(?:Subject|Course|Module|Paper|Topic)\s*[:\-]\s*([^\n]+)/i);
  if (subjectMatch) {
    detectedSubject = cleanMarkdownFormatting(subjectMatch[1])
      .replace(/practice questions|sample paper|test paper/i, "")
      .trim() || "General";
  }

  for (let i = 0; i < rawBlocks.length; i++) {
    const { qNum, rawBlock, topic } = rawBlocks[i];
    const { answerIndex: inlineAnsIndex, answerRawText, cleanedBlock, explanation } = extractInlineAnswer(rawBlock);
    const { questionText, options, boldAnswerIndex } = extractOptions(cleanedBlock);

    if (
      (!options || options.length === 0) &&
      (!questionText || questionText.length < 5 || /^(instructions|random note|disclaimer|note)\b/i.test(questionText))
    ) {
      continue;
    }

    let finalCorrectIndex: number | null = null;
    if (standaloneKeyMap[qNum] !== undefined) {
      finalCorrectIndex = standaloneKeyMap[qNum];
    } else if (inlineAnsIndex !== null) {
      finalCorrectIndex = inlineAnsIndex;
    } else if (boldAnswerIndex !== null) {
      finalCorrectIndex = boldAnswerIndex;
    } else if (answerRawText && options.length > 0) {
      const matchIdx = options.findIndex((opt) => opt.toLowerCase().trim() === answerRawText.toLowerCase().trim());
      if (matchIdx >= 0) finalCorrectIndex = matchIdx;
    }

    const questionObj: ExtractedQuestion = {
      id: `q_${i + 1}_${Math.random().toString(36).substring(2, 9)}`,
      q: questionText,
      options: options.length >= 2 ? options : (options.length === 1 ? [options[0], ""] : ["", ""]),
      correct: finalCorrectIndex,
      time: defaultTime,
      status: "valid",
      issues: [],
      sourceQuestionNumber: qNum || i + 1,
      explanation: explanation || null,
      confidence: finalCorrectIndex !== null && options.length >= 2 ? 0.95 : 0.7,
    };

    const validation = validateQuestion(questionObj);
    questionObj.status = validation.status;
    questionObj.issues = validation.issues;

    questions.push(questionObj);
  }

  // Duplicate detection
  const seenTexts = new Map<string, number>();
  let duplicateCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const comp = normalizeForComparison(questions[i].q);
    if (!comp || comp.length < 10) continue;

    if (seenTexts.has(comp)) {
      questions[i].isDuplicate = true;
      if (!questions[i].issues.includes("Possible duplicate question detected.")) {
        questions[i].issues.push("Possible duplicate question detected.");
      }
      if (questions[i].status === "valid") {
        questions[i].status = "needs_review";
      }
      duplicateCount++;
    } else {
      seenTexts.set(comp, i);
    }
  }

  const total = questions.length;
  const valid = questions.filter((q) => q.status === "valid").length;
  const needs_review = questions.filter((q) => q.status === "needs_review").length;
  const invalid = questions.filter((q) => q.status === "invalid").length;

  return {
    questions,
    stats: {
      total,
      valid,
      needs_review,
      invalid,
      duplicates: duplicateCount,
    },
    metadata: {
      subject: detectedSubject,
      detectedAnswerKeyCount: Object.keys(standaloneKeyMap).length,
    },
  };
}
