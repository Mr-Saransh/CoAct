import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  DocumentPage as IDocumentPage, 
  DocumentBlock, 
  DocumentSettings, 
  BlockType,
  PAGE_DIMENSIONS, 
  MARGIN_VALUES, 
  CollaboratorPresence 
} from "@/lib/types/document";
import { DocumentBlockRenderer } from "./DocumentBlocks";
import { 
  Plus, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Type, 
  Table as TableIcon, 
  GitCommit, 
  CheckSquare, 
  Square,
  Heading1,
  Sparkles
} from "lucide-react";

interface DocumentPageProps {
  page: IDocumentPage;
  totalPages: number;
  settings: DocumentSettings;
  isHost: boolean;
  canEdit: boolean;
  userName: string;
  userColor: string;
  selectedBlockId: string | null;
  collaboratorsOnPage?: CollaboratorPresence[];
  zoom?: number;
  onSelectBlock: (blockId: string | null, isMulti?: boolean) => void;
  onUpdateBlock: (blockId: string, updatedBlock: Partial<DocumentBlock>) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveBlockFlow: (blockId: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (blockId: string) => void;
  onBlockMovePositioned: (blockId: string, x: number, y: number) => void;
  onAddBlockOnPage: (pageId: string, type: BlockType, extra?: any) => void;
  onDuplicatePage?: (pageId: string) => void;
  onDeletePage?: (pageId: string) => void;
  onAddNextPage?: () => void;
}

export const DocumentPage: React.FC<DocumentPageProps> = ({
  page,
  totalPages,
  settings,
  isHost,
  canEdit,
  userName,
  userColor,
  selectedBlockId,
  collaboratorsOnPage = [],
  zoom = 1.0,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlockFlow,
  onDuplicateBlock,
  onBlockMovePositioned,
  onAddBlockOnPage,
  onDuplicatePage,
  onDeletePage,
  onAddNextPage,
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const [isNearlyFull, setIsNearlyFull] = useState(false);

  // Logical Dimensions
  const dims = PAGE_DIMENSIONS[settings.format]?.[settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
  const marginPx = MARGIN_VALUES[settings.margins] || 48;

  // Active Dragging State for Positioned Blocks
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; blockX: number; blockY: number } | null>(null);

  // Check overflow
  useEffect(() => {
    if (flowContainerRef.current) {
      const contentHeight = flowContainerRef.current.scrollHeight;
      const availableHeight = dims.height - (marginPx * 2) - 80;
      if (contentHeight > availableHeight * 0.88) {
        setIsNearlyFull(true);
      } else {
        setIsNearlyFull(false);
      }
    }
  }, [page.blocks, dims.height, marginPx]);

  // Pointer Drag Handlers for Positioned Blocks (Interaction State Machine: MOVING vs EDITING_TEXT)
  const handlePointerDown = (e: React.PointerEvent, block: DocumentBlock) => {
    if (!canEdit || block.layoutType !== 'positioned' || block.locked) return;
    const target = e.target as HTMLElement;
    // Strictly isolate text editing from block moving:
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'BUTTON' || 
      target.tagName === 'SELECT' || 
      target.isContentEditable ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select')
    ) {
      return;
    }

    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    setDraggingBlockId(block.id);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      blockX: block.x || marginPx,
      blockY: block.y || marginPx,
    };
  };

  const handlePointerMove = (e: React.PointerEvent, block: DocumentBlock) => {
    if (!draggingBlockId || draggingBlockId !== block.id || !dragStartRef.current) return;
    e.stopPropagation();

    // Canonical world delta calculation: viewport transform respected
    const effectiveZoom = zoom && zoom > 0 ? zoom : 1;
    const deltaX = (e.clientX - dragStartRef.current.startX) / effectiveZoom;
    const deltaY = (e.clientY - dragStartRef.current.startY) / effectiveZoom;

    const rawX = dragStartRef.current.blockX + deltaX;
    const rawY = dragStartRef.current.blockY + deltaY;

    // Clamping to paper margin bounds
    const blockWidth = block.width || 180;
    const blockHeight = block.height || 80;

    const minX = marginPx;
    const maxX = Math.max(minX, dims.width - marginPx - blockWidth);
    const minY = marginPx + 30;
    const maxY = Math.max(minY, dims.height - marginPx - blockHeight - 30);

    const clampedX = Math.round(Math.max(minX, Math.min(maxX, rawX)));
    const clampedY = Math.round(Math.max(minY, Math.min(maxY, rawY)));

    onBlockMovePositioned(block.id, clampedX, clampedY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingBlockId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggingBlockId(null);
      dragStartRef.current = null;
    }
  };

