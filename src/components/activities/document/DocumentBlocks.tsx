import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  DocumentBlock, 
  BlockType, 
  ChecklistItem, 
  TableData, 
  DiagramData, 
  DiagramNode, 
  DiagramConnection, 
  DiagramNodeShape,
  DiagramNodeType,
  DiagramConnectionType,
  ShapeData, 
  ShapeType,
  QuoteData,
  QUOTE_PRESETS,
  QuotePresetStyle,
  CalloutData,
  CALLOUT_PRESETS,
  CalloutPresetType,
  BlockComment,
  SHARED_PALETTE,
  FONT_SIZES,
  FONT_FAMILIES
} from "@/lib/types/document";
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Trash2, 
  Copy, 
  Plus, 
  Check, 
  CheckSquare, 
  Square, 
  Circle,
  MessageSquare, 
  ChevronUp, 
  ChevronDown,
  Info,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
  Move,
  Lock,
  Unlock,
  RotateCw,
  Palette,
  Highlighter,
  Type,
  GitCommit,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Sparkles,
  Layers,
  Shapes
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentBlockProps {
  block: DocumentBlock;
  pageId: string;
  isHost: boolean;
  canEdit: boolean;
  userName: string;
  userColor: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updatedBlock: Partial<DocumentBlock>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  collaboratorsOnBlock?: { userName: string; userColor: string }[];
}

