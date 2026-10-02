import React, { useState } from "react";
import { 
  DocumentSettings, 
  PageFormat, 
  PageOrientation, 
  PageMargins, 
  BlockType, 
  ShapeType,
  DocumentBlock,
  CollaboratorPresence,
  SHARED_PALETTE,
  FONT_SIZES,
  FONT_FAMILIES,
  QuoteData,
  QUOTE_PRESETS,
  QuotePresetStyle,
  CalloutData,
  CALLOUT_PRESETS,
  CalloutPresetType
} from "@/lib/types/document";
import { 
  Type, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Undo, 
  Redo, 
  FileText, 
  Settings2, 
  Users, 
  Check, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  GitCommit,
  Table as TableIcon,
  Maximize2,
  LayoutGrid,
  Rows,
  Quote as QuoteIcon,
  AlertCircle,
  MoreHorizontal,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentToolbarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  settings: DocumentSettings;
  onSettingsChange: (newSettings: Partial<DocumentSettings>) => void;
  canEdit: boolean;
  isHost: boolean;
  currentPageNumber: number;
  totalPages: number;
  onSelectPage: (pageNumber: number) => void;
  onAddPage: () => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onFitPage: () => void;
  collaborators: CollaboratorPresence[];
  syncStatus: "saved" | "syncing" | "offline";
  isExportingPdf: boolean;
  onExportPdf: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedBlock?: DocumentBlock | null;
  onUpdateBlock?: (blockId: string, updatedFields: Partial<DocumentBlock>) => void;
  onDeleteBlock?: (blockId: string) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onAutoLayout?: (type: 'stack' | 'horizontal' | 'grid' | 'diagram') => void;
  isMobile?: boolean;
  fitZoom?: number;
  onOpenToolbox?: () => void;
  onOpenProperties?: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  title,
  onTitleChange,
  settings,
  onSettingsChange,
  canEdit,
  isHost,
  currentPageNumber,
  totalPages,
  onSelectPage,
  onAddPage,
  zoom,
  onZoomChange,
  onFitPage,
  collaborators,
  syncStatus,
  isExportingPdf,
  onExportPdf,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  selectedBlock = null,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onAutoLayout,
  isMobile = false,
  fitZoom = 1.0,
  onOpenToolbox,
  onOpenProperties,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [showUsersMenu, setShowUsersMenu] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);

  // Contextual color popovers
  const [activeColorPicker, setActiveColorPicker] = useState<
    'none' | 'textColor' | 'highlightColor' | 'fillColor' | 'borderColor' | 'shapeTextColor' | 'quoteBg' | 'quoteAccent' | 'quoteText' | 'calloutBg' | 'calloutBorder' | 'calloutText'
  >('none');

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  // Helper: Is selected block a pure text element
  const isPureTextBlock = selectedBlock && [
    'text', 'heading', 'bullet', 'numbered', 'checklist'
  ].includes(selectedBlock.type);

  // Helper: Is selected block a quote
  const isQuoteBlock = selectedBlock && selectedBlock.type === 'quote';

  // Helper: Is selected block a callout
  const isCalloutBlock = selectedBlock && selectedBlock.type === 'callout';

  // Helper: Is selected block a visual shape
  const isShapeBlock = selectedBlock && selectedBlock.type === 'shape';

  // Helper: Is selected block an image
  const isImageBlock = selectedBlock && selectedBlock.type === 'image';

  // Helper: Is selected block a diagram
  const isDiagramBlock = selectedBlock && selectedBlock.type === 'diagram';

  // Helper: Is selected block a table
  const isTableBlock = selectedBlock && selectedBlock.type === 'table';

  // Helper: Update selected block style helper
  const updateStyle = (styleFields: any) => {
    if (!selectedBlock || !onUpdateBlock) return;
    onUpdateBlock(selectedBlock.id, {
      style: { ...(selectedBlock.style || {}), ...styleFields }
    });
  };

  // Helper: Update selected block content helper
  const updateContent = (contentFields: any) => {
    if (!selectedBlock || !onUpdateBlock) return;
    const current = typeof selectedBlock.content === 'object' && selectedBlock.content !== null
      ? selectedBlock.content
      : {};
    onUpdateBlock(selectedBlock.id, {
      content: { ...current, ...contentFields }
    });
  };

  // ========================================================
  // DUAL RESPONSIVE TOOLBAR ARCHITECTURE (MOBILE md:hidden & DESKTOP hidden md:flex)
  // ========================================================
  const isAtFitMobile = fitZoom ? Math.abs(zoom - fitZoom) < 0.03 : zoom <= 0.6;

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/98 backdrop-blur-2xl border-b border-slate-800 text-slate-100 select-none transition-all">
      {/* ========================================================
          MOBILE DEDICATED TOOLBAR (Visible on md:hidden screens)
          ======================================================== */}
      <div className="flex md:hidden flex-col w-full">
        {/* ROW 1: Compact Mobile Header */}
        <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 h-12">
          {/* Left: Title + Undo / Redo */}
          <div className="flex items-center gap-1.5 min-w-0">
            {isEditingTitle && canEdit ? (
              <input
                type="text"
                autoFocus
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setTempTitle(title);
                    setIsEditingTitle(false);
                  }
                }}
                className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-semibold text-white outline-none w-28"
              />
            ) : (
              <div 
                onClick={() => canEdit && setIsEditingTitle(true)}
                className="flex items-center gap-1 cursor-pointer truncate max-w-[85px] sm:max-w-[140px] text-xs font-bold text-white hover:text-blue-400"
                title={canEdit ? "Tap to rename document" : title}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{title || "Document"}</span>
              </div>
            )}

            {/* Compact Undo / Redo */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-slate-800 pl-1.5 shrink-0">
              {onUndo && (
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-25 transition-colors"
                  title="Undo"
                  aria-label="Undo"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
              )}
              {onRedo && (
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-25 transition-colors"
                  title="Redo"
                  aria-label="Redo"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: + Add, Export, Fit/Zoom, More */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 1. ADD / TOOLBOX TRIGGER (Prominent & Clear, Master Prompt Section 10) */}
            {canEdit && (
              <button
                onClick={onOpenToolbox}
                className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                title="Add Component (Toolbox)"
                aria-label="Add Component to Document"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}

            {/* 2. EXPORT PDF BUTTON (Clearly Accessible, Master Prompt Section 13) */}
            <button
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="h-8 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
              title="Export Document as PDF"
              aria-label="Export Document as PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">PDF</span>
                </>
              )}
            </button>

            {/* 3. FIT / ZOOM TOGGLE PILL (Master Prompt Section 5, 52, 53) */}
            <button
              onClick={onFitPage}
              className={`h-8 px-2 rounded-lg font-mono text-[11px] font-semibold border flex items-center gap-0.5 transition-all ${
                isAtFitMobile
                  ? 'bg-slate-800 text-blue-400 border-blue-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Fit Page / Zoom level"
              aria-label="Fit Page to Screen"
            >
              <Maximize2 className="w-3 h-3" />
              <span>{isAtFitMobile ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
            </button>

            {/* 4. MORE DROPDOWN MENU [ ⋯ ] */}
            <div className="relative">
              <button
                onClick={() => setShowMobileMoreMenu(prev => !prev)}
                className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors"
                title="More Actions & Settings"
                aria-label="More Actions and Settings"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMobileMoreMenu && (
                <div 
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                  onClick={() => setShowMobileMoreMenu(false)}
                />
              )}

              {showMobileMoreMenu && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-white">Document Settings</span>
                    <button 
                      onClick={() => setShowMobileMoreMenu(false)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Page Size */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Page Format</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['a4', 'letter', 'legal'] as PageFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => { onSettingsChange({ format: f }); setShowMobileMoreMenu(false); }}
                          className={`px-2 py-1 rounded uppercase font-semibold text-[10px] ${
                            settings.format === f 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Orientation</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['portrait', 'landscape'] as PageOrientation[]).map((o) => (
                        <button
                          key={o}
                          onClick={() => { onSettingsChange({ orientation: o }); setShowMobileMoreMenu(false); }}
                          className={`px-2 py-1 rounded capitalize font-medium text-[11px] ${
                            settings.orientation === o 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margins */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Margins</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['normal', 'narrow', 'wide'] as PageMargins[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => { onSettingsChange({ margins: m }); setShowMobileMoreMenu(false); }}
                          className={`px-2 py-1 rounded capitalize font-medium text-[11px] ${
                            settings.margins === m 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Layout */}
                  {onAutoLayout && canEdit && (
                    <div className="pt-2 border-t border-slate-800">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Auto Layout</label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => { onAutoLayout('stack'); setShowMobileMoreMenu(false); }}
                          className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                        >
                          Stack
                        </button>
                        <button
                          onClick={() => { onAutoLayout('grid'); setShowMobileMoreMenu(false); }}
                          className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                        >
                          Grid
                        </button>
                        <button
                          onClick={() => { onAutoLayout('diagram'); setShowMobileMoreMenu(false); }}
                          className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium"
                        >
                          Diagram
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Collaborators & Sync */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{collaborators.length} online</span>
                    </span>
                    <span className="capitalize">{syncStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Contextual Formatting Bar (Section 16, 17) */}
        {selectedBlock && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border-t border-slate-700/60 overflow-x-auto no-scrollbar text-xs">
            {/* Pure text block formatting */}
            {isPureTextBlock && (
              <>
                {/* Font Size controls */}
                <div className="flex items-center bg-slate-700 rounded-md shrink-0">
                  <button
                    onClick={() => updateStyle({ fontSize: Math.max(10, ((selectedBlock.style?.fontSize as number) || 14) - 2) })}
                    className="px-2 py-0.5 hover:bg-slate-600 rounded-l text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="px-1 text-[11px] font-mono font-semibold">
                    {selectedBlock.style?.fontSize || 14}
                  </span>
                  <button
                    onClick={() => updateStyle({ fontSize: Math.min(48, ((selectedBlock.style?.fontSize as number) || 14) + 2) })}
                    className="px-2 py-0.5 hover:bg-slate-600 rounded-r text-xs font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Bold */}
                <button
                  onClick={() => updateStyle({ bold: !selectedBlock.style?.bold })}
                  className={`p-1.5 rounded shrink-0 ${selectedBlock.style?.bold ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  onClick={() => updateStyle({ italic: !selectedBlock.style?.italic })}
                  className={`p-1.5 rounded shrink-0 ${selectedBlock.style?.italic ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  onClick={() => updateStyle({ underline: !selectedBlock.style?.underline })}
                  className={`p-1.5 rounded shrink-0 ${selectedBlock.style?.underline ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                {/* Alignment */}
                <div className="flex items-center bg-slate-700 rounded-md shrink-0 p-0.5">
                  <button
                    onClick={() => updateStyle({ align: 'left' })}
                    className={`p-1 rounded ${(!selectedBlock.style?.align || selectedBlock.style?.align === 'left') ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => updateStyle({ align: 'center' })}
                    className={`p-1 rounded ${selectedBlock.style?.align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => updateStyle({ align: 'right' })}
                    className={`p-1 rounded ${selectedBlock.style?.align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {/* Quote Block formatting */}
            {isQuoteBlock && (
              <>
                <span className="text-[11px] font-semibold text-sky-400 shrink-0">Quote</span>
                {/* Presets pill */}
                {(Object.keys(QUOTE_PRESETS) as QuotePresetStyle[]).slice(0, 3).map((key) => {
                  const p = QUOTE_PRESETS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const cur = typeof selectedBlock.content === 'object' && selectedBlock.content !== null ? selectedBlock.content : {};
                        updateContent({ ...p, text: cur.text || 'Quote', author: cur.author || '' });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 shrink-0 capitalize"
                    >
                      {p.label}
                    </button>
                  );
                })}
              </>
            )}

            {/* Shape Block formatting */}
            {isShapeBlock && (
              <>
                <span className="text-[11px] font-semibold text-blue-400 shrink-0">Shape</span>
                {(['rectangle', 'circle', 'diamond'] as ShapeType[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      const cur = typeof selectedBlock.content === 'object' && selectedBlock.content !== null ? selectedBlock.content : {};
                      updateContent({ ...cur, shapeType: st });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 shrink-0 capitalize"
                  >
                    {st}
                  </button>
                ))}
              </>
            )}

            {/* Callout Block formatting */}
            {isCalloutBlock && (
              <>
                <span className="text-[11px] font-semibold text-amber-400 shrink-0">Callout</span>
                {(['info', 'tip', 'warning', 'danger'] as CalloutPresetType[]).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => {
                      const cur = typeof selectedBlock.content === 'object' && selectedBlock.content !== null ? selectedBlock.content : {};
                      updateContent({ ...cur, type: ct });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 shrink-0 capitalize"
                  >
                    {ct}
                  </button>
                ))}
              </>
            )}

            {/* Table Block quick actions */}
            {isTableBlock && (
              <>
                <span className="text-[11px] font-semibold text-teal-400 shrink-0">Table</span>
                <button
                  onClick={() => {
                    const c = selectedBlock.content || {};
                    const headers = [...(c.headers || ['Col 1', 'Col 2'])];
                    const rows = (c.rows || []).map((r: string[]) => [...r, '']);
                    headers.push(`Col ${headers.length + 1}`);
                    updateContent({ headers, rows });
                  }}
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 shrink-0"
                >
                  + Col
                </button>
                <button
                  onClick={() => {
                    const c = selectedBlock.content || {};
                    const headers = c.headers || ['Col 1', 'Col 2'];
                    const rows = [...(c.rows || [])];
                    rows.push(new Array(headers.length).fill(''));
                    updateContent({ headers, rows });
                  }}
                  className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 shrink-0"
                >
                  + Row
                </button>
              </>
            )}

            {/* Open Detailed Properties Sheet (Section 18) */}
            {onOpenProperties && (
              <button
                onClick={onOpenProperties}
                className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[10px] font-semibold shrink-0 ml-auto flex items-center gap-1"
                title="Open Properties Sheet"
              >
                <Settings2 className="w-3 h-3" />
                <span>Style</span>
              </button>
            )}

            {/* Duplicate */}
            {onDuplicateBlock && (
              <button
                onClick={() => onDuplicateBlock(selectedBlock.id)}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white shrink-0"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete */}
            {onDeleteBlock && (
              <button
                onClick={() => onDeleteBlock(selectedBlock.id)}
                className="p-1 rounded hover:bg-red-900/60 text-red-400 hover:text-red-200 shrink-0"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          DESKTOP DEDICATED TOOLBAR (Visible on hidden md:flex screens)
          ======================================================== */}
      <div className="hidden md:flex items-center justify-between gap-1.5 sm:gap-2 max-w-full px-2 sm:px-3 py-1.5">
        {/* ========================================================
            LEFT SECTION: Document Title, Settings & Undo/Redo
            ======================================================== */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
            <FileText className="w-4 h-4" />
          </div>

          {/* Title Editor */}
          {isEditingTitle && canEdit ? (
            <input
              type="text"
              autoFocus
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setTempTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              className="bg-slate-800 border border-blue-500 rounded px-2 py-0.5 text-xs sm:text-sm font-semibold text-white outline-none w-36 sm:w-48 md:w-60"
            />
          ) : (
            <div 
              onClick={() => canEdit && setIsEditingTitle(true)}
              className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[190px] md:max-w-[260px] ${
                canEdit ? "hover:bg-slate-800/80 cursor-pointer" : ""
              }`}
              title={canEdit ? "Click to rename document" : title}
            >
              <span className="truncate">{title || "Group Study Document"}</span>
            </div>
          )}

          {/* Settings Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Page Format & Layout"
            >
              <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {showSettingsMenu && (
              <div 
                className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-bold text-white text-xs">Page Settings</span>
                  <span className="text-[10px] text-slate-400">Layout & Size</span>
                </div>

                {/* Page Format */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Page Size</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['a4', 'letter', 'legal'] as PageFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => onSettingsChange({ format: f })}
                        className={`px-2 py-1 rounded uppercase font-semibold text-[10px] ${
                          settings.format === f 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Orientation</label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['portrait', 'landscape'] as PageOrientation[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => onSettingsChange({ orientation: o })}
                        className={`px-2 py-1 rounded capitalize font-medium text-[11px] ${
                          settings.orientation === o 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Margins</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['normal', 'narrow', 'wide'] as PageMargins[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => onSettingsChange({ margins: m })}
                        className={`px-2 py-1 rounded capitalize font-medium text-[11px] ${
                          settings.margins === m 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Numbers Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-300">Show Page Numbers</span>
                  <input
                    type="checkbox"
                    checked={settings.showPageNumbers}
                    onChange={(e) => onSettingsChange({ showPageNumbers: e.target.checked })}
                    className="accent-blue-600 rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Undo / Redo - Always accessible on both mobile and desktop */}
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ========================================================
            CENTER SECTION: Contextual Editing Bar (Adapts on Selection)
            ======================================================== */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs shrink-0">
          {/* STATE A: PURE TEXT BLOCK SELECTED */}
          {selectedBlock && isPureTextBlock && (
            <div className="flex items-center gap-1">
              {/* Font Family */}
              <select
                value={selectedBlock.style?.fontFamily || 'Inter'}
                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 max-w-[90px] sm:max-w-none"
                title="Font Family"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>

              {/* Font Size */}
              <select
                value={selectedBlock.style?.fontSize || (selectedBlock.headingLevel === 1 ? 28 : selectedBlock.headingLevel === 2 ? 22 : 15)}
                onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700"
                title="Font Size"
              >
                {FONT_SIZES.map(sz => (
                  <option key={sz} value={sz}>{sz}px</option>
                ))}
              </select>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5 hidden sm:block" />

              {/* Bold, Italic, Underline */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => updateStyle({ bold: !selectedBlock.style?.bold })}
                  className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.style?.bold ? 'text-blue-400 bg-slate-700 font-bold' : 'text-slate-300'}`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStyle({ italic: !selectedBlock.style?.italic })}
                  className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.style?.italic ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStyle({ underline: !selectedBlock.style?.underline })}
                  className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.style?.underline ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStyle({ strikethrough: !selectedBlock.style?.strikethrough })}
                  className={`p-1 rounded hover:bg-slate-700 hidden sm:block ${selectedBlock.style?.strikethrough ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

              {/* Text Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'textColor' ? 'none' : 'textColor')}
                  className="p-1 rounded hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title="Text Color"
                >
                  <Palette className="w-3.5 h-3.5" style={{ color: selectedBlock.style?.color || '#ffffff' }} />
                </button>

                {activeColorPicker === 'textColor' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.textColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateStyle({ color: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.style?.color || '#ffffff'}
                        onChange={(e) => updateStyle({ color: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Highlight / Background Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'highlightColor' ? 'none' : 'highlightColor')}
                  className="p-1 rounded hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title="Highlight Color"
                >
                  <Highlighter className="w-3.5 h-3.5 text-amber-400" />
                </button>

                {activeColorPicker === 'highlightColor' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        updateStyle({ bgColor: 'transparent' });
                        setActiveColorPicker('none');
                      }}
                      className="w-6 h-6 rounded-md border border-dashed border-slate-600 text-[10px] flex items-center justify-center text-slate-400"
                      title="Clear highlight"
                    >
                      ✕
                    </button>
                    {SHARED_PALETTE.fillColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateStyle({ bgColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5 hidden sm:block" />

              {/* Alignments */}
              <div className="hidden sm:flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => updateStyle({ align: 'left' })}
                  className={`p-1 rounded hover:bg-slate-700 ${(!selectedBlock.style?.align || selectedBlock.style?.align === 'left') ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStyle({ align: 'center' })}
                  className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.style?.align === 'center' ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStyle({ align: 'right' })}
                  className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.style?.align === 'right' ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STATE A2: QUOTE BLOCK SELECTED */}
          {selectedBlock && isQuoteBlock && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="font-bold text-[11px] text-blue-400 flex items-center gap-1">
                <QuoteIcon className="w-3.5 h-3.5" /> Quote
              </span>

              {/* Preset Selector */}
              <select
                value={selectedBlock.content?.quoteStyle || 'default'}
                onChange={(e) => {
                  const p = QUOTE_PRESETS[e.target.value as QuotePresetStyle] || QUOTE_PRESETS.default;
                  updateContent({
                    quoteStyle: e.target.value,
                    bgColor: p.bgColor,
                    textColor: p.textColor,
                    borderColor: p.borderColor,
                    accentColor: p.accentColor,
                    borderWidth: p.borderWidth,
                    italic: p.italic,
                    borderRadius: p.borderRadius,
                  });
                }}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 font-medium"
                title="Quote Style Preset"
              >
                <option value="default">Default</option>
                <option value="sidebar">Sidebar Quote</option>
                <option value="highlight">Highlight</option>
                <option value="warning">Warning</option>
                <option value="takeaway">Key Takeaway</option>
              </select>

              {/* Background Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'quoteBg' ? 'none' : 'quoteBg')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Quote Background Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.bgColor || '#f8fafc' }}
                  />
                  <span className="hidden sm:inline">Bg</span>
                </button>

                {activeColorPicker === 'quoteBg' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.fillColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ bgColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.bgColor || '#f8fafc'}
                        onChange={(e) => updateContent({ bgColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Accent Bar Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'quoteAccent' ? 'none' : 'quoteAccent')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Left Accent Bar Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.accentColor || '#3b82f6' }}
                  />
                  <span className="hidden sm:inline">Accent</span>
                </button>

                {activeColorPicker === 'quoteAccent' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.borderColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ accentColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.accentColor || '#3b82f6'}
                        onChange={(e) => updateContent({ accentColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'quoteText' ? 'none' : 'quoteText')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Quote Text Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.textColor || '#334155' }}
                  />
                  <span className="hidden sm:inline">Text</span>
                </button>

                {activeColorPicker === 'quoteText' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.textColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ textColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.textColor || '#334155'}
                        onChange={(e) => updateContent({ textColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Font Size */}
              <select
                value={selectedBlock.content?.fontSize || 15}
                onChange={(e) => updateContent({ fontSize: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700"
                title="Font Size"
              >
                {[12, 14, 15, 16, 18, 20, 24].map(sz => (
                  <option key={sz} value={sz}>{sz}px</option>
                ))}
              </select>

              {/* Italic */}
              <button
                type="button"
                onClick={() => updateContent({ italic: selectedBlock.content?.italic === false ? true : false })}
                className={`p-1 rounded hover:bg-slate-700 ${selectedBlock.content?.italic !== false ? 'text-blue-400 bg-slate-700' : 'text-slate-300'}`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE A3: CALLOUT BLOCK SELECTED */}
          {selectedBlock && isCalloutBlock && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Callout
              </span>

              {/* Type Preset */}
              <select
                value={selectedBlock.content?.type || selectedBlock.calloutType || 'info'}
                onChange={(e) => {
                  const p = CALLOUT_PRESETS[e.target.value as CalloutPresetType] || CALLOUT_PRESETS.info;
                  updateContent({
                    type: e.target.value,
                    bgColor: p.bgColor,
                    borderColor: p.borderColor,
                    textColor: p.textColor,
                    accentColor: p.accentColor,
                  });
                }}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 font-medium"
                title="Callout Type"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
                <option value="tip">Tip</option>
              </select>

              {/* Background Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'calloutBg' ? 'none' : 'calloutBg')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Callout Background Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.bgColor || '#eff6ff' }}
                  />
                  <span className="hidden sm:inline">Bg</span>
                </button>

                {activeColorPicker === 'calloutBg' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.fillColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ bgColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Border Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'calloutBorder' ? 'none' : 'calloutBorder')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Callout Border Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.borderColor || '#bfdbfe' }}
                  />
                  <span className="hidden sm:inline">Border</span>
                </button>

                {activeColorPicker === 'calloutBorder' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.borderColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ borderColor: c.value, accentColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATE B: SHAPE BLOCK SELECTED */}
          {selectedBlock && isShapeBlock && (
            <div className="flex items-center gap-1.5">
              {/* Change Shape Dropdown */}
              <select
                value={selectedBlock.content?.shapeType || 'rectangle'}
                onChange={(e) => updateContent({ shapeType: e.target.value as ShapeType })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700"
                title="Change Shape"
              >
                <option value="rectangle">Rectangle</option>
                <option value="rounded">Rounded Rect</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
                <option value="arrow">Arrow</option>
                <option value="pill">Pill</option>
              </select>

              {/* Fill Color */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'fillColor' ? 'none' : 'fillColor')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Fill Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.color || '#dbeafe' }}
                  />
                  <span>Fill</span>
                </button>

                {activeColorPicker === 'fillColor' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.fillColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ color: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.color || '#dbeafe'}
                        onChange={(e) => updateContent({ color: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Border Color */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'borderColor' ? 'none' : 'borderColor')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Border Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.borderColor || '#3b82f6' }}
                  />
                  <span>Border</span>
                </button>

                {activeColorPicker === 'borderColor' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.borderColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ borderColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Border Width (Section 17: Support 0, 1, 2, 3, 4, 6) */}
              <select
                value={selectedBlock.content?.borderWidth !== undefined ? selectedBlock.content.borderWidth : 2}
                onChange={(e) => updateContent({ borderWidth: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 hidden sm:block"
                title="Border Width"
              >
                <option value={0}>0px</option>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={6}>6px</option>
              </select>

              {/* Border Style (Section 17: Support Solid, Dashed, Dotted) */}
              <select
                value={selectedBlock.content?.borderStyle || 'solid'}
                onChange={(e) => updateContent({ borderStyle: e.target.value })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 hidden sm:block"
                title="Border Style"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>

              {/* [ Text ● ] Shape Text Color (Section 16 & 18: Never alters fill or border) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveColorPicker(activeColorPicker === 'shapeTextColor' ? 'none' : 'shapeTextColor')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                  title="Shape Text Color"
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ backgroundColor: selectedBlock.content?.textColor || '#0f172a' }}
                  />
                  <span>Text</span>
                </button>

                {activeColorPicker === 'shapeTextColor' && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 w-44 grid grid-cols-5 gap-1.5 animate-in fade-in duration-100">
                    {SHARED_PALETTE.textColors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateContent({ textColor: c.value });
                          setActiveColorPicker('none');
                        }}
                        className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <div className="col-span-5 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Custom</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.textColor || '#0f172a'}
                        onChange={(e) => updateContent({ textColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Opacity */}
              <select
                value={selectedBlock.content?.opacity !== undefined ? selectedBlock.content.opacity : 1}
                onChange={(e) => updateContent({ opacity: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 hidden md:block"
                title="Opacity"
              >
                <option value={1}>100%</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50%</option>
                <option value={0.25}>25%</option>
              </select>

              {/* Layer arrange */}
              {selectedBlock.layoutType === 'positioned' && onUpdateBlock && (
                <div className="flex items-center gap-0.5 hidden sm:flex">
                  <button
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.min(100, (selectedBlock.zIndex || 20) + 5) })}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300"
                    title="Bring Forward"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.max(5, (selectedBlock.zIndex || 20) - 5) })}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300"
                    title="Send Backward"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE B2: IMAGE BLOCK SELECTED (Section 11) */}
          {selectedBlock && isImageBlock && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-orange-400">Image</span>

              {/* Opacity */}
              <select
                value={selectedBlock.content?.opacity !== undefined ? selectedBlock.content.opacity : 1}
                onChange={(e) => updateContent({ opacity: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700"
                title="Opacity"
              >
                <option value={1}>100% Opacity</option>
                <option value={0.75}>75% Opacity</option>
                <option value={0.5}>50% Opacity</option>
                <option value={0.25}>25% Opacity</option>
              </select>

              {/* Border Width */}
              <select
                value={selectedBlock.content?.borderWidth !== undefined ? selectedBlock.content.borderWidth : 1}
                onChange={(e) => updateContent({ borderWidth: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 hidden sm:block"
                title="Border"
              >
                <option value={0}>No Border</option>
                <option value={1}>1px Border</option>
                <option value={2}>2px Border</option>
                <option value={4}>4px Border</option>
              </select>

              {/* Border Radius */}
              <select
                value={selectedBlock.content?.borderRadius !== undefined ? selectedBlock.content.borderRadius : 6}
                onChange={(e) => updateContent({ borderRadius: Number(e.target.value) })}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-slate-700 hidden sm:block"
                title="Corner Radius"
              >
                <option value={0}>Square (0px)</option>
                <option value={8}>Rounded (8px)</option>
                <option value={16}>Curved (16px)</option>
                <option value={9999}>Full (Circle/Pill)</option>
              </select>

              {/* Layer arrange */}
              {selectedBlock.layoutType === 'positioned' && onUpdateBlock && (
                <div className="flex items-center gap-0.5 hidden sm:flex">
                  <button
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.min(100, (selectedBlock.zIndex || 20) + 5) })}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300"
                    title="Bring Forward"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.max(5, (selectedBlock.zIndex || 20) - 5) })}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300"
                    title="Send Backward"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedBlock && isDiagramBlock && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[11px] text-teal-400 flex items-center gap-1">
                <GitCommit className="w-3.5 h-3.5" /> Flowchart
              </span>
              <button
                type="button"
                onClick={() => {
                  const currentNodes = selectedBlock.content?.nodes || [];
                  const newId = `n_${Date.now()}`;
                  updateContent({
                    nodes: [
                      ...currentNodes,
                      {
                        id: newId,
                        label: `Step ${currentNodes.length + 1}`,
                        x: 30 + (currentNodes.length * 120) % 360,
                        y: 80,
                        width: 100,
                        height: 40,
                        shape: 'rounded',
                        color: '#3b82f6',
                        textColor: '#ffffff',
                      }
                    ]
                  });
                }}
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px]"
              >
                + Node
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentNodes = selectedBlock.content?.nodes || [];
                  const layoutNodes = currentNodes.map((n: any, idx: number) => ({
                    ...n,
                    x: 30 + idx * 140,
                    y: 45,
                  }));
                  updateContent({ nodes: layoutNodes });
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium flex items-center gap-1"
                title="Arrange nodes cleanly"
              >
                <Sparkles className="w-3 h-3 text-amber-400" /> Layout
              </button>
            </div>
          )}

          {/* STATE D: TABLE BLOCK SELECTED */}
          {selectedBlock && isTableBlock && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[11px] text-cyan-400 flex items-center gap-1">
                <TableIcon className="w-3.5 h-3.5" /> Table
              </span>
              <button
                type="button"
                onClick={() => {
                  const tData = selectedBlock.content || { headers: ['Col 1', 'Col 2'], rows: [['', '']] };
                  const emptyRow = (tData.headers || []).map(() => '');
                  updateContent({ rows: [...(tData.rows || []), emptyRow] });
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium"
              >
                + Row
              </button>
              <button
                type="button"
                onClick={() => {
                  const tData = selectedBlock.content || { headers: ['Col 1'], rows: [['']] };
                  const newHeaders = [...(tData.headers || []), `Col ${(tData.headers?.length || 0) + 1}`];
                  const newRows = (tData.rows || []).map((r: any) => [...r, '']);
                  updateContent({ headers: newHeaders, rows: newRows });
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium"
              >
                + Col
              </button>
            </div>
          )}

          {/* COMMON ACTIONS WHEN ANY OBJECT IS SELECTED: Duplicate & Delete */}
          {selectedBlock && (
            <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5">
              {onDuplicateBlock && (
                <button
                  type="button"
                  onClick={() => onDuplicateBlock(selectedBlock.id)}
                  className="p-1 rounded hover:bg-slate-700 text-slate-300"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteBlock && (
                <button
                  type="button"
                  onClick={() => onDeleteBlock(selectedBlock.id)}
                  className="p-1 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300"
                  title="Delete (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* STATE E: NOTHING SELECTED (Direct, Unclipped Auto-Layout & Page Navigation) */}
          {!selectedBlock && (
            <div className="flex items-center gap-2 text-slate-300">
              {/* Direct Page Auto-Layout Buttons (No Hidden/Clipped Dropdowns!) */}
              {onAutoLayout && canEdit && (
                <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold px-1 hidden sm:inline">Layout:</span>
                  <button
                    type="button"
                    onClick={() => onAutoLayout('stack')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors"
                    title="Stack page objects vertically"
                  >
                    <Rows className="w-3 h-3 text-blue-400" />
                    <span>Stack</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAutoLayout('grid')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors"
                    title="Arrange objects in 2-column grid"
                  >
                    <LayoutGrid className="w-3 h-3 text-amber-400" />
                    <span>Grid</span>
                  </button>
                </div>
              )}

              {/* Quick Compact Page Navigator with Prev/Next (Requirement #9) */}
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  disabled={currentPageNumber <= 1}
                  onClick={() => onSelectPage(Math.max(1, currentPageNumber - 1))}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowPageMenu(!showPageMenu)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-700 font-semibold text-slate-200 transition-colors"
                    title="Jump to page or add page"
                  >
                    <span>{currentPageNumber} / {totalPages}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {showPageMenu && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 text-xs max-h-48 overflow-y-auto"
                      onClick={() => setShowPageMenu(false)}
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          onClick={() => onSelectPage(num)}
                          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                            num === currentPageNumber 
                              ? 'bg-blue-600 text-white font-bold' 
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Page {num}</span>
                          {num === currentPageNumber && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                      {canEdit && (
                        <button
                          onClick={onAddPage}
                          className="w-full text-left px-2 py-1.5 rounded text-xs text-blue-400 hover:bg-blue-950/40 border-t border-slate-800 flex items-center gap-1 font-medium mt-1"
                        >
                          + Add Page
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={currentPageNumber >= totalPages}
                  onClick={() => onSelectPage(Math.min(totalPages, currentPageNumber + 1))}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT SECTION: Zoom, Collaborators, Sync Badge, Export PDF
            ======================================================== */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom Controls (Accessible on Mobile and Desktop - Requirement #10) */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5 text-xs">
            <button
              onClick={() => onZoomChange(Math.max(0.4, Number((zoom - 0.1).toFixed(2))))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[10px] sm:text-[11px] text-slate-300 min-w-[32px] sm:min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onZoomChange(Math.min(2.0, Number((zoom + 0.1).toFixed(2))))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitPage}
              className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-[10px] text-slate-300 hover:text-white border-l border-slate-700 ml-0.5 flex items-center gap-0.5"
              title="Fit Page to Screen"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Fit</span>
            </button>
          </div>

          {/* Collaborator Presence */}
          <div className="relative">
            <button
              onClick={() => setShowUsersMenu(!showUsersMenu)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300"
              title="Collaborators currently editing"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-white">{collaborators.length}</span>
              <div className="flex -space-x-1.5 overflow-hidden ml-0.5">
                {collaborators.slice(0, 3).map((c, i) => (
                  <span
                    key={i}
                    className="inline-block w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                    style={{ backgroundColor: c.userColor }}
                    title={`${c.userName} on Page ${c.activePageNumber}`}
                  />
                ))}
              </div>
            </button>

            {showUsersMenu && (
              <div 
                className="absolute top-full right-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1"
                onClick={() => setShowUsersMenu(false)}
              >
                <div className="px-2 py-1 font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 mb-1">
                  Active Document Collaborators
                </div>
                {collaborators.length === 0 ? (
                  <div className="p-2 text-slate-400 text-xs">Only you are here</div>
                ) : (
                  collaborators.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: c.userColor }} 
                        />
                        <span className="font-medium text-slate-200">{c.userName}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                        Page {c.activePageNumber}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sync indicator */}
          <div className="hidden xl:flex items-center text-[10px] text-slate-400 px-1">
            {syncStatus === 'syncing' ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Syncing
              </span>
            ) : syncStatus === 'offline' ? (
              <span className="text-red-400 font-medium">Offline</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          {/* Export PDF Button */}
          <Button
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="h-7 sm:h-8 gap-1.5 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shrink-0"
            title="Export clean multi-page PDF"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
