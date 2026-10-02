import React, { useState } from "react";
import { 
  DocumentBlock, 
  BlockType, 
  ShapeType, 
  ShapeData,
  DocumentSettings,
  PageFormat,
  PageOrientation,
  PageMargins,
  SHAPE_PRESETS,
  SHARED_PALETTE,
  FONT_SIZES,
  FONT_FAMILIES,
  PAGE_DIMENSIONS,
  MARGIN_VALUES,
  QuoteData,
  QUOTE_PRESETS,
  QuotePresetStyle,
  CalloutData,
  CALLOUT_PRESETS,
  CalloutPresetType,
  DiagramNodeShape,
  TableData,
  DiagramData,
  DiagramNode
} from "@/lib/types/document";
import { 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Table as TableIcon, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Diamond, 
  ArrowRight, 
  GitCommit, 
  AlertCircle, 
  Quote, 
  Minus, 
  Code, 
  Plus, 
  Trash2, 
  Copy, 
  Lock, 
  Unlock, 
  ChevronRight, 
  ChevronLeft, 
  Layers, 
  Box, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  X,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Rows,
  LayoutGrid,
  Settings2,
  FilePlus,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedBlock: DocumentBlock | null;
  selectedBlocks?: DocumentBlock[];
  canEdit: boolean;
  onAddBlock: (type: BlockType, extra?: any) => void;
  onUpdateBlock: (blockId: string, updatedFields: Partial<DocumentBlock>) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  isMobile?: boolean;
  settings?: DocumentSettings;
  onSettingsChange?: (newSettings: Partial<DocumentSettings>) => void;
  onAutoLayout?: (type: 'stack' | 'horizontal' | 'grid' | 'diagram') => void;
  onAlignSelected?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
  onAlignPage?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  currentPageNumber?: number;
  totalPages?: number;
  onSelectPage?: (pageNumber: number) => void;
  onAddPage?: () => void;
  onDuplicatePage?: () => void;
  onDeletePage?: () => void;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onToggleOpen,
  selectedBlock,
  selectedBlocks = [],
  canEdit,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  isMobile = false,
  settings,
  onSettingsChange,
  onAutoLayout,
  onAlignSelected,
  onAlignPage,
  currentPageNumber = 1,
  totalPages = 1,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  const [activeTab, setActiveTab] = useState<'insert' | 'properties'>(
    selectedBlock ? 'properties' : 'insert'
  );

  // Automatically switch tab to properties when an object is selected
  const prevSelectedBlockIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (selectedBlock?.id && selectedBlock.id !== prevSelectedBlockIdRef.current) {
      prevSelectedBlockIdRef.current = selectedBlock.id;
      setActiveTab('properties');
    } else if (!selectedBlock) {
      prevSelectedBlockIdRef.current = null;
    }
  }, [selectedBlock]);

  if (!isOpen) {
    if (isMobile) return null;
    return (
      <aside className="hidden md:flex relative shrink-0 items-center select-none z-30">
        <button
          onClick={onToggleOpen}
          className="h-16 px-1.5 bg-slate-900 border-l border-y border-slate-800 text-slate-400 hover:text-white rounded-l-xl shadow-2xl flex items-center justify-center transition-colors group"
          title="Open Toolbox & Properties"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 text-slate-400 group-hover:text-blue-400">
            {selectedBlock ? 'Properties' : 'Toolbox'}
          </span>
        </button>
      </aside>
    );
  }

  const contentItems: { type: BlockType; label: string; desc: string; icon: React.ReactNode; extra?: Record<string, unknown> }[] = [
    { type: 'text', label: 'Paragraph', desc: 'Flowing body text', icon: <Type className="w-4 h-4 text-blue-400" /> },
    { type: 'heading', label: 'Heading 1', desc: 'Main section title', icon: <Heading1 className="w-4 h-4 text-indigo-400" />, extra: { headingLevel: 1 } },
    { type: 'heading', label: 'Heading 2', desc: 'Subsection header', icon: <Heading2 className="w-4 h-4 text-indigo-400" />, extra: { headingLevel: 2 } },
    { type: 'bullet', label: 'Bullet List', desc: 'Bulleted key points', icon: <List className="w-4 h-4 text-amber-400" /> },
    { type: 'numbered', label: 'Numbered List', desc: 'Numbered step sequence', icon: <ListOrdered className="w-4 h-4 text-amber-400" /> },
    { type: 'checklist', label: 'Checklist', desc: 'Interactive task items', icon: <CheckSquare className="w-4 h-4 text-emerald-400" /> },
    { type: 'quote', label: 'Quote', desc: 'Styled key takeaway', icon: <Quote className="w-4 h-4 text-sky-400" /> },
  ];

  const structureItems: { type: BlockType; label: string; desc: string; icon: React.ReactNode; extra?: Record<string, unknown> }[] = [
    { type: 'table', label: 'Table', desc: 'Editable grid with rows & columns', icon: <TableIcon className="w-4 h-4 text-cyan-400" /> },
    { type: 'callout', label: 'Callout Box', desc: 'Highlighted info banner', icon: <AlertCircle className="w-4 h-4 text-purple-400" />, extra: { calloutType: 'info' } },
    { type: 'divider', label: 'Divider', desc: 'Horizontal section separator', icon: <Minus className="w-4 h-4 text-slate-400" /> },
  ];

  const visualItems: { type: BlockType; label: string; desc: string; icon: React.ReactNode; extra?: Record<string, unknown> }[] = [
    { type: 'diagram', label: 'Flow Diagram', desc: 'Interactive connected steps', icon: <GitCommit className="w-4 h-4 text-teal-400" /> },
    { type: 'shape', label: 'Rectangle', desc: 'Box with text inside', icon: <Square className="w-4 h-4 text-blue-400" />, extra: { shapeType: 'rectangle' } },
    { type: 'shape', label: 'Rounded Rect', desc: 'Smooth curved box', icon: <Square className="w-4 h-4 text-blue-400 rounded" />, extra: { shapeType: 'rounded' } },
    { type: 'shape', label: 'Circle', desc: 'Circular shape with label', icon: <Circle className="w-4 h-4 text-emerald-400" />, extra: { shapeType: 'circle' } },
    { type: 'shape', label: 'Diamond', desc: 'Decision branch shape', icon: <Diamond className="w-4 h-4 text-amber-400" />, extra: { shapeType: 'diamond' } },
    { type: 'shape', label: 'Arrow', desc: 'Directional indicator', icon: <ArrowRight className="w-4 h-4 text-amber-400" />, extra: { shapeType: 'arrow' } },
    { type: 'image', label: 'Image', desc: 'Upload file or web URL', icon: <ImageIcon className="w-4 h-4 text-orange-400" /> },
  ];

  const codeItems: { type: BlockType; label: string; desc: string; icon: React.ReactNode; extra?: Record<string, unknown> }[] = [
    { type: 'code', label: 'Code Block', desc: 'Monospace formatted code', icon: <Code className="w-4 h-4 text-rose-400" /> },
  ];

  // Helper for shape content updates
  const updateShapeContent = (fields: Partial<ShapeData>) => {
    if (!selectedBlock) return;
    const current = typeof selectedBlock.content === 'object' && selectedBlock.content !== null ? selectedBlock.content : {};
    onUpdateBlock(selectedBlock.id, { content: { ...current, ...fields } });
  };

  // Helper for quote content updates
  const updateQuoteContent = (fields: Partial<QuoteData>) => {
    if (!selectedBlock) return;
    const current: QuoteData = typeof selectedBlock.content === 'object' && selectedBlock.content !== null
      ? (selectedBlock.content as QuoteData)
      : { text: typeof selectedBlock.content === 'string' ? selectedBlock.content : '', author: '' };
    onUpdateBlock(selectedBlock.id, { content: { ...current, ...fields } });
  };

  // Helper for callout content updates
  const updateCalloutContent = (fields: Partial<CalloutData>) => {
    if (!selectedBlock) return;
    const current: CalloutData = typeof selectedBlock.content === 'object' && selectedBlock.content !== null
      ? (selectedBlock.content as CalloutData)
      : { type: 'info', body: typeof selectedBlock.content === 'string' ? selectedBlock.content : '' };
    onUpdateBlock(selectedBlock.id, { content: { ...current, ...fields } });
  };

  // Helper for style updates
  const updateBlockStyle = (fields: Partial<DocumentBlock['style']>) => {
    if (!selectedBlock) return;
    onUpdateBlock(selectedBlock.id, { style: { ...(selectedBlock.style || {}), ...fields } });
  };

  // Snapping / Alignment helpers for positioned blocks
  const alignPositioned = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedBlock || selectedBlock.layoutType !== 'positioned' || !settings) return;
    const dims = PAGE_DIMENSIONS[settings.format]?.[settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
    const margin = MARGIN_VALUES[settings.margins] || 48;
    const w = selectedBlock.width || 180;
    const h = selectedBlock.height || 80;

    let newX = selectedBlock.x || margin;
    let newY = selectedBlock.y || margin;

    if (alignment === 'left') newX = margin;
    if (alignment === 'center') newX = Math.round((dims.width - w) / 2);
    if (alignment === 'right') newX = dims.width - margin - w;
    if (alignment === 'top') newY = margin + 30;
    if (alignment === 'middle') newY = Math.round((dims.height - h) / 2);
    if (alignment === 'bottom') newY = dims.height - margin - h - 30;

    onUpdateBlock(selectedBlock.id, { x: newX, y: newY });
  };

  return (
    <>
      {/* Mobile Backdrop for Bottom Sheet Dismissal */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
          onClick={onToggleOpen}
        />
      )}
      <aside 
        className={`${
          isMobile 
            ? "fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-3xl border-t border-slate-700 bg-slate-900/98 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-bottom duration-200" 
            : "relative w-76 lg:w-84 shrink-0 h-full border-l border-slate-800 bg-slate-900/95 flex flex-col z-30 select-none shadow-xl"
        }`}
      >
        {/* Mobile Pull / Grab Handle Bar */}
        {isMobile && (
          <div 
            className="w-full flex items-center justify-center pt-2.5 pb-1 shrink-0 cursor-pointer"
            onClick={onToggleOpen}
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors" />
          </div>
        )}

        {/* Sidebar Header with Mode Switching Tabs */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 shrink-0 bg-slate-900">
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('insert')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'insert' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toolbox
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === 'properties' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {selectedBlock ? 'Properties' : 'Page & Layout'}
            </button>
          </div>

          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMobile ? "Close Sheet" : "Collapse Sidebar"}
          >
            {isMobile ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 text-xs">
        {/* ========================================================
            TAB 1: INSERT MODE (Component Toolbox)
            ======================================================== */}
        {activeTab === 'insert' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* CONTENT SECTION */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Text & Content
              </span>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-1'}`}>
                {contentItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAddBlock(item.type, item.extra);
                      if (isMobile) onToggleOpen();
                    }}
                    className={`w-full p-2.5 rounded-xl hover:bg-slate-800 border ${isMobile ? 'bg-slate-800/70 border-slate-700/60' : 'border-transparent'} hover:border-slate-700/80 flex items-center gap-2.5 text-left transition-all group active:scale-95`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 group-hover:text-white text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* STRUCTURE SECTION */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Structure
              </span>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-1'}`}>
                {structureItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAddBlock(item.type, item.extra);
                      if (isMobile) onToggleOpen();
                    }}
                    className={`w-full p-2.5 rounded-xl hover:bg-slate-800 border ${isMobile ? 'bg-slate-800/70 border-slate-700/60' : 'border-transparent'} hover:border-slate-700/80 flex items-center gap-2.5 text-left transition-all group active:scale-95`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 group-hover:text-white text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* VISUAL & SHAPES SECTION */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Visual & Shapes
              </span>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-1'}`}>
                {visualItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAddBlock(item.type, item.extra);
                      if (isMobile) onToggleOpen();
                    }}
                    className={`w-full p-2.5 rounded-xl hover:bg-slate-800 border ${isMobile ? 'bg-slate-800/70 border-slate-700/60' : 'border-transparent'} hover:border-slate-700/80 flex items-center gap-2.5 text-left transition-all group active:scale-95`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 group-hover:text-white text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CODE SECTION */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Code
              </span>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-1'}`}>
                {codeItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAddBlock(item.type, item.extra);
                      if (isMobile) onToggleOpen();
                    }}
                    className={`w-full p-2.5 rounded-xl hover:bg-slate-800 border ${isMobile ? 'bg-slate-800/70 border-slate-700/60' : 'border-transparent'} hover:border-slate-700/80 flex items-center gap-2.5 text-left transition-all group active:scale-95`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 group-hover:text-white text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2A: PROPERTIES MODE (When an Object IS Selected)
            ======================================================== */}
        {activeTab === 'properties' && selectedBlock && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Header: Selected Component with Quick Actions */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                  Selected Component
                </span>
                <span className="text-xs font-bold text-white capitalize truncate block">
                  {selectedBlock.type === 'shape' ? `${selectedBlock.content?.shapeType || 'Rectangle'} Shape` : selectedBlock.type}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDuplicateBlock(selectedBlock.id)}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                  title="Duplicate Component (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    onDeleteBlock(selectedBlock.id);
                    if (isMobile) onToggleOpen();
                  }}
                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/50 text-red-300 transition-colors"
                  title="Delete Component"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 1. SHAPE PROPERTIES */}
            {selectedBlock.type === 'shape' && (
              <div className="space-y-3">
                {/* Visual Shape Switcher */}
                <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Change Shape
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { type: 'rectangle', label: 'Rect', icon: <Square className="w-3.5 h-3.5" /> },
                      { type: 'rounded', label: 'Rounded', icon: <Square className="w-3.5 h-3.5 rounded" /> },
                      { type: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
                      { type: 'diamond', label: 'Diamond', icon: <Diamond className="w-3.5 h-3.5" /> },
                      { type: 'pill', label: 'Pill', icon: <Minus className="w-3.5 h-3.5" /> },
                      { type: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-3.5 h-3.5" /> },
                    ].map(s => (
                      <button
                        key={s.type}
                        onClick={() => updateShapeContent({ shapeType: s.type as ShapeType })}
                        className={`p-1.5 rounded-lg border text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${
                          selectedBlock.content?.shapeType === s.type
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {s.icon}
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inner Text & Label */}
                <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Label & Typography
                  </span>
                  <input
                    type="text"
                    value={selectedBlock.content?.label || ''}
                    onChange={(e) => updateShapeContent({ label: e.target.value })}
                    placeholder="Enter shape label..."
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedBlock.content?.fontSize || 14}
                        onChange={(e) => updateShapeContent({ fontSize: Number(e.target.value) })}
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none"
                      >
                        {[12, 14, 16, 18, 20, 24].map(sz => (
                          <option key={sz} value={sz}>{sz}px</option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateShapeContent({ bold: !selectedBlock.content?.bold })}
                        className={`p-1 rounded border text-[11px] ${selectedBlock.content?.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        title="Bold"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Text:</span>
                      <input
                        type="color"
                        value={selectedBlock.content?.textColor || '#1e3a8a'}
                        onChange={(e) => updateShapeContent({ textColor: e.target.value })}
                        className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Fill & Color Presets */}
                <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Style Presets
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => updateShapeContent({
                          color: preset.color,
                          borderColor: preset.borderColor,
                          textColor: preset.textColor,
                        })}
                        className="p-1 rounded-lg border border-slate-700 hover:border-blue-400 text-center text-[10px] font-semibold transition-all shadow-sm"
                        style={{ backgroundColor: preset.color, color: preset.textColor }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">Fill Color & Opacity</span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1 flex-1">
                        <input
                          type="color"
                          value={selectedBlock.content?.color || '#dbeafe'}
                          onChange={(e) => updateShapeContent({ color: e.target.value })}
                          className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-slate-300 truncate">
                          {selectedBlock.content?.color || '#dbeafe'}
                        </span>
                      </div>
                      <select
                        value={selectedBlock.content?.opacity !== undefined ? selectedBlock.content.opacity : 1}
                        onChange={(e) => updateShapeContent({ opacity: Number(e.target.value) })}
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                      >
                        <option value={1}>100%</option>
                        <option value={0.75}>75%</option>
                        <option value={0.5}>50%</option>
                        <option value={0.25}>25%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Border Styling */}
                <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Borders & Corners
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Border Color</label>
                      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                        <input
                          type="color"
                          value={selectedBlock.content?.borderColor || '#3b82f6'}
                          onChange={(e) => updateShapeContent({ borderColor: e.target.value })}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-slate-300 truncate">
                          {selectedBlock.content?.borderColor || '#3b82f6'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Border Width</label>
                      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                        {[0, 1, 2, 3, 4].map(w => (
                          <button
                            key={w}
                            onClick={() => updateShapeContent({ borderWidth: w })}
                            className={`flex-1 py-0.5 text-[10px] rounded font-medium ${
                              (selectedBlock.content?.borderWidth ?? 2) === w ? 'bg-blue-600 text-white' : 'text-slate-400'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2A. QUOTE PROPERTIES */}
            {selectedBlock.type === 'quote' && (() => {
              const quoteData: QuoteData = typeof selectedBlock.content === 'object' && selectedBlock.content !== null
                ? (selectedBlock.content as QuoteData)
                : { text: typeof selectedBlock.content === 'string' ? selectedBlock.content : '', author: '' };
              
              return (
                <div className="space-y-3">
                  {/* Presets */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quote Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(QUOTE_PRESETS) as QuotePresetStyle[]).map(pk => {
                        const p = QUOTE_PRESETS[pk];
                        return (
                          <button
                            key={pk}
                            onClick={() => updateQuoteContent({
                              preset: pk,
                              bgColor: p.bgColor,
                              textColor: p.textColor,
                              borderColor: p.borderColor,
                              accentColor: p.accentColor,
                              borderWidth: p.borderWidth,
                              italic: p.italic,
                              borderRadius: p.borderRadius,
                            })}
                            className={`p-1.5 rounded-lg border text-left text-[11px] font-medium transition-all ${
                              quoteData.preset === pk
                                ? 'border-blue-500 bg-blue-950/40 text-white'
                                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.accentColor }} />
                              <span className="truncate">{p.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Author / Source */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Author / Attribution
                    </span>
                    <input
                      type="text"
                      value={quoteData.author || ''}
                      onChange={(e) => updateQuoteContent({ author: e.target.value })}
                      placeholder="e.g. Albert Einstein, Research Paper..."
                      className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Independent Colors */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Independent Colors
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Background</label>
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                          <input
                            type="color"
                            value={quoteData.bgColor || '#f8fafc'}
                            onChange={(e) => updateQuoteContent({ bgColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {quoteData.bgColor || '#f8fafc'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Accent Bar</label>
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                          <input
                            type="color"
                            value={quoteData.accentColor || quoteData.borderColor || '#3b82f6'}
                            onChange={(e) => updateQuoteContent({ accentColor: e.target.value, borderColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {quoteData.accentColor || '#3b82f6'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Text Color</label>
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                          <input
                            type="color"
                            value={quoteData.textColor || '#334155'}
                            onChange={(e) => updateQuoteContent({ textColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {quoteData.textColor || '#334155'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Border Width</label>
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                          {[2, 4, 6, 8].map(w => (
                            <button
                              key={w}
                              onClick={() => updateQuoteContent({ borderWidth: w })}
                              className={`flex-1 py-0.5 text-[10px] rounded font-medium ${
                                (quoteData.borderWidth ?? 4) === w ? 'bg-blue-600 text-white' : 'text-slate-400'
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typography & Alignment */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Typography & Alignment
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <select
                          value={quoteData.fontSize || 15}
                          onChange={(e) => updateQuoteContent({ fontSize: Number(e.target.value) })}
                          className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-1 text-xs outline-none"
                        >
                          {[13, 14, 15, 16, 18, 20, 24].map(sz => (
                            <option key={sz} value={sz}>{sz}px</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateQuoteContent({ italic: !quoteData.italic })}
                          className={`p-1.5 rounded-lg border text-xs font-semibold ${
                            quoteData.italic !== false ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                          title="Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button
                            key={a}
                            onClick={() => updateQuoteContent({ align: a })}
                            className={`p-1.5 rounded-lg border text-xs ${
                              (quoteData.align || 'left') === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2B. CALLOUT PROPERTIES */}
            {selectedBlock.type === 'callout' && (() => {
              const calloutData: CalloutData = typeof selectedBlock.content === 'object' && selectedBlock.content !== null
                ? (selectedBlock.content as CalloutData)
                : { type: 'info', body: typeof selectedBlock.content === 'string' ? selectedBlock.content : '' };
              
              return (
                <div className="space-y-3">
                  {/* Callout Presets */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Callout Style Preset
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(Object.keys(CALLOUT_PRESETS) as CalloutPresetType[]).map(pk => {
                        const p = CALLOUT_PRESETS[pk];
                        return (
                          <button
                            key={pk}
                            onClick={() => updateCalloutContent({
                              type: pk,
                              bgColor: p.bgColor,
                              borderColor: p.borderColor,
                              textColor: p.textColor,
                              accentColor: p.accentColor,
                            })}
                            className={`p-1.5 rounded-lg border text-center text-[10px] font-semibold transition-all ${
                              calloutData.type === pk
                                ? 'border-blue-500 bg-blue-950/40 text-white shadow-sm'
                                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.accentColor }} />
                              <span>{p.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Header Title
                    </span>
                    <input
                      type="text"
                      value={calloutData.title || ''}
                      onChange={(e) => updateCalloutContent({ title: e.target.value })}
                      placeholder="e.g. Important Note, Warning, Pro Tip..."
                      className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Colors */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Callout Colors
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Background</label>
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                          <input
                            type="color"
                            value={calloutData.bgColor || '#eff6ff'}
                            onChange={(e) => updateCalloutContent({ bgColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">{calloutData.bgColor || '#eff6ff'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Border & Accent</label>
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                          <input
                            type="color"
                            value={calloutData.borderColor || '#bfdbfe'}
                            onChange={(e) => updateCalloutContent({ borderColor: e.target.value, accentColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">{calloutData.borderColor || '#bfdbfe'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2C. TABLE PROPERTIES */}
            {selectedBlock.type === 'table' && (() => {
              const tableData: TableData = selectedBlock.content || { headers: ['Col 1', 'Col 2'], rows: [['', '']] };
              const addRow = () => {
                const newRows = [...(tableData.rows || []), new Array(tableData.headers.length).fill('')];
                onUpdateBlock(selectedBlock.id, { content: { ...tableData, rows: newRows } });
              };
              const deleteRow = () => {
                if ((tableData.rows || []).length <= 1) return;
                const newRows = tableData.rows.slice(0, -1);
                onUpdateBlock(selectedBlock.id, { content: { ...tableData, rows: newRows } });
              };
              const addCol = () => {
                const newHeaders = [...tableData.headers, `Col ${tableData.headers.length + 1}`];
                const newRows = (tableData.rows || []).map((r: string[]) => [...r, '']);
                onUpdateBlock(selectedBlock.id, { content: { ...tableData, headers: newHeaders, rows: newRows } });
              };
              const deleteCol = () => {
                if (tableData.headers.length <= 1) return;
                const newHeaders = tableData.headers.slice(0, -1);
                const newRows = (tableData.rows || []).map((r: string[]) => r.slice(0, -1));
                onUpdateBlock(selectedBlock.id, { content: { ...tableData, headers: newHeaders, rows: newRows } });
              };
              
              return (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Table Structure ({tableData.rows?.length || 0} rows × {tableData.headers.length} cols)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={addRow}
                        className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteRow}
                        disabled={(tableData.rows || []).length <= 1}
                        className="w-full h-8 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Row</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={addCol}
                        className="w-full h-8 bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Col</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteCol}
                        disabled={tableData.headers.length <= 1}
                        className="w-full h-8 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Col</span>
                      </Button>
                    </div>
                  </div>

                  {/* Table Text Color Styling */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Text & Typography Colors
                    </span>

                    {/* Table-wide Text Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block">Table Text Color</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1 flex-1">
                          <input
                            type="color"
                            value={tableData.textColor || selectedBlock.style?.color || '#0f172a'}
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateBlock(selectedBlock.id, {
                                content: { ...tableData, textColor: val },
                                style: { ...selectedBlock.style, color: val }
                              });
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {tableData.textColor || selectedBlock.style?.color || '#0f172a'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Header Specific Text Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block">Header Text Color</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1 flex-1">
                          <input
                            type="color"
                            value={tableData.headerTextColor || tableData.textColor || '#0f172a'}
                            onChange={(e) => {
                              onUpdateBlock(selectedBlock.id, {
                                content: { ...tableData, headerTextColor: e.target.value }
                              });
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {tableData.headerTextColor || tableData.textColor || '#0f172a'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Color Swatches */}
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">Quick Text Swatches</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: 'Dark', val: '#0f172a' },
                          { label: 'White', val: '#ffffff' },
                          { label: 'Slate', val: '#475569' },
                          { label: 'Blue', val: '#2563eb' },
                          { label: 'Emerald', val: '#059669' },
                          { label: 'Amber', val: '#d97706' },
                          { label: 'Red', val: '#dc2626' },
                          { label: 'Purple', val: '#7c3aed' },
                        ].map(c => (
                          <button
                            key={c.val}
                            type="button"
                            onClick={() => {
                              onUpdateBlock(selectedBlock.id, {
                                content: { ...tableData, textColor: c.val, headerTextColor: c.val },
                                style: { ...selectedBlock.style, color: c.val }
                              });
                            }}
                            className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                            style={{ backgroundColor: c.val }}
                            title={`Set text to ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2D. DIAGRAM PROPERTIES */}
            {selectedBlock.type === 'diagram' && (() => {
              const diagramData: DiagramData = selectedBlock.content || { nodes: [], connections: [] };

              const applyLayout = (mode: 'horizontal' | 'vertical' | 'tree') => {
                const nodes = [...(diagramData.nodes || [])];
                if (nodes.length === 0) return;

                if (mode === 'horizontal') {
                  const spacingX = 140;
                  const startX = 20;
                  const centerY = 90;
                  nodes.forEach((n, i) => {
                    n.x = startX + i * spacingX;
                    n.y = centerY;
                  });
                } else if (mode === 'vertical') {
                  const spacingY = 80;
                  const centerX = 160;
                  const startY = 20;
                  nodes.forEach((n, i) => {
                    n.x = centerX;
                    n.y = startY + i * spacingY;
                  });
                } else if (mode === 'tree') {
                  const root = nodes[0];
                  if (root) {
                    root.x = 160;
                    root.y = 20;
                  }
                  const children = nodes.slice(1);
                  const childSpacingX = 120;
                  const startChildX = Math.max(10, 160 - ((children.length - 1) * childSpacingX) / 2);
                  children.forEach((c, idx) => {
                    c.x = startChildX + idx * childSpacingX;
                    c.y = 120;
                  });
                }

                onUpdateBlock(selectedBlock.id, {
                  content: { ...diagramData, nodes, layout: mode }
                });
              };

              const addDiagramNode = () => {
                const nextIdx = (diagramData.nodes || []).length + 1;
                const newNode: DiagramNode = {
                  id: `node-${Date.now()}-${nextIdx}`,
                  label: `Step ${nextIdx}`,
                  x: 30 + (nextIdx - 1) * 40,
                  y: 30 + (nextIdx - 1) * 30,
                  width: 100,
                  height: 44,
                  shape: 'rectangle',
                  nodeType: 'process',
                  color: '#3b82f6',
                  textColor: '#ffffff',
                };
                const newNodes = [...(diagramData.nodes || []), newNode];
                const newConns = [...(diagramData.connections || [])];
                if (diagramData.nodes && diagramData.nodes.length > 0) {
                  const prevNode = diagramData.nodes[diagramData.nodes.length - 1];
                  newConns.push({
                    id: `conn-${Date.now()}`,
                    from: prevNode.id,
                    to: newNode.id,
                    type: 'arrow',
                  });
                }
                onUpdateBlock(selectedBlock.id, {
                  content: { ...diagramData, nodes: newNodes, connections: newConns }
                });
              };

              return (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Flow Graph ({diagramData.nodes?.length || 0} nodes, {diagramData.connections?.length || 0} links)
                      </span>
                      <Button
                        size="sm"
                        onClick={addDiagramNode}
                        className="h-6 px-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Step</span>
                      </Button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Auto Layout Engines
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => applyLayout('horizontal')}
                        className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 transition-all"
                        title="Horizontal Flow A → B → C"
                      >
                        <span>Horiz. Flow</span>
                      </button>
                      <button
                        onClick={() => applyLayout('vertical')}
                        className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 transition-all"
                        title="Vertical Flow A ↓ B ↓ C"
                      >
                        <span>Vert. Flow</span>
                      </button>
                      <button
                        onClick={() => applyLayout('tree')}
                        className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 transition-all"
                        title="Tree hierarchy layout"
                      >
                        <span>Tree Flow</span>
                      </button>
                    </div>
                  </div>

                  {/* Diagram Text & Label Color Styling */}
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Node Text & Label Colors
                    </span>

                    {/* All Nodes Text Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block">Node Text Color (All Nodes)</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1 flex-1">
                          <input
                            type="color"
                            value={diagramData.nodes?.[0]?.textColor || '#ffffff'}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedNodes = (diagramData.nodes || []).map(n => ({
                                ...n,
                                textColor: val
                              }));
                              onUpdateBlock(selectedBlock.id, {
                                content: { ...diagramData, nodes: updatedNodes },
                                style: { ...selectedBlock.style, color: val }
                              });
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          />
                          <span className="text-[10px] font-mono text-slate-300 truncate">
                            {diagramData.nodes?.[0]?.textColor || '#ffffff'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Swatches for Diagram Text */}
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">Quick Label Swatches</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: 'White', val: '#ffffff' },
                          { label: 'Dark', val: '#0f172a' },
                          { label: 'Amber', val: '#fef08a' },
                          { label: 'Cyan', val: '#67e8f9' },
                          { label: 'Emerald', val: '#6ee7b7' },
                          { label: 'Rose', val: '#fda4af' },
                          { label: 'Violet', val: '#c4b5fd' },
                        ].map(c => (
                          <button
                            key={c.val}
                            type="button"
                            onClick={() => {
                              const updatedNodes = (diagramData.nodes || []).map(n => ({
                                ...n,
                                textColor: c.val
                              }));
                              onUpdateBlock(selectedBlock.id, {
                                content: { ...diagramData, nodes: updatedNodes },
                                style: { ...selectedBlock.style, color: c.val }
                              });
                            }}
                            className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                            style={{ backgroundColor: c.val }}
                            title={`Set diagram text to ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2E. IMAGE PROPERTIES */}
            {selectedBlock.type === 'image' && (
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Image Settings
                </span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Image URL</label>
                  <input
                    type="text"
                    value={selectedBlock.content?.url || ''}
                    onChange={(e) => onUpdateBlock(selectedBlock.id, { content: { ...selectedBlock.content, url: e.target.value } })}
                    placeholder="https://..."
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Caption</label>
                  <input
                    type="text"
                    value={selectedBlock.content?.caption || ''}
                    onChange={(e) => onUpdateBlock(selectedBlock.id, { content: { ...selectedBlock.content, caption: e.target.value } })}
                    placeholder="Optional caption..."
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 2F. CODE BLOCK PROPERTIES */}
            {selectedBlock.type === 'code' && (
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Code Block Language
                </span>
                <select
                  value={selectedBlock.content?.language || 'javascript'}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { 
                    content: typeof selectedBlock.content === 'object' && selectedBlock.content !== null
                      ? { ...selectedBlock.content, language: e.target.value }
                      : { code: selectedBlock.content || '', language: e.target.value }
                  })}
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                >
                  {['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash', 'markdown'].map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2G. TEXT & HEADING TYPOGRAPHY */}
            {['text', 'heading', 'bullet', 'numbered', 'checklist'].includes(selectedBlock.type) && (
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Typography & Style
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Font Family</label>
                    <select
                      value={selectedBlock.style?.fontFamily || 'Inter'}
                      onChange={(e) => updateBlockStyle({ fontFamily: e.target.value })}
                      className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                    >
                      {FONT_FAMILIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Font Size</label>
                    <select
                      value={selectedBlock.style?.fontSize || 15}
                      onChange={(e) => updateBlockStyle({ fontSize: Number(e.target.value) })}
                      className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none"
                    >
                      {FONT_SIZES.map(s => (
                        <option key={s} value={s}>{s}px</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateBlockStyle({ bold: !selectedBlock.style?.bold })}
                      className={`p-1.5 rounded-lg border ${selectedBlock.style?.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockStyle({ italic: !selectedBlock.style?.italic })}
                      className={`p-1.5 rounded-lg border ${selectedBlock.style?.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockStyle({ underline: !selectedBlock.style?.underline })}
                      className={`p-1.5 rounded-lg border ${selectedBlock.style?.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateBlockStyle({ strikethrough: !selectedBlock.style?.strikethrough })}
                      className={`p-1.5 rounded-lg border ${selectedBlock.style?.strikethrough ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Color:</span>
                    <input
                      type="color"
                      value={selectedBlock.style?.color || '#ffffff'}
                      onChange={(e) => updateBlockStyle({ color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Alignment */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Text Alignment</span>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      { align: 'left' as const, icon: <AlignLeft className="w-3.5 h-3.5" /> },
                      { align: 'center' as const, icon: <AlignCenter className="w-3.5 h-3.5" /> },
                      { align: 'right' as const, icon: <AlignRight className="w-3.5 h-3.5" /> },
                      { align: 'justify' as const, icon: <AlignJustify className="w-3.5 h-3.5" /> },
                    ] as const).map(a => (
                      <button
                        key={a.align}
                        onClick={() => updateBlockStyle({ align: a.align })}
                        className={`p-1 rounded-lg border flex items-center justify-center ${
                          (selectedBlock.style?.align || 'left') === a.align
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {a.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. DIMENSIONS & PAGE ALIGNMENT (Positioned blocks) */}
            {selectedBlock.layoutType === 'positioned' && (
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dimensions & Snapping
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Width</label>
                    <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-slate-200 border border-slate-700">
                      <input
                        type="number"
                        value={selectedBlock.width || 180}
                        onChange={(e) => onUpdateBlock(selectedBlock.id, { width: Math.max(40, Number(e.target.value)) })}
                        className="w-full bg-transparent outline-none text-xs"
                      />
                      <span className="text-[10px] text-slate-500">px</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Height</label>
                    <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-slate-200 border border-slate-700">
                      <input
                        type="number"
                        value={selectedBlock.height || 80}
                        onChange={(e) => onUpdateBlock(selectedBlock.id, { height: Math.max(30, Number(e.target.value)) })}
                        className="w-full bg-transparent outline-none text-xs"
                      />
                      <span className="text-[10px] text-slate-500">px</span>
                    </div>
                  </div>
                </div>

                {/* 3. ALIGNMENT & DISTRIBUTION */}
                <div className="pt-1 space-y-3">
                  {/* Selection Alignment (when 2+ objects selected) */}
                  {selectedBlocks && selectedBlocks.length > 1 && onAlignSelected && (
                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-300">
                          Align Selected ({selectedBlocks.length} items)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => onAlignSelected('left')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Align all to left edge of selection bounding box"
                        >
                          Align Left
                        </button>
                        <button
                          onClick={() => onAlignSelected('center')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Center horizontally within selection bounds"
                        >
                          Center
                        </button>
                        <button
                          onClick={() => onAlignSelected('right')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Align all to right edge of selection bounding box"
                        >
                          Align Right
                        </button>
                        <button
                          onClick={() => onAlignSelected('top')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Align all to top edge of selection bounding box"
                        >
                          Align Top
                        </button>
                        <button
                          onClick={() => onAlignSelected('middle')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Middle vertically within selection bounds"
                        >
                          Middle
                        </button>
                        <button
                          onClick={() => onAlignSelected('bottom')}
                          className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-800/60 text-[10px] font-semibold text-blue-200 border border-blue-700/40"
                          title="Align all to bottom edge of selection bounding box"
                        >
                          Align Bottom
                        </button>
                      </div>

                      {/* Distribution for 3+ items */}
                      {selectedBlocks.length >= 3 && (
                        <div className="pt-1 border-t border-blue-800/40 flex items-center gap-1.5">
                          <button
                            onClick={() => onAlignSelected('distribute-h')}
                            className="flex-1 py-1 px-1.5 rounded bg-blue-900/30 hover:bg-blue-800/50 text-[10px] font-semibold text-blue-200 border border-blue-700/30"
                            title="Distribute evenly across horizontal space"
                          >
                            Distribute Horiz.
                          </button>
                          <button
                            onClick={() => onAlignSelected('distribute-v')}
                            className="flex-1 py-1 px-1.5 rounded bg-blue-900/30 hover:bg-blue-800/50 text-[10px] font-semibold text-blue-200 border border-blue-700/30"
                            title="Distribute evenly across vertical space"
                          >
                            Distribute Vert.
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explicit Align to Page Margins */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Align to Page Margins</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => onAlignPage ? onAlignPage('left') : alignPositioned('left')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Align object to page left margin"
                      >
                        Page Left
                      </button>
                      <button
                        onClick={() => onAlignPage ? onAlignPage('center') : alignPositioned('center')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Center object horizontally on page"
                      >
                        Page Center
                      </button>
                      <button
                        onClick={() => onAlignPage ? onAlignPage('right') : alignPositioned('right')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Align object to page right margin"
                      >
                        Page Right
                      </button>
                      <button
                        onClick={() => onAlignPage ? onAlignPage('top') : alignPositioned('top')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Align object to page top margin"
                      >
                        Page Top
                      </button>
                      <button
                        onClick={() => onAlignPage ? onAlignPage('middle') : alignPositioned('middle')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Center object vertically on page"
                      >
                        Page Middle
                      </button>
                      <button
                        onClick={() => onAlignPage ? onAlignPage('bottom') : alignPositioned('bottom')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                        title="Align object to page bottom margin"
                      >
                        Page Bottom
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LAYERS & LOCKING */}
            {selectedBlock.layoutType === 'positioned' && (
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Layer & Arrange
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.min(100, (selectedBlock.zIndex || 20) + 5) })}
                    className="h-7 text-xs border-slate-700 hover:bg-slate-700 gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Bring Front</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateBlock(selectedBlock.id, { zIndex: Math.max(5, (selectedBlock.zIndex || 20) - 5) })}
                    className="h-7 text-xs border-slate-700 hover:bg-slate-700 gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Send Back</span>
                  </Button>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Lock Position</span>
                  <button
                    onClick={() => onUpdateBlock(selectedBlock.id, { locked: !selectedBlock.locked })}
                    className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold ${
                      selectedBlock.locked 
                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {selectedBlock.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{selectedBlock.locked ? 'Locked' : 'Unlocked'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2B: PAGE & LAYOUT STUDIO (When NOTHING is Selected)
            ======================================================== */}
        {activeTab === 'properties' && !selectedBlock && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. SMART PAGE AUTO-LAYOUT STUDIO */}
            <div className="p-3 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-900/50 space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Page Auto-Layout</h4>
                  <p className="text-[10px] text-slate-400">Instantly balance and arrange page objects</p>
                </div>
              </div>

              {onAutoLayout && (
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <button
                    onClick={() => onAutoLayout('stack')}
                    className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Rows className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">Vertical Stack</div>
                      <div className="text-[10px] text-slate-400">Orders content from top to bottom with clean 20px spacing</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onAutoLayout('grid')}
                    className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">2-Column Grid</div>
                      <div className="text-[10px] text-slate-400">Balances cards and shapes in a structured dual column</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onAutoLayout('horizontal')}
                    className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">Horizontal Row</div>
                      <div className="text-[10px] text-slate-400">Places visual components side-by-side with smart wrapping</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onAutoLayout('diagram')}
                    className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-teal-600/20 text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <GitCommit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">Diagram / Flow Cascade</div>
                      <div className="text-[10px] text-slate-400">Arranges process steps and relational nodes in a balanced vertical sequence</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. PAGE GEOMETRY & SETTINGS */}
            {settings && onSettingsChange && (
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-white text-xs">Page Dimensions</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Page Format</label>
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

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Orientation</label>
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

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Margins</label>
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
              </div>
            )}

            {/* 3. DOCUMENT PAGE OPERATIONS */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Page Management
              </span>
              <div className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800">
                <span>Active Page</span>
                <span className="font-bold text-white">Page {currentPageNumber} of {totalPages}</span>
              </div>

              {canEdit && onAddPage && (
                <Button
                  size="sm"
                  onClick={onAddPage}
                  className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 shadow-sm mt-1"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Add New Page</span>
                </Button>
              )}

              {canEdit && onDuplicatePage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDuplicatePage}
                  className="w-full h-8 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate Current Page</span>
                </Button>
              )}

              {canEdit && onDeletePage && totalPages > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeletePage}
                  className="w-full h-8 bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Current Page</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
