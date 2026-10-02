"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Plus,
  Check,
  ArrowRight,
  RefreshCw,
  X,
  FileQuestion,
  HelpCircle,
  Copy,
  Eye,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExtractedQuestion, ParseResult } from "@/lib/quiz/questionParser";

export interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Array<{ q: string; options: string[]; correct: number; time: number }>) => void;
  defaultTime?: number;
}

type TabMode = "upload" | "paste";

export function QuizImportModal({
  isOpen,
  onClose,
  onImportQuestions,
  defaultTime = 20,
}: QuizImportModalProps) {
  const [tab, setTab] = useState<TabMode>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Reading document...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted questions & preview state
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "ready" | "review">("all");
  const [stats, setStats] = useState<ParseResult["stats"] | null>(null);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setQuestions([]);
    setSelectedIds(new Set());
    setStats(null);
    setErrorMessage(null);
    setIsLoading(false);
    setPastedText("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Re-calculate statistics and update selected set
  const updateStatsAndSelection = (newQuestions: ExtractedQuestion[]) => {
    const total = newQuestions.length;
    const valid = newQuestions.filter((q) => q.status === "valid").length;
    const needs_review = newQuestions.filter((q) => q.status === "needs_review").length;
    const invalid = newQuestions.filter((q) => q.status === "invalid").length;
    const duplicates = newQuestions.filter((q) => q.isDuplicate).length;

    setStats({ total, valid, needs_review, invalid, duplicates });

    // Auto-select valid questions
    const validSet = new Set<string>();
    newQuestions.forEach((q) => {
      if (q.status === "valid") validSet.add(q.id);
    });
    setSelectedIds(validSet);
  };

  const processResponse = (data: any) => {
    if (!data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error(data.error || "No valid questions were extracted from this document.");
    }

    setQuestions(data.questions);
    updateStatsAndSelection(data.questions);
  };

  const uploadFile = async (file: File) => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingStage("Uploading document...");

    const stages = [
      "Analyzing document structure...",
      "Checking columns & reading order...",
      "Extracting questions & options...",
      "Matching answer keys...",
      "Validating questions...",
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length) {
        setLoadingStage(stages[stageIdx]);
        stageIdx++;
      }
    }, 800);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/quiz/extract", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse document.");
      }

      processResponse(data);
    } catch (err: any) {
      clearInterval(interval);
      setErrorMessage(err?.message || "Error reading file. Please verify the document format.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingStage("Parsing educational text...");

    try {
      const res = await fetch("/api/quiz/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse text.");
      }

      processResponse(data);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to parse pasted text.");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Preview modifications
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const next = new Set<string>();
    filteredQuestions.forEach((q) => {
      if (q.status !== "invalid") next.add(q.id);
    });
    setSelectedIds(next);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const setQuestionCorrect = (qIndex: number, optIndex: number) => {
    const next = [...questions];
    next[qIndex].correct = optIndex;
    // Re-check validity
    if (next[qIndex].q.trim() && next[qIndex].options.length >= 2) {
      next[qIndex].status = "valid";
      next[qIndex].issues = next[qIndex].issues.filter((i) => !i.includes("Correct answer"));
    }
    setQuestions(next);
    updateStatsAndSelection(next);
  };

  const updateQuestionText = (qIndex: number, text: string) => {
    const next = [...questions];
    next[qIndex].q = text;
    setQuestions(next);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const next = [...questions];
    next[qIndex].options[optIndex] = text;
    setQuestions(next);
  };

  const addOptionToQuestion = (qIndex: number) => {
    const next = [...questions];
    next[qIndex].options.push("");
    setQuestions(next);
  };

  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => {
    const next = [...questions];
    next[qIndex].options = next[qIndex].options.filter((_, i) => i !== optIndex);
    if (next[qIndex].correct === optIndex) {
      next[qIndex].correct = null;
      next[qIndex].status = "needs_review";
      if (!next[qIndex].issues.includes("Correct answer has not been selected.")) {
        next[qIndex].issues.push("Correct answer has not been selected.");
      }
    } else if (next[qIndex].correct !== null && next[qIndex].correct > optIndex) {
      next[qIndex].correct!--;
    }
    setQuestions(next);
    updateStatsAndSelection(next);
  };

  const deleteQuestion = (qIndex: number) => {
    const next = questions.filter((_, i) => i !== qIndex);
    setQuestions(next);
    updateStatsAndSelection(next);
  };

  // Perform Final Import
  const handleCommitImport = (onlySelected = false) => {
    const pool = onlySelected
      ? questions.filter((q) => selectedIds.has(q.id) && q.status === "valid")
      : questions.filter((q) => q.status === "valid");

    if (pool.length === 0) {
      setErrorMessage("No ready questions selected for import. Please ensure answers are selected.");
      return;
    }

    const formatted = pool.map((q) => ({
      q: q.q.trim(),
      options: q.options.map((o) => o.trim()),
      correct: q.correct !== null ? q.correct : 0,
      time: q.time || defaultTime,
    }));

    onImportQuestions(formatted);
    handleClose();
  };

  // Filtering
  const filteredQuestions = questions.filter((q) => {
    if (filter === "ready") return q.status === "valid";
    if (filter === "review") return q.status === "needs_review" || q.status === "invalid";
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl isolate animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A0E17] border border-white/15 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Import Question Bank
              </h2>
              <p className="text-xs text-white/50 font-medium">
                Extract questions automatically from PDF, Word documents, or text
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          
          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400/80 hover:text-red-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* VIEW 1: UPLOAD / PICK SCREEN */}
          {questions.length === 0 && !isLoading && (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit mx-auto">
                <button
                  onClick={() => setTab("upload")}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab === "upload"
                      ? "bg-cyan-500 text-black shadow-md"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Upload Document
                </button>
                <button
                  onClick={() => setTab("paste")}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab === "paste"
                      ? "bg-cyan-500 text-black shadow-md"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {tab === "upload" ? (
                <div>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                      isDragging
                        ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]"
                        : "border-white/15 bg-white/[0.02] hover:border-cyan-500/50 hover:bg-white/[0.04]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                      <Upload className="w-8 h-8" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">
                      Choose a file or drag & drop here
                    </h3>
                    <p className="text-xs text-white/50 max-w-sm mb-5 leading-relaxed font-medium">
                      Supports PDF, Microsoft Word (.docx, .doc), and plain text question banks up to 25MB.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/70">
                        📄 PDF (.pdf)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/70">
                        📝 Word (.docx, .doc)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/70">
                        📊 Two-Column Ready
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/70">
                        🔑 Auto Answer Key
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Paste question text here, for example:\n\n1. Which data structure follows FIFO?\nA. Stack\nB. Queue\nC. Tree\nD. Graph\nAnswer: B\n\n2. What is 2 + 2?\n(A) 3  (B) 4  (C) 5  (D) 6\nAns: B`}
                    rows={12}
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/15 p-4 text-sm font-mono text-white/90 placeholder:text-white/20 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all custom-scrollbar"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasteSubmit}
                      disabled={!pastedText.trim()}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 h-11 rounded-xl cursor-pointer"
                    >
                      Extract Questions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: LOADING PROGRESS STATE */}
          {isLoading && (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">{loadingStage}</h3>
                <p className="text-xs text-white/40 font-medium">
                  Normalizing questions, options, and answer keys...
                </p>
              </div>
            </div>
          )}

          {/* VIEW 3: INTERACTIVE PREVIEW & BULK ACTIONS */}
          {questions.length > 0 && !isLoading && (
            <div className="space-y-6">
              
              {/* Summary Stats Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white mr-2">
                    {stats?.total || questions.length} Questions Detected
                  </span>

                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filter === "all" ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    All ({questions.length})
                  </button>

                  <button
                    onClick={() => setFilter("ready")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filter === "ready"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-white/5 text-emerald-400/70 hover:text-emerald-300"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Ready ({stats?.valid || 0})
                  </button>

                  {(stats?.needs_review || 0) > 0 && (
                    <button
                      onClick={() => setFilter("review")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filter === "review"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-white/5 text-amber-400/70 hover:text-amber-300"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Needs Review ({stats?.needs_review || 0})
                    </button>
                  )}

                  {(stats?.duplicates || 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                      {stats?.duplicates} duplicates
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectedIds.size === filteredQuestions.length ? deselectAll : selectAll}
                    className="h-8 text-xs font-semibold border-white/10 text-white/70 hover:text-white"
                  >
                    {selectedIds.size === filteredQuestions.length ? "Deselect All" : "Select All"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="h-8 text-xs text-white/40 hover:text-white"
                  >
                    Upload Another
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => {
                  const actualIdx = questions.findIndex((orig) => orig.id === q.id);
                  const isSelected = selectedIds.has(q.id);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-white/[0.02] ${
                        q.status === "valid"
                          ? isSelected
                            ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                            : "border-white/10"
                          : q.status === "needs_review"
                          ? "border-amber-500/40 bg-amber-500/[0.02]"
                          : "border-red-500/40 bg-red-500/[0.02]"
                      }`}
                    >
                      {/* Top status bar of card */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(q.id)}
                            className="w-4 h-4 rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            Question {q.sourceQuestionNumber || idx + 1}
                          </span>

                          {q.status === "valid" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : q.status === "needs_review" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Needs Answer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Incomplete
                            </span>
                          )}

                          {q.isDuplicate && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Duplicate
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => deleteQuestion(actualIdx)}
                          className="text-white/30 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Issues banner */}
                      {q.issues.length > 0 && (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium space-y-0.5">
                          {q.issues.map((iss, iIdx) => (
                            <div key={iIdx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>{iss}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Question Text Input */}
                      <div className="mb-3">
                        <Input
                          value={q.q}
                          onChange={(e) => updateQuestionText(actualIdx, e.target.value)}
                          placeholder="Question text"
                          className="bg-white/5 border-white/10 text-white font-medium text-sm rounded-xl focus:border-cyan-500"
                        />
                      </div>

                      {/* Options List */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                          Options (Click letter to select correct answer):
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correct === optIdx;
                            const letter = String.fromCharCode(65 + optIdx);

                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                                  isCorrect
                                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setQuestionCorrect(actualIdx, optIdx)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all cursor-pointer ${
                                    isCorrect
                                      ? "bg-emerald-500 text-white shadow-md font-black"
                                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                                  }`}
                                  title={`Mark ${letter} as correct`}
                                >
                                  {isCorrect ? <Check className="w-4 h-4" /> : letter}
                                </button>

                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) =>
                                    updateOptionText(actualIdx, optIdx, e.target.value)
                                  }
                                  placeholder={`Option ${letter}`}
                                  className="w-full bg-transparent text-xs text-white focus:outline-none"
                                />

                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOptionFromQuestion(actualIdx, optIdx)}
                                    className="text-white/20 hover:text-red-400 p-1 text-xs shrink-0 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.options.length < 5 && (
                          <button
                            type="button"
                            onClick={() => addOptionToQuestion(actualIdx)}
                            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-[#0A0E17]/95">
          <div className="text-xs text-white/40 font-medium">
            {questions.length > 0
              ? `${selectedIds.size} of ${stats?.valid || 0} ready question(s) selected`
              : "Supports PDF and Word formats"}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-white/10 text-white/70 hover:text-white text-xs h-10 rounded-xl"
            >
              Cancel
            </Button>

            {questions.length > 0 && (
              <>
                <Button
                  onClick={() => handleCommitImport(true)}
                  disabled={selectedIds.size === 0}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs h-10 rounded-xl font-bold cursor-pointer disabled:opacity-40"
                >
                  Import Selected ({selectedIds.size})
                </Button>

                <Button
                  onClick={() => handleCommitImport(false)}
                  disabled={(stats?.valid || 0) === 0}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-xs h-10 px-5 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all cursor-pointer disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                  Import All Ready ({stats?.valid || 0})
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