  // 8-Directional Resize Handlers for Positioned Blocks
  type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    direction: ResizeDirection;
  } | null>(null);

  const handleResizePointerDown = (e: React.PointerEvent, block: DocumentBlock, direction: ResizeDirection) => {
    if (!canEdit || block.locked) return;
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    setResizingBlockId(block.id);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: block.x || marginPx,
      initialY: block.y || marginPx,
      initialW: block.width || 180,
      initialH: block.height || 80,
      direction,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent, block: DocumentBlock) => {
    if (!resizingBlockId || resizingBlockId !== block.id || !resizeStartRef.current) return;
    e.stopPropagation();

    const { startX, startY, initialX, initialY, initialW, initialH, direction } = resizeStartRef.current;
    const effectiveZoom = zoom && zoom > 0 ? zoom : 1;
    const deltaX = (e.clientX - startX) / effectiveZoom;
    const deltaY = (e.clientY - startY) / effectiveZoom;

    const minW = block.type === 'shape' ? 40 : 60;
    const minH = block.type === 'shape' ? 30 : 40;
    const minBoundX = marginPx;
    const maxBoundX = dims.width - marginPx;
    const minBoundY = marginPx + 20;
    const maxBoundY = dims.height - marginPx - 20;

    let newX = initialX;
    let newY = initialY;
    let newW = initialW;
    let newH = initialH;

    // Horizontal adjustments
    if (direction.includes('e')) {
      newW = Math.max(minW, Math.min(maxBoundX - initialX, initialW + deltaX));
    } else if (direction.includes('w')) {
      const maxDeltaLeft = initialW - minW;
      const clampedLeftDelta = Math.min(maxDeltaLeft, Math.max(minBoundX - initialX, deltaX));
      newX = initialX + clampedLeftDelta;
      newW = initialW - clampedLeftDelta;
    }

    // Vertical adjustments
    if (direction.includes('s')) {
      newH = Math.max(minH, Math.min(maxBoundY - initialY, initialH + deltaY));
    } else if (direction.includes('n')) {
      const maxDeltaTop = initialH - minH;
      const clampedTopDelta = Math.min(maxDeltaTop, Math.max(minBoundY - initialY, deltaY));
      newY = initialY + clampedTopDelta;
      newH = initialH - clampedTopDelta;
    }

    // Preserve aspect ratio for images
    if (block.type === 'image' && initialW > 0 && initialH > 0) {
      const ratio = initialW / initialH;
      if (direction === 'e' || direction === 'w') {
        newH = Math.max(minH, Math.round(newW / ratio));
      } else if (direction === 'n' || direction === 's') {
        newW = Math.max(minW, Math.round(newH * ratio));
      } else {
        newH = Math.max(minH, Math.round(newW / ratio));
      }
    }

    // Preserve aspect ratio for circle shapes
    if (block.type === 'shape' && (block.content?.shapeType === 'circle' || (block as any).shapeType === 'circle')) {
      const side = Math.max(newW, newH);
      newW = side;
      newH = side;
    }

    onUpdateBlock(block.id, {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (resizingBlockId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setResizingBlockId(null);
      resizeStartRef.current = null;
    }
  };

  const flowBlocks = page.blocks.filter(b => b.layoutType === 'flow');
  const positionedBlocks = page.blocks.filter(b => b.layoutType === 'positioned');

  return (
    <div className="relative flex flex-col items-center my-1 sm:my-6 group/page select-text">
      {/* Page Label & Collaborators on top */}
      <div 
        className="w-full flex items-center justify-between pb-2 px-1 text-xs text-slate-400 select-none"
        style={{ width: `${dims.width}px` }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Page {page.pageNumber}</span>
          <span className="text-[11px] text-slate-500">
            ({settings.format.toUpperCase()} · {settings.orientation})
          </span>
          {collaboratorsOnPage.length > 0 && (
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Editing:</span>
              <div className="flex -space-x-1.5 overflow-hidden">
                {collaboratorsOnPage.map((c, i) => (
                  <span
                    key={i}
                    title={`${c.userName} on Page ${page.pageNumber}`}
                    className="inline-block h-5 px-1.5 text-[10px] font-bold text-white rounded-full flex items-center shadow-md border border-slate-900"
                    style={{ backgroundColor: c.userColor }}
                  >
                    {c.userName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page Actions (Duplicate / Delete) */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover/page:opacity-100 transition-opacity">
            {onDuplicatePage && (
              <button
                onClick={() => onDuplicatePage(page.id)}
                className="px-2 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
                title="Duplicate Page"
              >
                <Copy className="w-3 h-3" /> Duplicate
              </button>
            )}
            {totalPages > 1 && onDeletePage && (
              <button
                onClick={() => onDeletePage(page.id)}
                className="px-2 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors flex items-center gap-1 text-[11px]"
                title="Delete Page"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* The Printable Page Surface */}
      <div
        ref={pageRef}
        id={`document-page-${page.id}`}
        data-page-id={page.id}
        data-page-number={page.pageNumber}
        className="document-paper relative bg-white text-slate-900 shadow-2xl transition-shadow duration-200 border border-slate-200/80 overflow-hidden"
        style={{
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          minWidth: `${dims.width}px`,
          minHeight: `${dims.height}px`,
          padding: `${marginPx}px`,
          boxSizing: 'border-box',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget || e.target === flowContainerRef.current) {
            onSelectBlock(null);
          }
        }}
      >
        {/* Printable Margin Guidelines (subtle dashed border) */}
        <div 
          className="absolute pointer-events-none border border-dashed border-slate-200/70 rounded"
          style={{
            top: `${marginPx}px`,
            left: `${marginPx}px`,
            right: `${marginPx}px`,
            bottom: `${marginPx}px`,
          }}
        />

        {/* Page Header Area */}
        <div className="absolute top-4 left-0 right-0 px-12 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100 pb-1 pointer-events-none select-none">
          <span className="truncate max-w-xs font-medium">{settings.headerText || 'COACT GROUP DOCUMENT'}</span>
          <span>{page.pageNumber}</span>
        </div>

        {/* Flow Blocks Content Area */}
        <div 
          ref={flowContainerRef}
          className="relative w-full h-full flex flex-col z-10"
        >
          {flowBlocks.map((block, idx) => (
            <DocumentBlockRenderer
              key={block.id}
              block={block}
              pageId={page.id}
              isHost={isHost}
              canEdit={canEdit}
              userName={userName}
              userColor={userColor}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onUpdate={(updated) => onUpdateBlock(block.id, updated)}
              onDelete={() => onDeleteBlock(block.id)}
              onMoveUp={idx > 0 ? () => onMoveBlockFlow(block.id, 'up') : undefined}
              onMoveDown={idx < flowBlocks.length - 1 ? () => onMoveBlockFlow(block.id, 'down') : undefined}
              onDuplicate={() => onDuplicateBlock(block.id)}
            />
          ))}

          {/* Clean Starter Prompt (Requirement #70 & #71) */}
          {flowBlocks.length === 0 && positionedBlocks.length === 0 && (
            <div className="my-auto py-8 text-center flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Start building your document</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm">
                Collaborate with peers in real-time. Pick a component to begin:
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'heading', { headingLevel: 1 })}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Heading1 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Heading</span>
                </button>
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'text')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Type className="w-3.5 h-3.5 text-blue-500" />
                  <span>Paragraph</span>
                </button>
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'table')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <TableIcon className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'diagram')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <GitCommit className="w-3.5 h-3.5 text-teal-500" />
                  <span>Diagram</span>
                </button>
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'checklist')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Checklist</span>
                </button>
                <button
                  onClick={() => onAddBlockOnPage(page.id, 'shape', { shapeType: 'rectangle' })}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Shape</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Positioned Blocks Layer */}
        {positionedBlocks.map((block) => {
          const isSelected = selectedBlockId === block.id;

          return (
            <div
              key={block.id}
              onPointerDown={(e) => handlePointerDown(e, block)}
              onPointerMove={(e) => handlePointerMove(e, block)}
              onPointerUp={handlePointerUp}
              className={`absolute group/positioned ${block.locked ? 'cursor-default' : 'cursor-move'} ${draggingBlockId === block.id ? 'opacity-90' : ''}`}
              style={{
                left: `${block.x || marginPx}px`,
                top: `${block.y || marginPx}px`,
                width: block.width ? `${block.width}px` : undefined,
                height: block.height ? `${block.height}px` : undefined,
                zIndex: block.zIndex || (isSelected ? 35 : 25),
              }}
            >
              <DocumentBlockRenderer
                block={block}
                pageId={page.id}
                isHost={isHost}
                canEdit={canEdit}
                userName={userName}
                userColor={userColor}
                isSelected={isSelected}
                onSelect={(e?: any) => onSelectBlock(block.id, e?.shiftKey || e?.metaKey || e?.ctrlKey)}
                onUpdate={(updated) => onUpdateBlock(block.id, updated)}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
              />

              {/* Complete 8-Point Precision Resize Handles (Touch-friendly & Proportional, Section 5, 7, 52) */}
              {isSelected && canEdit && !block.locked && (
                <>
                  {/* Top-Left */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'nw')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Top-Left"
                  />
                  {/* Top-Center */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'n')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-ns-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Top"
                  />
                  {/* Top-Right */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'ne')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Top-Right"
                  />
                  {/* Middle-Right */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'e')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-ew-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Right"
                  />
                  {/* Bottom-Right */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'se')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Bottom-Right"
                  />
                  {/* Bottom-Center */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 's')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-ns-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Bottom"
                  />
                  {/* Bottom-Left */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'sw')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Bottom-Left"
                  />
                  {/* Middle-Left */}
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, block, 'w')}
                    onPointerMove={(e) => handleResizePointerMove(e, block)}
                    onPointerUp={handleResizePointerUp}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-ew-resize shadow-md z-50 hover:scale-125 transition-transform touch-none select-none before:content-[''] before:absolute before:-inset-3 sm:before:-inset-2 before:rounded-full"
                    title="Resize Left"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Page Footer Area */}
        {settings.showPageNumbers && (
          <div className="absolute bottom-4 left-0 right-0 px-12 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1 pointer-events-none select-none">
            <span>{settings.footerText || ''}</span>
            <span className="font-medium">Page {page.pageNumber} of {totalPages}</span>
          </div>
        )}

        {/* Page Overflow Warning */}
        {isNearlyFull && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-2 z-40 backdrop-blur-sm animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Page is nearly full</span>
            {onAddNextPage && (
              <button
                onClick={onAddNextPage}
                className="underline font-bold hover:text-amber-100"
              >
                + Add Next Page
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