export const DocumentBlockRenderer: React.FC<DocumentBlockProps> = ({
  block,
  pageId,
  isHost,
  canEdit,
  userName,
  userColor,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onBringForward,
  onSendBackward,
  collaboratorsOnBlock = [],
}) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: BlockComment = {
      id: `c_${Date.now()}`,
      author: userName,
      text: commentText.trim(),
      timestamp: Date.now(),
    };
    const currentComments = block.comments || [];
    onUpdate({ comments: [...currentComments, newComment] });
    setCommentText("");
    setShowCommentInput(false);
  };

  const handleDeleteComment = (commentId: string) => {
    const currentComments = block.comments || [];
    onUpdate({ comments: currentComments.filter(c => c.id !== commentId) });
  };

  const isPositioned = block.layoutType === 'positioned';
  const isLocked = !!block.locked;

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative transition-all duration-150 rounded-lg ${
        isSelected 
          ? "ring-2 ring-blue-500/80 bg-blue-500/[0.02]" 
          : "hover:bg-slate-100/40 dark:hover:bg-white/[0.02]"
      } ${!isPositioned ? 'my-2.5 px-3 py-1.5' : 'p-1'}`}
      style={{
        position: isPositioned ? 'absolute' : 'relative',
        left: isPositioned ? `${block.x || 0}px` : undefined,
        top: isPositioned ? `${block.y || 0}px` : undefined,
        width: block.width ? `${block.width}px` : undefined,
        height: block.height ? `${block.height}px` : undefined,
        zIndex: block.zIndex || (isSelected ? 35 : 15),
      }}
    >
      {/* Remote collaborators badge */}
      {collaboratorsOnBlock.length > 0 && (
        <div className="absolute -top-3.5 right-2 flex items-center gap-1 z-40 pointer-events-none">
          {collaboratorsOnBlock.map((c, i) => (
            <span 
              key={i}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shadow-sm flex items-center gap-1"
              style={{ backgroundColor: c.userColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {c.userName}
            </span>
          ))}
        </div>
      )}

      {/* COMPACT OBJECT DELETE CONTROL (Section 3, 4 & 69: Only handles and Delete remain on selected object) */}
      {isSelected && canEdit && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-50 w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg border-2 border-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
          title="Delete Block (Del / Backspace)"
          aria-label="Delete Block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main Block Content */}
      <div className="w-full">
        {renderBlockTypeContent(block, canEdit && !isLocked, onUpdate, isSelected)}
      </div>

      {/* Contextual Comments Section */}
      {((block.comments && block.comments.length > 0) || showCommentInput) && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          {block.comments && block.comments.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {block.comments.map((comm) => (
                <div key={comm.id} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-1.5 rounded flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-amber-900 dark:text-amber-400 mr-1.5">{comm.author}:</span>
                    <span className="text-slate-800 dark:text-slate-200">{comm.text}</span>
                  </div>
                  {canEdit && (
                    <button 
                      onClick={() => handleDeleteComment(comm.id)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {showCommentInput && canEdit && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment for group..."
                className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button size="sm" variant="default" onClick={handleAddComment} className="h-7 text-xs px-2.5">
                Post
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function renderBlockTypeContent(
  block: DocumentBlock, 
  canEdit: boolean, 
  onUpdate: (updatedBlock: Partial<DocumentBlock>) => void,
  isSelected?: boolean
) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'text':
      return <TextBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'bullet':
      return <BulletListBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'numbered':
      return <NumberedListBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'checklist':
      return <ChecklistBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'table':
      return <TableBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'quote':
      return <QuoteBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'divider':
      return <DividerBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'callout':
      return <CalloutBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'code':
      return <CodeBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'shape':
      return <ShapeBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    case 'diagram':
      return <DiagramBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} isSelected={isSelected} />;
    case 'image':
      return <ImageBlockContent block={block} canEdit={canEdit} onUpdate={onUpdate} />;
    default:
      return <div>Unknown block type</div>;
  }
}

// 1. Heading Block
const HeadingBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const level = block.headingLevel || 1;
  const content = typeof block.content === 'string' ? block.content : '';

  const classes = {
    1: "text-2xl md:text-3xl font-bold tracking-tight",
    2: "text-xl md:text-2xl font-semibold tracking-tight",
    3: "text-lg md:text-xl font-medium",
  }[level];

  const style: React.CSSProperties = {
    textAlign: block.style?.align || 'left',
    color: block.style?.color || '#0f172a',
    backgroundColor: block.style?.bgColor || 'transparent',
    fontFamily: block.style?.fontFamily || 'Inter',
    fontWeight: block.style?.bold ? 'bold' : undefined,
    fontStyle: block.style?.italic ? 'italic' : undefined,
    textDecoration: [
      block.style?.underline ? 'underline' : '',
      block.style?.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
  };

  return (
    <input
      type="text"
      disabled={!canEdit}
      value={content}
      onChange={(e) => onUpdate({ content: e.target.value })}
      placeholder={`Heading ${level}...`}
      style={style}
      className={`w-full bg-transparent border-none outline-none focus:ring-0 p-0 ${classes}`}
    />
  );
};

// 2. Text / Paragraph Block
const TextBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const content = typeof block.content === 'string' ? block.content : '';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const style: React.CSSProperties = {
    textAlign: block.style?.align || 'left',
    color: block.style?.color || '#334155',
    backgroundColor: block.style?.bgColor || 'transparent',
    fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
    fontFamily: block.style?.fontFamily || 'Inter',
    fontWeight: block.style?.bold ? 'bold' : 'normal',
    fontStyle: block.style?.italic ? 'italic' : 'normal',
    textDecoration: [
      block.style?.underline ? 'underline' : '',
      block.style?.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
  };

  return (
    <textarea
      ref={textareaRef}
      disabled={!canEdit}
      rows={1}
      value={content}
      onChange={(e) => onUpdate({ content: e.target.value })}
      placeholder="Type text here..."
      style={style}
      className="w-full resize-none overflow-hidden bg-transparent border-none outline-none focus:ring-0 p-0 text-sm md:text-base leading-relaxed"
    />
  );
};

// 3. Bullet List Block
const BulletListBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const items: string[] = Array.isArray(block.content) 
    ? block.content 
    : typeof block.content === 'string' 
      ? block.content.split('\n') 
      : ['First item'];

  const handleItemChange = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    onUpdate({ content: next });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...items];
      next.splice(index + 1, 0, '');
      onUpdate({ content: next });
    } else if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      const next = [...items];
      next.splice(index, 1);
      onUpdate({ content: next });
    }
  };

  return (
    <ul 
      className="list-disc list-outside pl-5 space-y-1 text-sm md:text-base"
      style={{
        color: block.style?.color || '#334155',
        fontFamily: block.style?.fontFamily || 'Inter',
      }}
    >
      {items.map((item, idx) => (
        <li key={idx} className="marker:text-blue-500">
          <input
            type="text"
            disabled={!canEdit}
            value={item}
            onChange={(e) => handleItemChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder="List item..."
            className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-inherit leading-normal"
          />
        </li>
      ))}
    </ul>
  );
};

// 4. Numbered List Block
const NumberedListBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const items: string[] = Array.isArray(block.content) 
    ? block.content 
    : ['First numbered item'];

  const handleItemChange = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    onUpdate({ content: next });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...items];
      next.splice(index + 1, 0, '');
      onUpdate({ content: next });
    } else if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      const next = [...items];
      next.splice(index, 1);
      onUpdate({ content: next });
    }
  };

  return (
    <ol 
      className="list-decimal list-outside pl-5 space-y-1 text-sm md:text-base"
      style={{
        color: block.style?.color || '#334155',
        fontFamily: block.style?.fontFamily || 'Inter',
      }}
    >
      {items.map((item, idx) => (
        <li key={idx} className="marker:font-semibold marker:text-blue-600">
          <input
            type="text"
            disabled={!canEdit}
            value={item}
            onChange={(e) => handleItemChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder="Numbered item..."
            className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-inherit leading-normal"
          />
        </li>
      ))}
    </ol>
  );
};

// 5. Checklist Block
const ChecklistBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const items: ChecklistItem[] = Array.isArray(block.content)
    ? block.content
    : [{ id: 'c1', text: 'Task item', checked: false }];

  const handleToggle = (id: string) => {
    if (!canEdit) return;
    const next = items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it));
    onUpdate({ content: next });
  };

  const handleTextChange = (id: string, text: string) => {
    const next = items.map((it) => (it.id === id ? { ...it, text } : it));
    onUpdate({ content: next });
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItem: ChecklistItem = { id: `c_${Date.now()}`, text: '', checked: false };
      const next = [...items];
      next.splice(idx + 1, 0, newItem);
      onUpdate({ content: next });
    } else if (e.key === 'Backspace' && items[idx].text === '' && items.length > 1) {
      e.preventDefault();
      const next = [...items];
      next.splice(idx, 1);
      onUpdate({ content: next });
    }
  };

  return (
    <div className="space-y-1.5 text-sm md:text-base">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group/item">
          <button
            type="button"
            onClick={() => handleToggle(item.id)}
            disabled={!canEdit}
            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
              item.checked 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-slate-400 dark:border-slate-600 hover:border-blue-500'
            }`}
          >
            {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
          <input
            type="text"
            disabled={!canEdit}
            value={item.text}
            onChange={(e) => handleTextChange(item.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder="Checklist task..."
            className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-800 dark:text-slate-200 ${
              item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''
            }`}
          />
        </div>
      ))}
    </div>
  );
};

// 6. Blockquote Block (Complete Rebuild)
const QuoteBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const quoteData: QuoteData = typeof block.content === 'object' && block.content !== null
    ? block.content
    : {
        text: typeof block.content === 'string' ? block.content : 'Notable insight or quote...',
        author: '',
        quoteStyle: 'default',
        bgColor: '#f8fafc',
        textColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 4,
        borderStyle: 'solid',
        accentColor: '#3b82f6',
        fontSize: 15,
        italic: true,
        bold: false,
        align: 'left',
        padding: 14,
        borderRadius: 8,
      };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [quoteData.text]);

  const updateQuote = (updates: Partial<QuoteData>) => {
    onUpdate({ content: { ...quoteData, ...updates } });
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: quoteData.bgColor !== undefined ? quoteData.bgColor : '#f8fafc',
    borderColor: quoteData.borderColor || '#e2e8f0',
    borderWidth: '1px',
    borderStyle: quoteData.borderStyle || 'solid',
    borderLeftWidth: `${quoteData.borderWidth !== undefined ? quoteData.borderWidth : 4}px`,
    borderLeftColor: quoteData.accentColor || '#3b82f6',
    borderLeftStyle: 'solid',
    borderRadius: `${quoteData.borderRadius !== undefined ? quoteData.borderRadius : 8}px`,
    padding: `${quoteData.padding !== undefined ? quoteData.padding : 14}px`,
    textAlign: quoteData.align || 'left',
  };

  const textStyle: React.CSSProperties = {
    color: quoteData.textColor || '#334155',
    fontSize: quoteData.fontSize ? `${quoteData.fontSize}px` : '15px',
    fontStyle: quoteData.italic !== false ? 'italic' : 'normal',
    fontWeight: quoteData.bold ? 'bold' : 'normal',
    textAlign: quoteData.align || 'left',
  };

  return (
    <div 
      className="relative my-2.5 transition-all shadow-sm group/quote select-text"
      style={containerStyle}
    >
      {/* Decorative Quote Mark */}
      <span 
        className="absolute top-1 left-2.5 select-none opacity-20 text-3xl font-serif pointer-events-none leading-none"
        style={{ color: quoteData.accentColor || '#3b82f6' }}
      >
        “
      </span>

      {/* Quote Body with Auto-grow & Natural Reflow (Never overflows) */}
      <textarea
        ref={textareaRef}
        disabled={!canEdit}
        rows={1}
        value={quoteData.text}
        onChange={(e) => updateQuote({ text: e.target.value })}
        placeholder="Enter quote or notable insight..."
        style={textStyle}
        className="w-full resize-none overflow-hidden bg-transparent border-none outline-none focus:ring-0 p-0 font-serif leading-relaxed"
      />

      {/* Quote Author / Source Attribution */}
      {(quoteData.author !== undefined || canEdit) && (
        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-xs text-slate-400 select-none font-sans">—</span>
          <input
            type="text"
            disabled={!canEdit}
            value={quoteData.author || ''}
            onChange={(e) => updateQuote({ author: e.target.value })}
            placeholder="Author / Source..."
            className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs font-medium text-slate-500 dark:text-slate-400 placeholder-slate-400/60 font-sans"
          />
        </div>
      )}
    </div>
  );
};

// 7. Divider / Separator Block
const DividerBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block }) => {
  return (
    <div className="py-2.5 my-1">
      <hr className="border-t border-slate-300 dark:border-slate-700" />
    </div>
  );
};

// 8. Table Block
const TableBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const data: TableData = block.content && block.content.headers ? block.content : {
    headers: ['Topic', 'Details', 'Status'],
    rows: [
      ['Concept A', 'Primary definition & notes', 'Reviewed'],
      ['Concept B', 'Key equations & proofs', 'Pending'],
    ]
  };

  const handleHeaderChange = (cIdx: number, val: string) => {
    const nextH = [...data.headers];
    nextH[cIdx] = val;
    onUpdate({ content: { ...data, headers: nextH } });
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const nextRows = data.rows.map((row, r) => {
      if (r !== rIdx) return row;
      const nextR = [...row];
      nextR[cIdx] = val;
      return nextR;
    });
    onUpdate({ content: { ...data, rows: nextRows } });
  };

  const addRow = () => {
    const emptyRow = data.headers.map(() => '');
    onUpdate({ content: { ...data, rows: [...data.rows, emptyRow] } });
  };

  const addColumn = () => {
    const nextHeaders = [...data.headers, `Col ${data.headers.length + 1}`];
    const nextRows = data.rows.map(r => [...r, '']);
    onUpdate({ content: { ...data, headers: nextHeaders, rows: nextRows } });
  };

  const removeRow = (rIdx: number) => {
    if (data.rows.length <= 1) return;
    const nextRows = data.rows.filter((_, i) => i !== rIdx);
    onUpdate({ content: { ...data, rows: nextRows } });
  };

  const removeColumn = (cIdx: number) => {
    if (data.headers.length <= 1) return;
    const nextHeaders = data.headers.filter((_, i) => i !== cIdx);
    const nextRows = data.rows.map(r => r.filter((_, i) => i !== cIdx));
    onUpdate({ content: { ...data, headers: nextHeaders, rows: nextRows } });
  };

  const defaultTableTextColor = data.textColor || block.style?.color;
  const headerTextColor = data.headerTextColor || defaultTableTextColor;

  return (
    <div className="w-full my-1.5 overflow-x-auto custom-scrollbar touch-pan-x select-text" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="min-w-full inline-block align-middle">
        <table className="w-full min-w-[420px] border-collapse border border-slate-300 dark:border-slate-700 text-xs md:text-sm shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {data.headers.map((h, i) => (
                <th 
                  key={i} 
                  className="border border-slate-300 dark:border-slate-700 p-2 text-left font-semibold text-slate-800 dark:text-slate-100 group/th relative"
                  style={{ color: headerTextColor || undefined }}
                >
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={h}
                    onChange={(e) => handleHeaderChange(i, e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 font-semibold"
                    style={{ color: headerTextColor || undefined }}
                  />
                  {canEdit && data.headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(i)}
                      className="opacity-0 group-hover/th:opacity-100 absolute top-1 right-1 text-slate-400 hover:text-red-500 transition-opacity"
                      title="Remove column"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
              {canEdit && (
                <th className="border border-slate-300 dark:border-slate-700 p-1 w-8 text-center bg-slate-50 dark:bg-slate-900">
                  <button onClick={addColumn} className="text-blue-500 hover:text-blue-700" title="Add column">
                    <Plus className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group/tr">
                {row.map((cell, cIdx) => {
                  const cellKey = `${rIdx}_${cIdx}`;
                  const cellBg = data.cellBgColors?.[cellKey];
                  const cellColor = data.cellTextColors?.[cellKey] || defaultTableTextColor;

                  return (
                    <td 
                      key={cIdx} 
                      className="border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-200"
                      style={{
                        backgroundColor: cellBg || undefined,
                        color: cellColor || undefined,
                      }}
                    >
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={cell}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 p-0"
                        style={{ color: cellColor || undefined }}
                      />
                    </td>
                  );
                })}
                {canEdit && (
                  <td className="border border-slate-300 dark:border-slate-700 p-1 w-8 text-center bg-slate-50 dark:bg-slate-900">
                    {data.rows.length > 1 && (
                      <button 
                        onClick={() => removeRow(rIdx)} 
                        className="opacity-0 group-hover/tr:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <div className="flex items-center gap-2 mt-1.5">
            <button 
              onClick={addRow} 
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 9. Callout Block (Complete Rebuild)
const CalloutBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const calloutData: CalloutData = typeof block.content === 'object' && block.content !== null
    ? block.content
    : {
        title: '',
        body: typeof block.content === 'string' ? block.content : '',
        type: (block.calloutType as CalloutPresetType) || 'info',
        bgColor: '',
        borderColor: '',
        textColor: '',
        accentColor: '',
      };

  const preset = CALLOUT_PRESETS[calloutData.type] || CALLOUT_PRESETS.info;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [calloutData.body]);

  const updateCallout = (updates: Partial<CalloutData>) => {
    onUpdate({ content: { ...calloutData, ...updates } });
  };

  const iconMap: Record<CalloutPresetType, React.ReactNode> = {
    info: <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: calloutData.accentColor || preset.accentColor }} />,
    success: <Check className="w-4 h-4 shrink-0 mt-0.5 stroke-[2.5]" style={{ color: calloutData.accentColor || preset.accentColor }} />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: calloutData.accentColor || preset.accentColor }} />,
    danger: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: calloutData.accentColor || preset.accentColor }} />,
    tip: <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: calloutData.accentColor || preset.accentColor }} />,
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: calloutData.bgColor || preset.bgColor,
    borderColor: calloutData.borderColor || preset.borderColor,
    borderLeftColor: calloutData.accentColor || preset.accentColor,
    borderLeftWidth: '4px',
    color: calloutData.textColor || preset.textColor,
  };

  return (
    <div 
      className="p-3.5 rounded-xl border flex items-start gap-3 my-2.5 shadow-sm transition-all select-text"
      style={containerStyle}
    >
      {iconMap[calloutData.type] || iconMap.info}
      <div className="flex-1 space-y-1">
        {(calloutData.title !== undefined || canEdit) && (
          <input
            type="text"
            disabled={!canEdit}
            value={calloutData.title || ''}
            onChange={(e) => updateCallout({ title: e.target.value })}
            placeholder="Callout Title (Optional)..."
            className="w-full bg-transparent border-none outline-none font-bold text-xs md:text-sm placeholder-slate-400"
            style={{ color: calloutData.textColor || preset.textColor }}
          />
        )}
        <textarea
          ref={textareaRef}
          disabled={!canEdit}
          rows={1}
          value={calloutData.body}
          onChange={(e) => updateCallout({ body: e.target.value })}
          placeholder="Add callout note or instruction..."
          className="w-full resize-none bg-transparent border-none outline-none focus:ring-0 p-0 text-xs md:text-sm leading-relaxed"
          style={{ color: calloutData.textColor || preset.textColor }}
        />
      </div>
    </div>
  );
};

// 10. Code Block
const CodeBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const code = typeof block.content === 'string' ? block.content : '// Type code here\nconsole.log("CoAct Studio");';
  const lang = block.codeLanguage || 'javascript';

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#0f172a] text-slate-100 font-mono text-xs md:text-sm shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e293b] border-b border-slate-800">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{lang}</span>
        <button
          onClick={copyCode}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <textarea
        disabled={!canEdit}
        rows={Math.max(3, code.split('\n').length)}
        value={code}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="// Code snippet..."
        className="w-full resize-none p-3 bg-transparent border-none outline-none focus:ring-0 text-inherit leading-relaxed font-mono"
      />
    </div>
  );
};

// 11. Shape Block (Transformable, Inner Text, Resizable, Fill & Border Styles)
const ShapeBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const shapeData: ShapeData = block.content?.shapeType ? block.content : {
    shapeType: 'rectangle',
    label: 'Shape',
    color: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderStyle: 'solid',
    opacity: 1,
    textColor: '#1e3a8a',
  };

  const st = shapeData.shapeType;
  const isRect = st === 'rectangle';
  const isRounded = st === 'rounded';
  const isCircle = st === 'circle';
  const isDiamond = st === 'diamond';
  const isPill = st === 'pill';
  const isArrow = st === 'arrow';
  const isLine = st === 'line';

  const w = block.width || (isCircle ? 100 : isLine ? 160 : 180);
  const h = block.height || (isCircle ? 100 : isLine ? 20 : 80);

  const containerStyle: React.CSSProperties = {
    width: `${w}px`,
    height: `${h}px`,
    opacity: shapeData.opacity !== undefined ? shapeData.opacity : 1,
  };

  const shapeSurfaceStyle: React.CSSProperties = {
    backgroundColor: shapeData.color || '#dbeafe',
    borderColor: shapeData.borderColor || '#3b82f6',
    borderWidth: `${shapeData.borderWidth !== undefined ? shapeData.borderWidth : 2}px`,
    borderStyle: shapeData.borderStyle || 'solid',
    borderRadius: isRounded ? '16px' : isPill ? '9999px' : isCircle ? '50%' : isRect ? '6px' : '0px',
    color: shapeData.textColor || '#0f172a',
  };

  return (
    <div 
      className="relative group/shape flex items-center justify-center select-none"
      style={containerStyle}
    >
      {/* Standard Box, Rounded, Circle, Pill */}
      {(isRect || isRounded || isCircle || isPill) && (
        <div 
          className="w-full h-full flex items-center justify-center p-2 shadow-sm transition-all"
          style={shapeSurfaceStyle}
        >
          <input
            type="text"
            disabled={!canEdit}
            value={shapeData.label || ''}
            onChange={(e) => onUpdate({ content: { ...shapeData, label: e.target.value } })}
            placeholder="Label..."
            className="w-full text-center bg-transparent border-none outline-none font-semibold text-xs md:text-sm"
            style={{ color: shapeData.textColor || '#0f172a' }}
          />
        </div>
      )}

      {/* Diamond Decision Shape */}
      {isDiamond && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div 
            className="absolute inset-2 rotate-45 shadow-sm transition-all"
            style={shapeSurfaceStyle}
          />
          <div className="relative z-10 w-3/4 text-center">
            <input
              type="text"
              disabled={!canEdit}
              value={shapeData.label || ''}
              onChange={(e) => onUpdate({ content: { ...shapeData, label: e.target.value } })}
              placeholder="Decision..."
              className="w-full text-center bg-transparent border-none outline-none font-semibold text-xs"
              style={{ color: shapeData.textColor || '#0f172a' }}
            />
          </div>
        </div>
      )}

      {/* Arrow */}
      {isArrow && (
        <div className="w-full flex flex-col items-center justify-center">
          <input
            type="text"
            disabled={!canEdit}
            value={shapeData.label || ''}
            onChange={(e) => onUpdate({ content: { ...shapeData, label: e.target.value } })}
            placeholder="Arrow..."
            className="text-center bg-transparent border-none outline-none text-xs font-semibold mb-1"
            style={{ color: shapeData.textColor || '#0f172a' }}
          />
          <div 
            className="w-full h-2 relative flex items-center justify-end"
            style={{ backgroundColor: shapeData.color || '#3b82f6' }}
          >
            <div 
              className="w-0 h-0 border-y-8 border-y-transparent border-l-[14px] -mr-1"
              style={{ borderLeftColor: shapeData.color || '#3b82f6' }}
            />
          </div>
        </div>
      )}

      {/* Line */}
      {isLine && (
        <div 
          className="w-full h-1 my-auto"
          style={{ backgroundColor: shapeData.borderColor || '#64748b' }}
        />
      )}
    </div>
  );
};

// 12. Smart Diagram / Flow Engine (Dynamic SVG Connections, Auto-Layout, Node Dragging, Shapes)
const DiagramBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
  isSelected?: boolean;
}> = ({ block, canEdit, onUpdate, isSelected = false }) => {
  const data: DiagramData = block.content && block.content.nodes ? block.content : {
    nodes: [
      { id: 'n1', label: 'Start', x: 30, y: 70, width: 90, height: 40, shape: 'pill', color: '#2563eb', textColor: '#ffffff' },
      { id: 'n2', label: 'Process', x: 170, y: 70, width: 100, height: 40, shape: 'rectangle', color: '#059669', textColor: '#ffffff' },
      { id: 'n3', label: 'Decision', x: 320, y: 55, width: 100, height: 65, shape: 'diamond', color: '#d97706', textColor: '#ffffff' },
      { id: 'n4', label: 'End', x: 470, y: 70, width: 90, height: 40, shape: 'pill', color: '#7c3aed', textColor: '#ffffff' },
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2', type: 'arrow' },
      { id: 'c2', from: 'n2', to: 'n3', type: 'arrow' },
      { id: 'c3', from: 'n3', to: 'n4', type: 'arrow' },
    ],
  };

  const [isEditingFlow, setIsEditingFlow] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [quickFromId, setQuickFromId] = useState<string>('');
  const [quickToId, setQuickToId] = useState<string>('');
  const [showLinksList, setShowLinksList] = useState(false);

  const dragStartRef = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Automatically open editing flow when block is actively selected
  useEffect(() => {
    if (isSelected) {
      setIsEditingFlow(true);
    }
  }, [isSelected]);

  // Keep quick-link dropdown options synced with existing nodes
  useEffect(() => {
    if (data.nodes.length >= 2) {
      if (!quickFromId || !data.nodes.some(n => n.id === quickFromId)) {
        setQuickFromId(data.nodes[0].id);
      }
      if (!quickToId || !data.nodes.some(n => n.id === quickToId) || quickToId === data.nodes[0].id) {
        setQuickToId(data.nodes[1].id);
      }
    }
  }, [data.nodes, quickFromId, quickToId]);

  const isEditing = isEditingFlow && canEdit;

  // Complete & establish a connection between 2 nodes
  const establishConnection = (fromId: string, toId: string) => {
    if (!canEdit || !fromId || !toId || fromId === toId) return;
    const exists = (data.connections || []).some(c => c.from === fromId && c.to === toId);
    if (!exists) {
      const newConn: DiagramConnection = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        from: fromId,
        to: toId,
        type: 'arrow',
      };
      onUpdate({ content: { ...data, connections: [...(data.connections || []), newConn] } });
    }
    setConnectingFromId(null);
  };

  const deleteConnection = (connId: string) => {
    if (!canEdit) return;
    const nextConns = (data.connections || []).filter(c => c.id !== connId);
    onUpdate({ content: { ...data, connections: nextConns } });
  };

  // Dynamic node position dragging
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (!canEdit || !isEditing) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('button')) return;

    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    dragStartRef.current = {
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  };

  const handleNodePointerMove = (e: React.PointerEvent) => {
    if (!draggedNodeId || !dragStartRef.current) return;
    e.stopPropagation();

    const { id, startX, startY, nodeX, nodeY } = dragStartRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newX = Math.max(10, Math.min(1200, Math.round(nodeX + deltaX)));
    const newY = Math.max(10, Math.min(600, Math.round(nodeY + deltaY)));

    const nextNodes = data.nodes.map(n => n.id === id ? { ...n, x: newX, y: newY } : n);
    onUpdate({ content: { ...data, nodes: nextNodes } });
  };

  const handleNodePointerUp = (e: React.PointerEvent) => {
    if (draggedNodeId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggedNodeId(null);
      dragStartRef.current = null;
    }
  };

  const addNode = (shape: DiagramNodeShape = 'rectangle', color = '#2563eb') => {
    const newId = `n_${Date.now()}`;
    const count = data.nodes.length + 1;
    const label = shape === 'diamond' ? 'Decision' : shape === 'pill' ? (count === 1 ? 'Start' : 'End') : `Step ${count}`;
    const nextNodes = [
      ...data.nodes,
      {
        id: newId,
        label,
        x: 30 + (data.nodes.length * 130) % 400,
        y: 70 + (Math.floor(data.nodes.length / 3) * 60) % 180,
        width: shape === 'diamond' ? 95 : 100,
        height: shape === 'diamond' ? 60 : 40,
        shape,
        color,
        textColor: '#ffffff',
      }
    ];

    // If there is an existing selected node or previous node, establish automatic link
    let nextConns = [...(data.connections || [])];
    const prevNode = selectedNodeId ? data.nodes.find(n => n.id === selectedNodeId) : data.nodes[data.nodes.length - 1];
    if (prevNode) {
      nextConns.push({
        id: `c_${Date.now()}`,
        from: prevNode.id,
        to: newId,
        type: 'arrow',
      });
    }

    onUpdate({ content: { ...data, nodes: nextNodes, connections: nextConns } });
    setSelectedNodeId(newId);
  };

  const deleteNode = (nodeId: string) => {
    const nextNodes = data.nodes.filter(n => n.id !== nodeId);
    const nextConns = (data.connections || []).filter(c => c.from !== nodeId && c.to !== nodeId);
    onUpdate({ content: { ...data, nodes: nextNodes, connections: nextConns } });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connectingFromId === nodeId) setConnectingFromId(null);
  };

  const runLayout = (mode: 'horizontal' | 'vertical' | 'tree') => {
    const nodes = [...data.nodes];
    if (nodes.length === 0) return;

    if (mode === 'vertical') {
      const startX = 180;
      const startY = 30;
      const spacingY = 75;
      const layoutNodes = nodes.map((n, idx) => ({
        ...n,
        x: startX,
        y: startY + idx * spacingY,
      }));
      onUpdate({ content: { ...data, nodes: layoutNodes, layout: 'vertical' } });
    } else if (mode === 'horizontal') {
      const startX = 30;
      const startY = 65;
      const spacingX = 145;
      const layoutNodes = nodes.map((n, idx) => ({
        ...n,
        x: startX + idx * spacingX,
        y: startY,
      }));
      onUpdate({ content: { ...data, nodes: layoutNodes, layout: 'horizontal' } });
    } else {
      // Hierarchical Tree Layout
      const inDegree = new Map<string, number>();
      nodes.forEach(n => inDegree.set(n.id, 0));
      (data.connections || []).forEach(c => {
        inDegree.set(c.to, (inDegree.get(c.to) || 0) + 1);
      });

      const levels: string[][] = [[]];
      const visited = new Set<string>();

      nodes.forEach(n => {
        if ((inDegree.get(n.id) || 0) === 0) {
          levels[0].push(n.id);
          visited.add(n.id);
        }
      });

      if (levels[0].length === 0 && nodes.length > 0) {
        levels[0].push(nodes[0].id);
        visited.add(nodes[0].id);
      }

      let currentLevel = 0;
      while (visited.size < nodes.length && currentLevel < 10) {
        const nextLevel: string[] = [];
        const currentNodes = levels[currentLevel] || [];
        currentNodes.forEach(parentId => {
          (data.connections || [])
            .filter(c => c.from === parentId && !visited.has(c.to))
            .forEach(c => {
              if (!nextLevel.includes(c.to)) {
                nextLevel.push(c.to);
                visited.add(c.to);
              }
            });
        });

        if (nextLevel.length === 0) {
          const unvisited = nodes.find(n => !visited.has(n.id));
          if (unvisited) {
            nextLevel.push(unvisited.id);
            visited.add(unvisited.id);
          }
        }

        if (nextLevel.length > 0) {
          levels.push(nextLevel);
          currentLevel++;
        } else {
          break;
        }
      }

      const layoutNodes = nodes.map(n => {
        const levelIdx = levels.findIndex(lvl => lvl.includes(n.id));
        const indexInLevel = levelIdx >= 0 ? levels[levelIdx].indexOf(n.id) : 0;
        const totalInLevel = levelIdx >= 0 ? levels[levelIdx].length : 1;

        const levelY = 30 + (levelIdx >= 0 ? levelIdx : 0) * 80;
        const totalSpan = (totalInLevel - 1) * 140;
        const levelX = Math.max(30, 240 - totalSpan / 2 + indexInLevel * 140);

        return { ...n, x: Math.round(levelX), y: Math.round(levelY) };
      });

      onUpdate({ content: { ...data, nodes: layoutNodes, layout: 'tree' } });
    }
  };

  const handleNodeLabelChange = (nodeId: string, label: string) => {
    const nextNodes = data.nodes.map(n => n.id === nodeId ? { ...n, label } : n);
    onUpdate({ content: { ...data, nodes: nextNodes } });
  };

  const handleDoneFlow = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditingFlow(false);
    setConnectingFromId(null);
    setSelectedNodeId(null);
    setShowLinksList(false);
  };

  const nodeMap = new Map(data.nodes.map(n => [n.id, n]));

  // Calculate dynamic cubic bezier curves between optimal anchor points
  const getConnectionPath = (fromNode: DiagramNode, toNode: DiagramNode) => {
    const fromW = fromNode.width || (fromNode.shape === 'diamond' ? 95 : 100);
    const fromH = fromNode.height || (fromNode.shape === 'diamond' ? 60 : 40);
    const toW = toNode.width || (toNode.shape === 'diamond' ? 95 : 100);
    const toH = toNode.height || (toNode.shape === 'diamond' ? 60 : 40);

    const fromCenter = { x: fromNode.x + fromW / 2, y: fromNode.y + fromH / 2 };
    const toCenter = { x: toNode.x + toW / 2, y: toNode.y + toH / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let x1 = fromCenter.x;
    let y1 = fromCenter.y;
    let x2 = toCenter.x;
    let y2 = toCenter.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        x1 = fromNode.x + fromW;
        y1 = fromCenter.y;
        x2 = toNode.x - 6;
        y2 = toCenter.y;
      } else {
        x1 = fromNode.x;
        y1 = fromCenter.y;
        x2 = toNode.x + toW + 6;
        y2 = toCenter.y;
      }
      const cx1 = x1 + (x2 - x1) * 0.5;
      const cy1 = y1;
      const cx2 = x1 + (x2 - x1) * 0.5;
      const cy2 = y2;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    } else {
      if (dy > 0) {
        x1 = fromCenter.x;
        y1 = fromNode.y + fromH;
        x2 = toCenter.x;
        y2 = toNode.y - 6;
      } else {
        x1 = fromCenter.x;
        y1 = fromNode.y;
        x2 = toCenter.x;
        y2 = toNode.y + toH + 6;
      }
      const cx1 = x1;
      const cy1 = y1 + (y2 - y1) * 0.5;
      const cx2 = x2;
      const cy2 = y1 + (y2 - y1) * 0.5;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
  };

  // Dynamic canvas height to fit all nodes cleanly without extra scrollbars
  const contentHeight = Math.max(180, ...data.nodes.map(n => (n.y || 70) + (n.height || (n.shape === 'diamond' ? 65 : 44)) + 40));

  return (
    <div 
      className={`w-full relative select-none rounded-2xl transition-all ${
        isEditing 
          ? 'bg-slate-50/95 dark:bg-slate-900/90 border-2 border-blue-500/70 p-3.5 my-2 shadow-xl ring-4 ring-blue-500/10' 
          : 'bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700/60 p-1 my-1 group/diagram'
      }`}
    >
      {/* Discreet floating badge to re-enter edit mode when not editing */}
      {!isEditing && canEdit && (
        <button
          type="button"
          onClick={() => setIsEditingFlow(true)}
          className="absolute top-2 right-2 z-30 opacity-0 group-hover/diagram:opacity-100 transition-opacity bg-slate-900/85 hover:bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs border border-slate-700 hover:scale-105 active:scale-95 cursor-pointer"
          title="Edit Diagram Flow"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Edit Flow</span>
        </button>
      )}

      {/* Diagram Controls Header (ONLY VISIBLE DURING ACTIVE EDITING) */}
      {isEditing && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400">
                <GitCommit className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">Diagram Flow Studio</span>
                <span className="text-[10px] text-slate-400 block">{data.nodes.length} nodes · {(data.connections || []).length} links</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Add Node shapes */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => addNode('rectangle', '#2563eb')}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 shadow-xs flex items-center gap-1"
                  title="Add Process Rectangle"
                >
                  <Plus className="w-3 h-3 text-blue-500" /> Process
                </button>
                <button
                  type="button"
                  onClick={() => addNode('diamond', '#d97706')}
                  className="px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200"
                  title="Add Decision Diamond"
                >
                  Decision
                </button>
                <button
                  type="button"
                  onClick={() => addNode('pill', '#7c3aed')}
                  className="px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200"
                  title="Add Terminal / Pill"
                >
                  End / Start
                </button>
              </div>

              {/* Interactive Connect Mode Toggle */}
              <button
                type="button"
                onClick={() => setConnectingFromId(connectingFromId ? null : selectedNodeId || data.nodes[0]?.id || null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  connectingFromId 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md animate-pulse' 
                    : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
                title="Click Source node then Target node to link them"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{connectingFromId ? 'Pick Target...' : 'Connect'}</span>
              </button>

              {/* Auto-Layout Engines */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => runLayout('horizontal')}
                  className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  title="Organize horizontally: A → B → C"
                >
                  H-Flow
                </button>
                <button
                  type="button"
                  onClick={() => runLayout('vertical')}
                  className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  title="Organize vertically: A ↓ B ↓ C"
                >
                  V-Flow
                </button>
                <button
                  type="button"
                  onClick={() => runLayout('tree')}
                  className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-0.5"
                  title="Organize hierarchical tree branches"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Tree
                </button>
              </div>

              {/* DONE FLOW BUTTON (Exits editing box) */}
              <button
                type="button"
                onClick={handleDoneFlow}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all ml-1 cursor-pointer"
                title="Finish diagram setup and hide editing box"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Done Flow</span>
              </button>
            </div>
          </div>

          {/* Quick Dropdown Connector Bar */}
          {data.nodes.length >= 2 && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 mb-2.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-xs">
              <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-medium">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Quick Link:</span>
                <select
                  value={quickFromId}
                  onChange={(e) => setQuickFromId(e.target.value)}
                  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-300 dark:border-blue-700 rounded px-2 py-0.5 text-xs outline-none"
                >
                  {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <span className="text-blue-500 font-bold">➔</span>
                <select
                  value={quickToId}
                  onChange={(e) => setQuickToId(e.target.value)}
                  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-300 dark:border-blue-700 rounded px-2 py-0.5 text-xs outline-none"
                >
                  {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => establishConnection(quickFromId, quickToId)}
                  disabled={!quickFromId || !quickToId || quickFromId === quickToId}
                  className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  + Link
                </button>
              </div>

              {(data.connections || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLinksList(!showLinksList)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  {showLinksList ? 'Hide Links' : `Manage Links (${data.connections.length})`}
                </button>
              )}
            </div>
          )}

          {/* Active Links Chips Strip */}
          {showLinksList && (data.connections || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 mb-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              {data.connections.map(conn => {
                const fromN = nodeMap.get(conn.from);
                const toN = nodeMap.get(conn.to);
                return (
                  <div 
                    key={conn.id} 
                    className="flex items-center gap-1.5 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px] font-medium"
                  >
                    <span>{fromN?.label || 'Node'}</span>
                    <span className="text-slate-400">➔</span>
                    <span>{toN?.label || 'Node'}</span>
                    <button
                      type="button"
                      onClick={() => deleteConnection(conn.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded px-1 ml-0.5 font-bold cursor-pointer"
                      title="Delete this link"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Connection Target Notification Banner */}
          {connectingFromId && (() => {
            const sourceNode = data.nodes.find(n => n.id === connectingFromId);
            return (
              <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                  <span>Connecting from <span className="underline font-bold text-amber-800 dark:text-amber-100">"{sourceNode?.label || 'Node'}"</span>: click any target node below to link</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectingFromId(null)}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Diagram Canvas with Dynamic SVG Connections & Draggable Nodes */}
      <div 
        ref={canvasRef}
        className="relative w-full overflow-x-auto custom-scrollbar py-2"
        style={{ height: `${contentHeight}px`, minHeight: '180px' }}
      >
        {/* Dynamic SVG Connection Layer */}
        <svg 
          className="absolute inset-0 w-full pointer-events-none z-0"
          style={{ height: `${contentHeight}px`, minWidth: '600px' }}
        >
          <defs>
            <marker id="diagram-arrow-dynamic" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748b" />
            </marker>
          </defs>
          {(data.connections || []).map(conn => {
            const fromNode = nodeMap.get(conn.from);
            const toNode = nodeMap.get(conn.to);
            if (!fromNode || !toNode) return null;

            const pathD = getConnectionPath(fromNode, toNode);

            return (
              <path
                key={conn.id}
                d={pathD}
                fill="none"
                stroke={conn.color || "#64748b"}
                strokeWidth="2.5"
                strokeLinecap="round"
                markerEnd="url(#diagram-arrow-dynamic)"
              />
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {data.nodes.map(node => {
          const isSelectedNode = selectedNodeId === node.id;
          const isSource = connectingFromId === node.id;
          const isDragging = draggedNodeId === node.id;
          const nodeWidth = node.width || (node.shape === 'diamond' ? 95 : 100);
          const nodeHeight = node.height || (node.shape === 'diamond' ? 60 : 40);
          const isDiamond = node.shape === 'diamond';

          return (
            <div
              key={node.id}
              onClick={() => {
                if (canEdit && isEditing) {
                  setSelectedNodeId(node.id);
                }
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onPointerMove={handleNodePointerMove}
              onPointerUp={handleNodePointerUp}
              className={`absolute cursor-move transition-shadow flex items-center justify-center p-1.5 z-10 select-none ${
                isDragging ? 'shadow-2xl opacity-90 scale-102 z-25' : 'shadow-md'
              } ${
                isSource ? 'ring-4 ring-amber-400 scale-105 z-30' : isSelectedNode && isEditing ? 'ring-2 ring-blue-500 z-20' : 'hover:ring-1 hover:ring-slate-400'
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${nodeWidth}px`,
                height: `${nodeHeight}px`,
                backgroundColor: isDiamond ? 'transparent' : (node.color || '#2563eb'),
                borderRadius: node.shape === 'pill' ? '9999px' : node.shape === 'circle' ? '50%' : node.shape === 'rounded' ? '12px' : '6px',
                color: node.textColor || '#ffffff',
                touchAction: 'none',
              }}
            >
              {isDiamond ? (
                <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                  <div 
                    className="absolute inset-1 rotate-45 shadow-sm"
                    style={{ backgroundColor: node.color || '#d97706', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    disabled={!canEdit || !isEditing}
                    value={node.label}
                    onChange={(e) => handleNodeLabelChange(node.id, e.target.value)}
                    className="relative z-10 w-full text-center bg-transparent border-none outline-none font-bold text-xs placeholder-white/70"
                    style={{ color: node.textColor || '#ffffff' }}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  disabled={!canEdit || !isEditing}
                  value={node.label}
                  onChange={(e) => handleNodeLabelChange(node.id, e.target.value)}
                  className="w-full text-center bg-transparent border-none outline-none font-bold text-xs placeholder-white/70 pointer-events-auto"
                  style={{ color: node.textColor || '#ffffff' }}
                />
              )}

              {/* Node Mini Action Bar (When selected during editing) */}
              {canEdit && isEditing && isSelectedNode && !connectingFromId && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30 bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-md text-[10px] font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(node.id);
                    }}
                    className="hover:text-amber-400 flex items-center gap-0.5 cursor-pointer"
                    title="Connect this node to another"
                  >
                    <ArrowRight className="w-3 h-3 text-amber-400" /> Link To...
                  </button>
                  {data.nodes.length > 1 && (
                    <>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="hover:text-red-400 cursor-pointer"
                        title="Delete node"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* HIGH-PRECISION DIRECT TARGET OVERLAY (Appears when establishing connection) */}
              {connectingFromId && connectingFromId !== node.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    establishConnection(connectingFromId, node.id);
                  }}
                  className="absolute -inset-1 z-40 bg-teal-600/50 hover:bg-teal-600/90 rounded-xl flex items-center justify-center text-white font-bold border-2 border-dashed border-teal-200 shadow-xl cursor-pointer transition-all animate-in zoom-in-95 duration-150"
                  title={`Click to connect from ${data.nodes.find(n => n.id === connectingFromId)?.label} to ${node.label}`}
                >
                  <span className="bg-teal-900/90 text-white px-2 py-0.5 rounded-md text-[11px] shadow flex items-center gap-1 pointer-events-none">
                    <ArrowRight className="w-3 h-3" /> Connect Here
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 13. Image Block
const ImageBlockContent: React.FC<{
  block: DocumentBlock;
  canEdit: boolean;
  onUpdate: (u: Partial<DocumentBlock>) => void;
}> = ({ block, canEdit, onUpdate }) => {
  const content = block.content || {};
  const url = typeof content === 'string' ? content : content.url || '';
  const caption = content.caption || '';
  const [urlInput, setUrlInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onUpdate({ content: { url: urlInput.trim(), caption } });
    setShowInput(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onUpdate({ content: { url: base64, caption: file.name } });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!url) {
    return (
      <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center bg-slate-50 dark:bg-slate-900/30">
        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Insert an image into this document</p>
        {canEdit && (
          <div className="flex items-center justify-center gap-2">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors">
              Upload File
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-xs text-slate-400">or</span>
            <Button size="sm" variant="outline" onClick={() => setShowInput(true)} className="h-7 text-xs">
              Image URL
            </Button>
          </div>
        )}
        {showInput && (
          <div className="mt-3 flex items-center justify-center gap-1.5 max-w-sm mx-auto">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
            />
            <Button size="sm" onClick={handleApplyUrl} className="h-7 text-xs">Apply</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group/img flex flex-col items-center my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={url} 
        alt={caption || 'Document visual'} 
        style={{
          opacity: content.opacity !== undefined ? content.opacity : 1,
          borderRadius: content.borderRadius !== undefined ? `${content.borderRadius}px` : '6px',
          borderWidth: `${content.borderWidth !== undefined ? content.borderWidth : 1}px`,
          borderColor: content.borderColor || '#cbd5e1',
          borderStyle: content.borderWidth === 0 ? 'none' : 'solid',
        }}
        className="max-w-full shadow-sm object-contain max-h-72"
      />
      <input
        type="text"
        disabled={!canEdit}
        value={caption}
        onChange={(e) => onUpdate({ content: { ...content, caption: e.target.value } })}
        placeholder="Add caption..."
        className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400 bg-transparent border-none outline-none w-full"
      />
    </div>
  );
};
