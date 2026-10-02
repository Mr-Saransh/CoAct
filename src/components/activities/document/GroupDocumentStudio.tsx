import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  GroupDocument, 
  DocumentPage as IDocumentPage, 
  DocumentBlock, 
  DocumentSettings, 
  BlockType, 
  ShapeType,
  CollaboratorPresence, 
  USER_PRESENCE_COLORS, 
  PAGE_DIMENSIONS, 
  MARGIN_VALUES,
  createDefaultDocument,
  QuoteData,
  QUOTE_PRESETS,
  CalloutData,
  CALLOUT_PRESETS
} from "@/lib/types/document";
import { DocumentToolbar } from "./DocumentToolbar";
import { DocumentSidebar } from "./DocumentSidebar";
import { DocumentPage } from "./DocumentPage";
import { DocumentMinimap } from "./DocumentMinimap";
import { PdfExportModal, PdfExportState } from "./PdfExportModal";
import { ChevronLeft, ChevronRight, Plus, Map as MapIcon } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

interface GroupDocumentStudioProps {
  session: any;
  socket?: any;
  userName: string;
  isHost?: boolean;
}

export const GroupDocumentStudio: React.FC<GroupDocumentStudioProps> = ({
  session,
  socket,
  userName,
  isHost = false,
}) => {
  // Session ID & User ID
  const sessionId = session?.id || "local";
  const userId = socket?.data?.userId || socket?.id || userName;

  // Assign user a consistent color based on their name
  const userColor = USER_PRESENCE_COLORS[
    Math.abs(userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % USER_PRESENCE_COLORS.length
  ];

  const canEdit = true;

  // Canonical Document State
  const initialDoc = session?.activityData?.document || createDefaultDocument("Group Study Document");
  const [doc, setDoc] = useState<GroupDocument>(initialDoc);
  const docRef = useRef<GroupDocument>(doc);
  docRef.current = doc;

  // Selected Block & Active Page
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);

  // Zoom & Viewport
  const [zoom, setZoom] = useState<number>(1.0);
  const [fitZoom, setFitZoom] = useState<number>(1.0);
  const fitZoomRef = useRef<number>(1.0);
  fitZoomRef.current = fitZoom;
  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;
  const containerRef = useRef<HTMLDivElement>(null);

  // Sidebar & Responsive State (Initialized synchronously to prevent SSR layout flash)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [isMobileMinimapOpen, setIsMobileMinimapOpen] = useState<boolean>(false);

  // PDF Export Modal State
  const [pdfModalState, setPdfModalState] = useState<PdfExportState>({
    isOpen: false,
    status: 'idle',
    progressText: '',
  });

  // Track responsive screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute currently selected block & all selected blocks
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    for (const page of doc.pages) {
      const found = page.blocks.find((b) => b.id === selectedBlockId);
      if (found) return found;
    }
    return null;
  }, [doc.pages, selectedBlockId]);

  const selectedBlocks = useMemo(() => {
    if (selectedBlockIds.length === 0) return selectedBlock ? [selectedBlock] : [];
    const list: DocumentBlock[] = [];
    for (const page of doc.pages) {
      for (const b of page.blocks) {
        if (selectedBlockIds.includes(b.id)) {
          list.push(b);
        }
      }
    }
    return list;
  }, [doc.pages, selectedBlockIds, selectedBlock]);

  const handleSelectBlock = useCallback((blockId: string | null, isMulti = false) => {
    if (!blockId) {
      setSelectedBlockIds([]);
      setSelectedBlockId(null);
      return;
    }
    if (isMulti) {
      setSelectedBlockIds((prev) => {
        const next = prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId];
        setSelectedBlockId(next[0] || null);
        return next;
      });
    } else {
      setSelectedBlockIds([blockId]);
      setSelectedBlockId(blockId);
    }
  }, []);

  // Collaborator Presences
  const [collaborators, setCollaborators] = useState<Map<string, CollaboratorPresence>>(new Map());

  // Sync Status
  const [syncStatus, setSyncStatus] = useState<"saved" | "syncing" | "offline">("saved");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Undo / Redo History
  const [history, setHistory] = useState<GroupDocument[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushHistory = useCallback((newDoc: GroupDocument) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newDoc].slice(-25);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 24));
  }, [historyIndex]);

  // Request fresh document on mount
  useEffect(() => {
    if (socket && sessionId) {
      socket.emit("study:get_doc", { sessionId });
    }
  }, [socket, sessionId]);

  // Sync incoming activityData.document from session
  useEffect(() => {
    if (session?.activityData?.document) {
      setDoc((prev) => {
        if (session.activityData.document.updatedAt > (prev.updatedAt || 0)) {
          return session.activityData.document;
        }
        return prev;
      });
    }
  }, [session?.activityData?.document]);

  // Dynamic Fit Page Calculation (Section 3, 24, 30)
  const calculateFitZoom = useCallback(() => {
    if (!containerRef.current) return 1.0;
    const containerW = containerRef.current.clientWidth || window.innerWidth;
    const containerH = containerRef.current.clientHeight || (window.innerHeight - 100);
    const dims = PAGE_DIMENSIONS[doc.settings?.format || 'a4']?.[doc.settings?.orientation || 'portrait'] || PAGE_DIMENSIONS.a4.portrait;

    // Actual visual height includes page dimension + header space + margins
    const totalPageW = dims.width;
    const totalPageH = dims.height + (isMobile ? 32 : 64);

    // Leave safe-area padding so borders and content have zero clipping
    const horizPadding = isMobile ? 16 : 48;
    const vertPadding = isMobile ? 24 : 64;

    const availW = Math.max(120, containerW - horizPadding);
    const availH = Math.max(120, containerH - vertPadding);

    const scaleW = availW / totalPageW;
    const scaleH = availH / totalPageH;

    const fitScale = Math.min(scaleW, scaleH);
    return Number(Math.max(0.2, Math.min(1.5, fitScale)).toFixed(3));
  }, [doc.settings?.format, doc.settings?.orientation, isMobile]);

  // Handle Fit Page action
  const handleFitPage = useCallback(() => {
    const optimal = calculateFitZoom();
    setFitZoom(optimal);
    setZoom(optimal);
  }, [calculateFitZoom]);

  // Auto-fit on mount, when switching to mobile, and when document layout changes
  useEffect(() => {
    const optimal = calculateFitZoom();
    setFitZoom(optimal);
    if (isMobile) {
      setZoom(optimal);
    }
  }, [isMobile, calculateFitZoom]);

  // Section 31: Multi-page document: switching page on mobile automatically starts in Fit Page
  useEffect(() => {
    if (isMobile) {
      const optimal = calculateFitZoom();
      setFitZoom(optimal);
      setZoom(optimal);
    }
  }, [currentPageNumber, isMobile, calculateFitZoom]);

  // Section 5, 23: Pinch-to-zoom on mobile canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    let initialDist = 0;
    let initialZ = zoomRef.current;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialZ = zoomRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault(); // Stop native viewport body zoom
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = currentDist / initialDist;
        const targetZoom = Math.min(2.5, Math.max(fitZoomRef.current * 0.85, initialZ * factor));
        setZoom(Number(targetZoom.toFixed(2)));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && initialDist > 0) {
        initialDist = 0;
        if (zoomRef.current < fitZoomRef.current) {
          setZoom(fitZoomRef.current);
        }
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile]);

  // Double tap to zoom in / fit page on mobile
  const lastTapRef = useRef<number>(0);
  const handleTouchEndCanvas = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      const isAtFit = Math.abs(zoomRef.current - fitZoomRef.current) < 0.04;
      if (isAtFit) {
        setZoom(1.35); // Zoom in for comfortable reading/editing
      } else {
        setZoom(fitZoomRef.current); // Zoom out to full fit page
      }
    }
    lastTapRef.current = now;
  }, [isMobile]);

  // Broadcast Presence periodically
  useEffect(() => {
    if (!socket || !sessionId) return;
    const activePage = doc.pages.find(p => p.pageNumber === currentPageNumber) || doc.pages[0];
    const presence: CollaboratorPresence = {
      userId,
      userName,
      userColor,
      activePageId: activePage?.id || 'page_1',
      activePageNumber: currentPageNumber,
      activeBlockId: selectedBlockId,
      lastActive: Date.now(),
    };
    socket.emit("study:presence", { sessionId, presence });
  }, [socket, sessionId, currentPageNumber, selectedBlockId, userName, userColor, userId, doc.pages]);

  // Socket Listeners for Realtime Collaboration
  useEffect(() => {
    if (!socket) return;

    const handleDocState = ({ document }: { document: GroupDocument }) => {
      if (document) {
        setDoc(document);
      }
    };

    const handleTitleUpdated = ({ title }: { title: string }) => {
      setDoc((prev) => ({ ...prev, title, updatedAt: Date.now() }));
    };

    const handleSettingsUpdated = ({ settings }: { settings: DocumentSettings }) => {
      setDoc((prev) => ({ ...prev, settings, updatedAt: Date.now() }));
    };

    const handlePageCreated = ({ page }: { page: IDocumentPage }) => {
      setDoc((prev) => ({
        ...prev,
        pages: [...prev.pages, page],
        updatedAt: Date.now(),
      }));
    };

    const handlePageDeleted = ({ pageId, pages }: { pageId: string; pages: IDocumentPage[] }) => {
      setDoc((prev) => ({
        ...prev,
        pages,
        updatedAt: Date.now(),
      }));
      setCurrentPageNumber((curr) => Math.min(curr, pages.length));
    };

    const handlePageReordered = ({ pages }: { pages: IDocumentPage[] }) => {
      setDoc((prev) => ({ ...prev, pages, updatedAt: Date.now() }));
    };

    const handleBlockCreated = ({ pageId, block, index }: { pageId: string; block: DocumentBlock; index?: number }) => {
      setDoc((prev) => {
        const nextPages = prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          const nextBlocks = [...p.blocks];
          if (typeof index === "number" && index >= 0) {
            nextBlocks.splice(index, 0, block);
          } else {
            nextBlocks.push(block);
          }
          return { ...p, blocks: nextBlocks };
        });
        return { ...prev, pages: nextPages, updatedAt: Date.now() };
      });
    };

    const handleBlockUpdated = ({ pageId, blockId, block }: { pageId: string; blockId: string; block: DocumentBlock }) => {
      setDoc((prev) => {
        const nextPages = prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          const nextBlocks = p.blocks.map((b) => (b.id === blockId ? { ...b, ...block } : b));
          return { ...p, blocks: nextBlocks };
        });
        return { ...prev, pages: nextPages, updatedAt: Date.now() };
      });
    };

    const handleBlockMoved = ({ pageId, blockId, x, y }: { pageId: string; blockId: string; x: number; y: number }) => {
      setDoc((prev) => {
        const nextPages = prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          const nextBlocks = p.blocks.map((b) => (b.id === blockId ? { ...b, x, y } : b));
          return { ...p, blocks: nextBlocks };
        });
        return { ...prev, pages: nextPages, updatedAt: Date.now() };
      });
    };

    const handleBlockDeleted = ({ pageId, blockId }: { pageId: string; blockId: string }) => {
      setDoc((prev) => {
        const nextPages = prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          return { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) };
        });
        return { ...prev, pages: nextPages, updatedAt: Date.now() };
      });
    };

    const handlePresenceUpdate = (presence: CollaboratorPresence) => {
      if (presence.userId === userId) return;
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(presence.userId, presence);
        return next;
      });
    };

    socket.on("study:doc_state", handleDocState);
    socket.on("study:title_updated", handleTitleUpdated);
    socket.on("study:settings_updated", handleSettingsUpdated);
    socket.on("study:page_created", handlePageCreated);
    socket.on("study:page_deleted", handlePageDeleted);
    socket.on("study:page_reordered", handlePageReordered);
    socket.on("study:block_created", handleBlockCreated);
    socket.on("study:block_updated", handleBlockUpdated);
    socket.on("study:block_moved", handleBlockMoved);
    socket.on("study:block_deleted", handleBlockDeleted);
    socket.on("study:presence_update", handlePresenceUpdate);

    return () => {
      socket.off("study:doc_state", handleDocState);
      socket.off("study:title_updated", handleTitleUpdated);
      socket.off("study:settings_updated", handleSettingsUpdated);
      socket.off("study:page_created", handlePageCreated);
      socket.off("study:page_deleted", handlePageDeleted);
      socket.off("study:page_reordered", handlePageReordered);
      socket.off("study:block_created", handleBlockCreated);
      socket.off("study:block_updated", handleBlockUpdated);
      socket.off("study:block_moved", handleBlockMoved);
      socket.off("study:block_deleted", handleBlockDeleted);
      socket.off("study:presence_update", handlePresenceUpdate);
    };
  }, [socket, userId]);

  // Clean stale collaborator presences (inactive > 45s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCollaborators((prev) => {
        let changed = false;
        const next = new Map();
        for (const [id, c] of prev.entries()) {
          if (now - c.lastActive < 45000) {
            next.set(id, c);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Action: Title Change
  const handleTitleChange = useCallback((newTitle: string) => {
    setDoc((prev) => {
      const next = { ...prev, title: newTitle, updatedAt: Date.now() };
      pushHistory(next);
      return next;
    });
    if (socket && sessionId) {
      socket.emit("study:title_update", { sessionId, title: newTitle, updatedBy: userName });
    }
  }, [socket, sessionId, userName, pushHistory]);

  // Action: Settings Change
  const handleSettingsChange = useCallback((newSettings: Partial<DocumentSettings>) => {
    setDoc((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...newSettings }, updatedAt: Date.now() };
      pushHistory(next);
      return next;
    });
    if (socket && sessionId) {
      socket.emit("study:settings_update", { sessionId, settings: newSettings, updatedBy: userName });
    }
  }, [socket, sessionId, userName, pushHistory]);

  // Action: Add Page
  const handleAddPage = useCallback(() => {
    const newPageNum = doc.pages.length + 1;
    const newPage: IDocumentPage = {
      id: `page_${Date.now()}_${newPageNum}`,
      pageNumber: newPageNum,
      blocks: [],
    };

    setDoc((prev) => {
      const next = { ...prev, pages: [...prev.pages, newPage], updatedAt: Date.now() };
      pushHistory(next);
      return next;
    });

    setCurrentPageNumber(newPageNum);

    if (socket && sessionId) {
      socket.emit("study:page_create", { sessionId, page: newPage, updatedBy: userName });
    }

    setTimeout(() => {
      const pageEl = document.getElementById(`document-page-${newPage.id}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [doc.pages.length, socket, sessionId, userName, pushHistory]);

  // Action: Delete Page
  const handleDeletePage = useCallback((pageId: string) => {
    if (doc.pages.length <= 1) return;
    const nextPages = doc.pages.filter(p => p.id !== pageId);
    nextPages.forEach((p, i) => { p.pageNumber = i + 1; });

    setDoc((prev) => {
      const next = { ...prev, pages: nextPages, updatedAt: Date.now() };
      pushHistory(next);
      return next;
    });

    setCurrentPageNumber((curr) => Math.min(curr, nextPages.length));

    if (socket && sessionId) {
      socket.emit("study:page_delete", { sessionId, pageId, updatedBy: userName });
    }
  }, [doc.pages, socket, sessionId, userName, pushHistory]);

  // Action: Duplicate Page
  const handleDuplicatePage = useCallback((pageId: string) => {
    const targetPage = doc.pages.find(p => p.id === pageId);
    if (!targetPage) return;

    const clonedPage: IDocumentPage = {
      id: `page_${Date.now()}_clone`,
      pageNumber: doc.pages.length + 1,
      blocks: targetPage.blocks.map(b => ({
        ...b,
        id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      })),
    };

    setDoc((prev) => {
      const next = { ...prev, pages: [...prev.pages, clonedPage], updatedAt: Date.now() };
      pushHistory(next);
      return next;
    });

    setCurrentPageNumber(clonedPage.pageNumber);

    if (socket && sessionId) {
      socket.emit("study:page_create", { sessionId, page: clonedPage, updatedBy: userName });
    }
  }, [doc.pages, socket, sessionId, userName, pushHistory]);

  // Action: Add Block with Smart Default Positioning
  const handleAddBlock = useCallback((type: BlockType, extra: any = {}) => {
    const targetPage = doc.pages.find(p => p.pageNumber === currentPageNumber) || doc.pages[0];
    if (!targetPage) return;

    const isPositioned = ['shape', 'diagram', 'image'].includes(type);
    const newBlockId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Smart non-overlapping default offset for positioned blocks
    const positionedCount = targetPage.blocks.filter(b => b.layoutType === 'positioned').length;
    const smartX = 60 + ((positionedCount * 35) % 240);
    const smartY = 120 + ((positionedCount * 45) % 360);

    let defaultContent: any = '';
    if (type === 'heading') defaultContent = extra.content || (extra.headingLevel === 1 ? 'New Heading' : 'Subheading');
    if (type === 'text') defaultContent = 'Start typing your paragraph...';
    if (type === 'bullet') defaultContent = ['Key study point 1', 'Key study point 2'];
    if (type === 'numbered') defaultContent = ['Step 1: Introduction and scope', 'Step 2: Core implementation'];
    if (type === 'checklist') defaultContent = [{ id: 'c1', text: 'Important checklist item', checked: false }];
    if (type === 'table') defaultContent = {
      headers: ['Concept', 'Explanation', 'Status'],
      rows: [['Concept A', 'Primary definition and characteristics', 'Reviewed']],
    };
    if (type === 'callout') defaultContent = 'Important concept highlight for revision review.';
    if (type === 'quote') defaultContent = 'Focus on understanding principles before memorizing answers.';
    if (type === 'divider') defaultContent = '';
    if (type === 'code') defaultContent = '// Code snippet\nfunction calculateMetrics() {\n  return 42;\n}';
    if (type === 'shape') defaultContent = { 
      shapeType: (extra.shapeType as ShapeType) || 'rectangle', 
      label: extra.shapeType === 'diamond' ? 'Decision' : 'Key Box', 
      color: '#dbeafe',
      borderColor: '#3b82f6',
      borderWidth: 2,
      borderStyle: 'solid',
      textColor: '#1e3a8a',
    };
    if (type === 'diagram') defaultContent = {
      nodes: [
        { id: 'n1', label: 'Start', x: 30, y: 40, width: 90, height: 40, shape: 'pill', color: '#3b82f6', textColor: '#ffffff' },
        { id: 'n2', label: 'Process', x: 170, y: 40, width: 100, height: 40, shape: 'rectangle', color: '#10b981', textColor: '#ffffff' },
        { id: 'n3', label: 'Decision', x: 320, y: 30, width: 100, height: 60, shape: 'diamond', color: '#f59e0b', textColor: '#ffffff' },
        { id: 'n4', label: 'End', x: 470, y: 40, width: 90, height: 40, shape: 'pill', color: '#8b5cf6', textColor: '#ffffff' },
      ],
      connections: [
        { id: 'c1', from: 'n1', to: 'n2', type: 'arrow' },
        { id: 'c2', from: 'n2', to: 'n3', type: 'arrow' },
        { id: 'c3', from: 'n3', to: 'n4', type: 'arrow' },
      ],
    };
    if (type === 'image') defaultContent = { url: '', caption: '' };

    const newBlock: DocumentBlock = {
      id: newBlockId,
      type,
      layoutType: isPositioned ? 'positioned' : 'flow',
      content: defaultContent,
      headingLevel: extra.headingLevel || 1,
      calloutType: extra.calloutType || 'info',
      codeLanguage: extra.codeLanguage || 'javascript',
      x: isPositioned ? smartX : undefined,
      y: isPositioned ? smartY : undefined,
      width: isPositioned ? (type === 'diagram' ? 580 : 200) : undefined,
      height: isPositioned ? (type === 'diagram' ? 180 : 80) : undefined,
      updatedBy: userName,
      updatedAt: Date.now(),
    };

    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        if (p.id !== targetPage.id) return p;
        return { ...p, blocks: [...p.blocks, newBlock] };
      });
      const nextDoc = { ...prev, pages: nextPages, updatedAt: Date.now() };
      pushHistory(nextDoc);
      return nextDoc;
    });

    setSelectedBlockId(newBlockId);

    if (socket && sessionId) {
      socket.emit("study:block_create", {
        sessionId,
        pageId: targetPage.id,
        block: newBlock,
        updatedBy: userName,
      });
    }
  }, [doc.pages, currentPageNumber, userName, socket, sessionId, pushHistory]);

  // Action: Update Block
  const handleUpdateBlock = useCallback((blockId: string, updatedFields: Partial<DocumentBlock>) => {
    let targetPageId = '';

    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        const hasBlock = p.blocks.some(b => b.id === blockId);
        if (!hasBlock) return p;
        targetPageId = p.id;
        const nextBlocks = p.blocks.map(b => (b.id === blockId ? { ...b, ...updatedFields, updatedAt: Date.now(), updatedBy: userName } : b));
        return { ...p, blocks: nextBlocks };
      });
      return { ...prev, pages: nextPages, updatedAt: Date.now() };
    });

    if (socket && sessionId && targetPageId) {
      socket.emit("study:block_update", {
        sessionId,
        pageId: targetPageId,
        blockId,
        block: updatedFields,
        updatedBy: userName,
      });
    }
  }, [socket, sessionId, userName]);

  // Action: Move Positioned Block
  const handleBlockMovePositioned = useCallback((blockId: string, x: number, y: number) => {
    let targetPageId = '';

    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        const hasBlock = p.blocks.some(b => b.id === blockId);
        if (!hasBlock) return p;
        targetPageId = p.id;
        const nextBlocks = p.blocks.map(b => (b.id === blockId ? { ...b, x, y } : b));
        return { ...p, blocks: nextBlocks };
      });
      return { ...prev, pages: nextPages };
    });

    if (socket && sessionId && targetPageId) {
      socket.emit("study:block_move", {
        sessionId,
        pageId: targetPageId,
        blockId,
        x,
        y,
        updatedBy: userName,
      });
    }
  }, [socket, sessionId, userName]);

  // Action: Delete Block
  const handleDeleteBlock = useCallback((blockId: string) => {
    let targetPageId = '';

    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        const hasBlock = p.blocks.some(b => b.id === blockId);
        if (!hasBlock) return p;
        targetPageId = p.id;
        return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
      });
      const nextDoc = { ...prev, pages: nextPages, updatedAt: Date.now() };
      pushHistory(nextDoc);
      return nextDoc;
    });

    if (selectedBlockId === blockId) setSelectedBlockId(null);

    if (socket && sessionId && targetPageId) {
      socket.emit("study:block_delete", {
        sessionId,
        pageId: targetPageId,
        blockId,
        updatedBy: userName,
      });
    }
  }, [selectedBlockId, socket, sessionId, userName, pushHistory]);

  // Action: Move Flow Block Up/Down
  const handleMoveBlockFlow = useCallback((blockId: string, direction: 'up' | 'down') => {
    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        const idx = p.blocks.findIndex(b => b.id === blockId);
        if (idx === -1) return p;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= p.blocks.length) return p;

        const nextBlocks = [...p.blocks];
        const temp = nextBlocks[idx];
        nextBlocks[idx] = nextBlocks[targetIdx];
        nextBlocks[targetIdx] = temp;
        return { ...p, blocks: nextBlocks };
      });
      const nextDoc = { ...prev, pages: nextPages, updatedAt: Date.now() };
      pushHistory(nextDoc);
      return nextDoc;
    });
  }, [pushHistory]);

  // Action: Duplicate Block
  const handleDuplicateBlock = useCallback((blockId: string) => {
    const targetPage = doc.pages.find(p => p.blocks.some(b => b.id === blockId));
    if (!targetPage) return;
    const targetBlock = targetPage.blocks.find(b => b.id === blockId);
    if (!targetBlock) return;

    const clonedBlock: DocumentBlock = {
      ...targetBlock,
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      x: targetBlock.x !== undefined ? targetBlock.x + 20 : undefined,
      y: targetBlock.y !== undefined ? targetBlock.y + 20 : undefined,
      updatedAt: Date.now(),
      updatedBy: userName,
    };

    setDoc((prev) => {
      const nextPages = prev.pages.map((p) => {
        if (p.id !== targetPage.id) return p;
        const idx = p.blocks.findIndex(b => b.id === blockId);
        const nextBlocks = [...p.blocks];
        nextBlocks.splice(idx + 1, 0, clonedBlock);
        return { ...p, blocks: nextBlocks };
      });
      const nextDoc = { ...prev, pages: nextPages, updatedAt: Date.now() };
      pushHistory(nextDoc);
      return nextDoc;
    });

    setSelectedBlockId(clonedBlock.id);

    if (socket && sessionId) {
      socket.emit("study:block_create", {
        sessionId,
        pageId: targetPage.id,
        block: clonedBlock,
        updatedBy: userName,
      });
    }
  }, [doc.pages, userName, socket, sessionId, pushHistory]);

  // Action: Align Selected Objects (Relative to Selection Bounding Box)
  const handleAlignSelected = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => {
    const targetPage = doc.pages.find(p => p.pageNumber === currentPageNumber);
    if (!targetPage) return;

    const dims = PAGE_DIMENSIONS[doc.settings.format]?.[doc.settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
    const margin = MARGIN_VALUES[doc.settings.margins] || 48;

    const blocksToAlign = targetPage.blocks.filter(b => b.layoutType === 'positioned' && selectedBlockIds.includes(b.id));
    if (blocksToAlign.length < 2) return;

    const minX = Math.min(...blocksToAlign.map(b => b.x ?? margin));
    const maxX = Math.max(...blocksToAlign.map(b => (b.x ?? margin) + (b.width || 180)));
    const minY = Math.min(...blocksToAlign.map(b => b.y ?? margin));
    const maxY = Math.max(...blocksToAlign.map(b => (b.y ?? margin) + (b.height || 80)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const updatedBlocks = blocksToAlign.map(b => ({ ...b }));

    if (alignment === 'left') {
      updatedBlocks.forEach(b => { b.x = minX; });
    } else if (alignment === 'center') {
      updatedBlocks.forEach(b => { b.x = Math.round(centerX - (b.width || 180) / 2); });
    } else if (alignment === 'right') {
      updatedBlocks.forEach(b => { b.x = maxX - (b.width || 180); });
    } else if (alignment === 'top') {
      updatedBlocks.forEach(b => { b.y = minY; });
    } else if (alignment === 'middle') {
      updatedBlocks.forEach(b => { b.y = Math.round(centerY - (b.height || 80) / 2); });
    } else if (alignment === 'bottom') {
      updatedBlocks.forEach(b => { b.y = maxY - (b.height || 80); });
    } else if (alignment === 'distribute-h' && blocksToAlign.length >= 3) {
      const sorted = [...updatedBlocks].sort((a, b) => (a.x || 0) - (b.x || 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidths = sorted.reduce((sum, b) => sum + (b.width || 180), 0) - (first.width || 180) - (last.width || 180);
      const span = (last.x || 0) - ((first.x || 0) + (first.width || 180));
      const gap = (span - totalWidths) / (sorted.length - 1);
      let curX = (first.x || 0) + (first.width || 180) + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].x = Math.round(curX);
        curX += (sorted[i].width || 180) + gap;
      }
    } else if (alignment === 'distribute-v' && blocksToAlign.length >= 3) {
      const sorted = [...updatedBlocks].sort((a, b) => (a.y || 0) - (b.y || 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeights = sorted.reduce((sum, b) => sum + (b.height || 80), 0) - (first.height || 80) - (last.height || 80);
      const span = (last.y || 0) - ((first.y || 0) + (first.height || 80));
      const gap = (span - totalHeights) / (sorted.length - 1);
      let curY = (first.y || 0) + (first.height || 80) + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].y = Math.round(curY);
        curY += (sorted[i].height || 80) + gap;
      }
    }

    // Boundary check: ensure no object can escape printable paper workspace
    updatedBlocks.forEach(b => {
      const w = b.width || 180;
      const h = b.height || 80;
      b.x = Math.max(margin, Math.min(dims.width - margin - w, b.x ?? margin));
      b.y = Math.max(margin + 20, Math.min(dims.height - margin - h - 30, b.y ?? margin));
    });

    const nextPages = doc.pages.map(p => {
      if (p.id !== targetPage.id) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => {
          const up = updatedBlocks.find(ub => ub.id === b.id);
          return up ? up : b;
        })
      };
    });

    const nextDoc = { ...doc, pages: nextPages, updatedAt: Date.now() };
    setDoc(nextDoc);
    pushHistory(nextDoc);

    updatedBlocks.forEach(b => {
      if (socket && sessionId) {
        socket.emit("study:block_move", {
          sessionId,
          pageId: targetPage.id,
          blockId: b.id,
          x: b.x,
          y: b.y,
          updatedBy: userName,
        });
      }
    });
  }, [doc, currentPageNumber, selectedBlockIds, pushHistory, socket, sessionId, userName]);

  // Action: Align Objects to Page Margins
  const handleAlignPage = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const targetPage = doc.pages.find(p => p.pageNumber === currentPageNumber);
    if (!targetPage) return;

    const dims = PAGE_DIMENSIONS[doc.settings.format]?.[doc.settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
    const margin = MARGIN_VALUES[doc.settings.margins] || 48;

    const targetIds = selectedBlockIds.length > 0 ? selectedBlockIds : (selectedBlockId ? [selectedBlockId] : []);
    const blocksToAlign = targetPage.blocks.filter(b => b.layoutType === 'positioned' && targetIds.includes(b.id));
    if (blocksToAlign.length === 0) return;

    const updatedBlocks = blocksToAlign.map(b => {
      const w = b.width || 180;
      const h = b.height || 80;
      let newX = b.x ?? margin;
      let newY = b.y ?? margin;

      if (alignment === 'left') newX = margin;
      if (alignment === 'center') newX = Math.round((dims.width - w) / 2);
      if (alignment === 'right') newX = dims.width - margin - w;
      if (alignment === 'top') newY = margin + 30;
      if (alignment === 'middle') newY = Math.round((dims.height - h) / 2);
      if (alignment === 'bottom') newY = dims.height - margin - h - 30;

      return {
        ...b,
        x: Math.max(margin, Math.min(dims.width - margin - w, newX)),
        y: Math.max(margin + 20, Math.min(dims.height - margin - h - 30, newY)),
      };
    });

    const nextPages = doc.pages.map(p => {
      if (p.id !== targetPage.id) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => {
          const up = updatedBlocks.find(ub => ub.id === b.id);
          return up ? up : b;
        })
      };
    });

    const nextDoc = { ...doc, pages: nextPages, updatedAt: Date.now() };
    setDoc(nextDoc);
    pushHistory(nextDoc);

    updatedBlocks.forEach(b => {
      if (socket && sessionId) {
        socket.emit("study:block_move", {
          sessionId,
          pageId: targetPage.id,
          blockId: b.id,
          x: b.x,
          y: b.y,
          updatedBy: userName,
        });
      }
    });
  }, [doc, currentPageNumber, selectedBlockIds, selectedBlockId, pushHistory, socket, sessionId, userName]);

  // Action: Page / Selection Auto-Layout (Requirements #16-#25)
  const handleAutoLayout = useCallback((type: 'stack' | 'horizontal' | 'grid' | 'diagram') => {
    const targetPage = doc.pages.find(p => p.pageNumber === currentPageNumber);
    if (!targetPage) return;

    const dims = PAGE_DIMENSIONS[doc.settings.format]?.[doc.settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
    const margin = MARGIN_VALUES[doc.settings.margins] || 48;
    const paddingX = margin + 16;
    const paddingY = margin + 30;
    const availW = dims.width - paddingX * 2;
    const availH = dims.height - paddingY - margin - 30;
    const gap = 20;

    const targetBlocks = selectedBlockIds.length > 1
      ? targetPage.blocks.filter(b => b.layoutType === 'positioned' && selectedBlockIds.includes(b.id))
      : targetPage.blocks.filter(b => b.layoutType === 'positioned');

    if (targetBlocks.length < 2) return;

    const otherBlocks = targetPage.blocks.filter(b => !targetBlocks.some(tb => tb.id === b.id));
    let updatedPositioned: DocumentBlock[] = [];

    if (type === 'stack') {
      const sorted = [...targetBlocks].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
      let curX = paddingX;
      let curY = paddingY;
      let colMaxW = 0;

      updatedPositioned = sorted.map(b => {
        const w = Math.min(b.width || 180, availW);
        const h = b.height || 80;
        colMaxW = Math.max(colMaxW, w);

        if (curY + h > paddingY + availH && curY > paddingY) {
          curX += colMaxW + gap;
          curY = paddingY;
          colMaxW = w;
        }

        const finalX = Math.max(paddingX, Math.min(dims.width - margin - w, curX));
        const finalY = Math.max(paddingY, Math.min(dims.height - margin - h - 30, curY));
        curY += h + gap;

        return { ...b, x: Math.round(finalX), y: Math.round(finalY) };
      });
    } else if (type === 'horizontal') {
      const sorted = [...targetBlocks].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      let curX = paddingX;
      let curY = paddingY;
      let rowMaxH = 0;

      updatedPositioned = sorted.map(b => {
        const w = Math.min(b.width || 180, availW);
        const h = b.height || 80;

        if (curX + w > paddingX + availW && curX > paddingX) {
          curX = paddingX;
          curY += rowMaxH + gap;
          rowMaxH = 0;
        }

        rowMaxH = Math.max(rowMaxH, h);
        const finalX = Math.max(paddingX, Math.min(dims.width - margin - w, curX));
        const finalY = Math.max(paddingY, Math.min(dims.height - margin - h - 30, curY));
        curX += w + gap;

        return { ...b, x: Math.round(finalX), y: Math.round(finalY) };
      });
    } else if (type === 'grid') {
      const sorted = [...targetBlocks].sort((a, b) => ((a.y ?? 0) * 1000 + (a.x ?? 0)) - ((b.y ?? 0) * 1000 + (b.x ?? 0)));
      const numCols = Math.max(1, Math.min(3, Math.floor((availW + gap) / (240 + gap))));
      const cellW = Math.floor((availW - (numCols - 1) * gap) / numCols);

      const rowHeights: number[] = [];
      sorted.forEach((b, idx) => {
        const row = Math.floor(idx / numCols);
        const h = b.height || 80;
        rowHeights[row] = Math.max(rowHeights[row] || 0, h);
      });

      updatedPositioned = sorted.map((b, idx) => {
        const col = idx % numCols;
        const row = Math.floor(idx / numCols);
        const w = Math.min(b.width || cellW, cellW);
        const h = b.height || 80;

        let curY = paddingY;
        for (let r = 0; r < row; r++) {
          curY += (rowHeights[r] || 80) + gap;
        }

        const curX = paddingX + col * (cellW + gap);
        const finalX = Math.max(paddingX, Math.min(dims.width - margin - w, curX));
        const finalY = Math.max(paddingY, Math.min(dims.height - margin - h - 30, curY));

        return { ...b, x: Math.round(finalX), y: Math.round(finalY) };
      });
    } else {
      // Diagram / Flow relationship layout
      const sorted = [...targetBlocks].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
      const stepGap = 24;
      let curY = paddingY;
      updatedPositioned = sorted.map((b) => {
        const w = Math.min(b.width || 220, availW);
        const h = b.height || 80;
        const centerX = Math.round((dims.width - w) / 2);
        const finalY = Math.max(paddingY, Math.min(dims.height - margin - h - 30, curY));
        curY += h + stepGap;
        return { ...b, x: centerX, y: Math.round(finalY) };
      });
    }

    const nextPages = doc.pages.map(p => {
      if (p.id !== targetPage.id) return p;
      return {
        ...p,
        blocks: [...otherBlocks, ...updatedPositioned],
      };
    });

    const nextDoc = { ...doc, pages: nextPages, updatedAt: Date.now() };
    setDoc(nextDoc);
    pushHistory(nextDoc);

    updatedPositioned.forEach(b => {
      if (socket && sessionId) {
        socket.emit("study:block_move", {
          sessionId,
          pageId: targetPage.id,
          blockId: b.id,
          x: b.x,
          y: b.y,
          updatedBy: userName,
        });
      }
    });
  }, [doc, currentPageNumber, selectedBlockIds, pushHistory, socket, sessionId, userName]);

  // Action: Jump to Page
  const handleSelectPage = useCallback((pageNumber: number) => {
    setCurrentPageNumber(pageNumber);
    const targetPage = doc.pages.find(p => p.pageNumber === pageNumber);
    if (targetPage) {
      const pageEl = document.getElementById(`document-page-${targetPage.id}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [doc.pages]);

  // Action: High-Fidelity Multi-Page PDF Export with In-Product Modal & Zero Raw Alert
  const handleExportPdf = useCallback(async (safeMode = false) => {
    try {
      setIsExportingPdf(true);
      setPdfModalState({
        isOpen: true,
        status: 'rendering',
        progressText: 'Preparing document pages and validating layout...',
      });

      const printContainer = document.getElementById("document-pdf-print-container");
      if (!printContainer) throw new Error("Print document surface could not be located");

      const pageElements = printContainer.querySelectorAll<HTMLElement>(".print-page-surface");
      if (pageElements.length === 0) throw new Error("No pages available to generate");

      // Validate images
      const images = Array.from(printContainer.querySelectorAll<HTMLImageElement>("img"));
      let failedImageCount = 0;
      for (const img of images) {
        if (!img.complete || img.naturalWidth === 0) {
          failedImageCount++;
          if (safeMode) {
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='70' viewBox='0 0 140 70'%3E%3Crect width='140' height='70' fill='%23f1f5f9' stroke='%23cbd5e1' stroke-width='2'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2364748b'%3EImage Unavailable%3C/text%3E%3C/svg%3E";
          }
        }
      }

      if (failedImageCount > 0 && !safeMode) {
        setPdfModalState({
          isOpen: true,
          status: 'error',
          progressText: '',
          errorMessage: `${failedImageCount} external image(s) could not be loaded or are blocked by browser cross-origin policy. You can export a clean version with styled image placeholders.`,
          failedImageCount,
        });
        setIsExportingPdf(false);
        return;
      }

      setPdfModalState(prev => ({ ...prev, progressText: 'Generating PDF document...' }));

      const isLandscape = doc.settings.orientation === "landscape";
      const format = doc.settings.format === "a4" ? "a4" : doc.settings.format === "letter" ? "letter" : "legal";

      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "pt",
        format: format,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        setPdfModalState(prev => ({
          ...prev,
          progressText: `Rendering page ${i + 1} of ${pageElements.length}...`,
        }));

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc, clonedElement) => {
            try {
              const resetStyle = clonedDoc.createElement('style');
              resetStyle.innerHTML = `
                *, *::before, *::after {
                  color-scheme: light !important;
                }
              `;
              clonedDoc.head.appendChild(resetStyle);

              // Purge CSS Level 4 lab() or oklch() color expressions that crash html2canvas
              const all = clonedElement.querySelectorAll("*");
              all.forEach((node) => {
                const el = node as HTMLElement;
                const styleAttr = el.getAttribute("style") || "";
                if (styleAttr.includes("lab(") || styleAttr.includes("oklch(")) {
                  el.setAttribute(
                    "style",
                    styleAttr.replace(/lab\([^)]+\)/g, "#0f172a").replace(/oklch\([^)]+\)/g, "#0f172a")
                  );
                }
              });
            } catch (e) {
              console.warn("onclone sanitize error:", e);
            }
          }
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage(format, isLandscape ? "landscape" : "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      const fileName = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "Group_Study_Document"}.pdf`;
      pdf.save(fileName);

      setPdfModalState({
        isOpen: true,
        status: 'success',
        progressText: 'Export completed successfully!',
      });
    } catch (err: any) {
      console.error("PDF Export error:", err);
      setPdfModalState({
        isOpen: true,
        status: 'error',
        progressText: '',
        errorMessage: err?.message || 'Failed to complete PDF generation. Please ensure document elements are visible.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  }, [doc.settings.orientation, doc.settings.format, doc.title]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        return;
      }

      // Delete / Backspace when a block is selected (and not focused in an input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && !isInput) {
        e.preventDefault();
        handleDeleteBlock(selectedBlockId);
        return;
      }

      // Ctrl+D or Cmd+D to duplicate selected block
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedBlockId && !isInput) {
        e.preventDefault();
        handleDuplicateBlock(selectedBlockId);
        return;
      }

      // Ctrl+Z to undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isInput) {
        e.preventDefault();
        if (historyIndex > 0) {
          setDoc(history[historyIndex - 1]);
          setHistoryIndex(historyIndex - 1);
        }
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y to redo
      if (
        (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
         ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) && !isInput
      ) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          setDoc(history[historyIndex + 1]);
          setHistoryIndex(historyIndex + 1);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, handleDeleteBlock, handleDuplicateBlock, history, historyIndex]);

  const activeCollaboratorsList = Array.from(collaborators.values());

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden select-none">
      {/* 1. TOP DOCUMENT TOOLBAR (Contextual Formatting & Global Actions) */}
      <DocumentToolbar
        title={doc.title}
        onTitleChange={handleTitleChange}
        settings={doc.settings}
        onSettingsChange={handleSettingsChange}
        canEdit={canEdit}
        isHost={isHost}
        currentPageNumber={currentPageNumber}
        totalPages={doc.pages.length}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitPage={handleFitPage}
        collaborators={activeCollaboratorsList}
        syncStatus={syncStatus}
        isExportingPdf={isExportingPdf}
        onExportPdf={() => handleExportPdf(false)}
        onUndo={() => {
          if (historyIndex > 0) {
            setDoc(history[historyIndex - 1]);
            setHistoryIndex(historyIndex - 1);
          }
        }}
        onRedo={() => {
          if (historyIndex < history.length - 1) {
            setDoc(history[historyIndex + 1]);
            setHistoryIndex(historyIndex + 1);
          }
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        selectedBlock={selectedBlock}
        onUpdateBlock={handleUpdateBlock}
        onDeleteBlock={handleDeleteBlock}
        onDuplicateBlock={handleDuplicateBlock}
        onAutoLayout={handleAutoLayout}
        isMobile={isMobile}
        fitZoom={fitZoom}
        onOpenToolbox={() => setIsSidebarOpen(true)}
        onOpenProperties={() => setIsSidebarOpen(true)}
      />

      {/* 2. MAIN WORKSPACE: CANVAS (CENTER) + RIGHT SIDEBAR */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        {/* Main Document Canvas Viewport */}
        {(() => {
          const activePage = doc.pages.find(p => p.pageNumber === currentPageNumber) || doc.pages[0];
          const dims = PAGE_DIMENSIONS[doc.settings?.format || 'a4']?.[doc.settings?.orientation || 'portrait'] || PAGE_DIMENSIONS.a4.portrait;
          const pageWidth = dims.width;
          const pageHeight = dims.height + 36;
          const scaledWidth = Math.round(pageWidth * zoom);
          const scaledHeight = Math.round(pageHeight * zoom);
          const isAtFit = isMobile && Math.abs(zoom - fitZoom) < 0.04;

          return (
            <div 
              ref={containerRef}
              onTouchEnd={handleTouchEndCanvas}
              className={`flex-1 h-full select-text relative transition-all ${
                isMobile
                  ? isAtFit
                    ? 'overflow-hidden flex flex-col items-center justify-center p-2'
                    : 'overflow-auto custom-scrollbar flex flex-col items-center justify-start p-3 touch-pan-x touch-pan-y'
                  : 'overflow-auto custom-scrollbar p-4 sm:p-8 flex flex-col items-center'
              }`}
              onClick={() => setSelectedBlockId(null)}
            >
              {isMobile ? (
                /* Mobile Outer Sizer (Section 2, 4, 6): exact scaled dimensions prevent layout overflow & center the page */
                <div 
                  className={`relative shrink-0 flex items-center justify-center transition-all ${
                    isAtFit ? 'my-auto' : 'my-2'
                  }`}
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                  }}
                >
                  <div
                    style={{
                      width: `${pageWidth}px`,
                      height: `${pageHeight}px`,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  >
                    <DocumentPage
                      key={activePage.id}
                      page={activePage}
                      totalPages={doc.pages.length}
                      settings={doc.settings}
                      isHost={isHost}
                      canEdit={canEdit}
                      userName={userName}
                      userColor={userColor}
                      selectedBlockId={selectedBlockId}
                      collaboratorsOnPage={activeCollaboratorsList.filter(c => c.activePageNumber === activePage.pageNumber)}
                      zoom={zoom}
                      onSelectBlock={handleSelectBlock}
                      onUpdateBlock={handleUpdateBlock}
                      onDeleteBlock={handleDeleteBlock}
                      onMoveBlockFlow={handleMoveBlockFlow}
                      onDuplicateBlock={handleDuplicateBlock}
                      onBlockMovePositioned={handleBlockMovePositioned}
                      onAddBlockOnPage={(pageId, type, extra) => handleAddBlock(type, extra)}
                      onDuplicatePage={handleDuplicatePage}
                      onDeletePage={handleDeletePage}
                      onAddNextPage={handleAddPage}
                    />
                  </div>
                </div>
              ) : (
                /* Desktop Layout: Unchanged, Locked (Section 38) */
                <div 
                  className="transition-transform duration-100 ease-out origin-top flex flex-col items-center gap-8 pb-32"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {doc.pages.map((page) => (
                    <DocumentPage
                      key={page.id}
                      page={page}
                      totalPages={doc.pages.length}
                      settings={doc.settings}
                      isHost={isHost}
                      canEdit={canEdit}
                      userName={userName}
                      userColor={userColor}
                      selectedBlockId={selectedBlockId}
                      collaboratorsOnPage={activeCollaboratorsList.filter(c => c.activePageNumber === page.pageNumber)}
                      zoom={zoom}
                      onSelectBlock={handleSelectBlock}
                      onUpdateBlock={handleUpdateBlock}
                      onDeleteBlock={handleDeleteBlock}
                      onMoveBlockFlow={handleMoveBlockFlow}
                      onDuplicateBlock={handleDuplicateBlock}
                      onBlockMovePositioned={handleBlockMovePositioned}
                      onAddBlockOnPage={(pageId, type, extra) => handleAddBlock(type, extra)}
                      onDuplicatePage={handleDuplicatePage}
                      onDeletePage={handleDeletePage}
                      onAddNextPage={handleAddPage}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. DEDICATED RIGHT SIDEBAR (Desktop Side Panel & Mobile Bottom Sheet) */}
        <DocumentSidebar
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen(prev => !prev)}
          selectedBlock={selectedBlock}
          selectedBlocks={selectedBlocks}
          canEdit={canEdit}
          onAddBlock={handleAddBlock}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          onDuplicateBlock={handleDuplicateBlock}
          isMobile={isMobile}
          settings={doc.settings}
          onSettingsChange={handleSettingsChange}
          onAutoLayout={handleAutoLayout}
          onAlignSelected={handleAlignSelected}
          onAlignPage={handleAlignPage}
          currentPageNumber={currentPageNumber}
          totalPages={doc.pages.length}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onDuplicatePage={() => handleDuplicatePage(doc.pages.find(p => p.pageNumber === currentPageNumber)?.id || doc.pages[0]?.id || '')}
          onDeletePage={() => handleDeletePage(doc.pages.find(p => p.pageNumber === currentPageNumber)?.id || '')}
        />
      </div>

      {/* 4. MOBILE BOTTOM NAVIGATION ZONE (Section 8, 26, 28) vs DESKTOP MINIMAP (Section 38: Locked Desktop) */}
      {isMobile ? (
        <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),0.75rem)+0.5rem)] left-3 z-40 flex flex-col items-start gap-2 select-none">
          {/* Collapsible Bird's-Eye View Popover for Mobile */}
          {isMobileMinimapOpen && (
            <div 
              className="bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl p-2.5 backdrop-blur-xl max-h-64 w-52 overflow-y-auto flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
                <span className="font-bold text-white flex items-center gap-1">
                  <MapIcon className="w-3.5 h-3.5 text-blue-400" /> Pages
                </span>
                <span className="text-[10px] text-slate-400">{doc.pages.length} pages</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 py-1">
                {doc.pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleSelectPage(p.pageNumber);
                      setIsMobileMinimapOpen(false);
                    }}
                    className={`p-1.5 rounded-lg border text-center text-xs transition-all ${
                      p.pageNumber === currentPageNumber
                        ? 'border-blue-500 bg-blue-600/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>Page {p.pageNumber}</div>
                    <div className="text-[9px] text-slate-500">{p.blocks.length} blocks</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compact Page Control Pill */}
          <div className="flex items-center gap-1 bg-slate-900/95 border border-slate-700/90 rounded-full px-2 py-1 shadow-2xl backdrop-blur-xl text-xs">
            <button
              onClick={() => handleSelectPage(Math.max(1, currentPageNumber - 1))}
              disabled={currentPageNumber <= 1}
              className="p-1 rounded-full text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-[11px] text-slate-200 px-1 font-mono">
              {currentPageNumber} / {doc.pages.length}
            </span>
            <button
              onClick={() => handleSelectPage(Math.min(doc.pages.length, currentPageNumber + 1))}
              disabled={currentPageNumber >= doc.pages.length}
              className="p-1 rounded-full text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <button
                onClick={handleAddPage}
                className="ml-0.5 p-1 rounded-full bg-blue-600/30 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors"
                title="Add Page"
                aria-label="Add Page"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setIsMobileMinimapOpen(prev => !prev)}
              className={`ml-1 p-1 rounded-full transition-colors ${
                isMobileMinimapOpen ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Bird's-Eye View"
              aria-label="Bird's-Eye View"
            >
              <MapIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Bird's-Eye View (Locked Desktop Experience) */
        <DocumentMinimap
          pages={doc.pages}
          settings={doc.settings}
          currentPageNumber={currentPageNumber}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          collaborators={activeCollaboratorsList}
          canEdit={canEdit}
        />
      )}

      {/* 5. IN-PRODUCT PDF EXPORT MODAL (Replaces Raw Browser Alert) */}
      <PdfExportModal
        state={pdfModalState}
        onClose={() => setPdfModalState(prev => ({ ...prev, isOpen: false }))}
        onRetry={() => handleExportPdf(false)}
        onExportSafe={() => handleExportPdf(true)}
      />

      {/* 6. CLEAN CONTAINER FOR PURE PDF EXPORT (No Workspace UI, No Zoom Scaling) */}
      <div 
        id="document-pdf-print-container" 
        className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 select-none"
        aria-hidden="true"
      >
        {doc.pages.map((page) => {
          const dims = PAGE_DIMENSIONS[doc.settings.format]?.[doc.settings.orientation] || PAGE_DIMENSIONS.a4.portrait;

          return (
            <div
              key={page.id}
              className="print-page-surface bg-white text-slate-900 overflow-hidden"
              style={{
                width: `${dims.width}px`,
                height: `${dims.height}px`,
                position: 'relative',
                boxSizing: 'border-box',
                padding: `${doc.settings.margins === 'narrow' ? 24 : doc.settings.margins === 'wide' ? 72 : 48}px`,
              }}
            >
              {/* Running Print Header */}
              <div className="absolute top-4 left-0 right-0 px-12 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100 pb-1">
                <span>{doc.settings.headerText || doc.title}</span>
                <span>{page.pageNumber}</span>
              </div>

              {/* Page Content */}
              <div className="relative w-full h-full flex flex-col">
                {page.blocks.filter(b => b.layoutType === 'flow').map((block) => {
                  const s = block.style || {};
                  const textStyle: React.CSSProperties = {
                    textAlign: s.align || 'left',
                    color: s.color || '#0f172a',
                    backgroundColor: s.bgColor || 'transparent',
                    fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
                    fontFamily: s.fontFamily || 'Inter',
                    fontWeight: s.bold ? 'bold' : 'normal',
                    fontStyle: s.italic ? 'italic' : 'normal',
                    textDecoration: [
                      s.underline ? 'underline' : '',
                      s.strikethrough ? 'line-through' : ''
                    ].filter(Boolean).join(' ') || 'none',
                  };

                  return (
                    <div key={block.id} className="my-2">
                      {block.type === 'heading' && (
                        <h2 
                          style={textStyle}
                          className={`${block.headingLevel === 1 ? 'text-2xl font-bold' : block.headingLevel === 2 ? 'text-xl font-semibold' : 'text-lg font-medium'}`}
                        >
                          {block.content}
                        </h2>
                      )}
                      {block.type === 'text' && (
                        <p style={textStyle} className="text-sm leading-relaxed whitespace-pre-wrap">
                          {block.content}
                        </p>
                      )}
                      {block.type === 'bullet' && (
                        <ul className="list-disc list-outside pl-5 space-y-1 text-sm text-slate-800">
                          {(Array.isArray(block.content) ? block.content : []).map((item: string, idx: number) => (
                            <li key={idx} style={textStyle}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {block.type === 'numbered' && (
                        <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-slate-800">
                          {(Array.isArray(block.content) ? block.content : []).map((item: string, idx: number) => (
                            <li key={idx} style={textStyle}>{item}</li>
                          ))}
                        </ol>
                      )}
                      {block.type === 'checklist' && (
                        <div className="space-y-1.5 text-sm">
                          {(Array.isArray(block.content) ? block.content : []).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${item.checked ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-400'}`}>
                                {item.checked ? '✓' : ''}
                              </span>
                              <span className={item.checked ? 'line-through text-slate-400' : 'text-slate-800'}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {block.type === 'quote' && (() => {
                        const quoteData: QuoteData = typeof block.content === 'object' && block.content !== null
                          ? block.content
                          : { text: typeof block.content === 'string' ? block.content : '' };
                        return (
                          <div 
                            className="p-3 my-2 border-l-4 font-serif text-sm transition-all"
                            style={{
                              backgroundColor: quoteData.bgColor || '#f8fafc',
                              borderLeftColor: quoteData.accentColor || quoteData.borderColor || '#3b82f6',
                              color: quoteData.textColor || '#334155',
                              borderLeftWidth: `${quoteData.borderWidth ?? 4}px`,
                              fontStyle: quoteData.italic !== false ? 'italic' : 'normal',
                              borderRadius: `${quoteData.borderRadius ?? 8}px`,
                            }}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{quoteData.text || 'Quote text...'}</p>
                            {quoteData.author && (
                              <div className="mt-1.5 text-xs font-sans font-medium opacity-75 not-italic">
                                — {quoteData.author}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {block.type === 'divider' && (
                        <hr className="border-t border-slate-300 my-2" />
                      )}
                      {block.type === 'table' && block.content?.headers && (
                        <table className="w-full border-collapse border border-slate-300 text-xs my-2">
                          <thead className="bg-slate-100">
                            <tr>
                              {block.content.headers.map((h: string, idx: number) => (
                                <th key={idx} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(block.content.rows || []).map((row: string[], rIdx: number) => (
                              <tr key={rIdx}>
                                {row.map((cell: string, cIdx: number) => {
                                  const cellKey = `${rIdx}-${cIdx}`;
                                  const cellBg = block.content.cellBgColors?.[cellKey];
                                  const cellColor = block.content.cellTextColors?.[cellKey];
                                  return (
                                    <td 
                                      key={cIdx} 
                                      className="border border-slate-300 p-2"
                                      style={{
                                        backgroundColor: cellBg || undefined,
                                        color: cellColor || undefined
                                      }}
                                    >
                                      {cell}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {block.type === 'callout' && (() => {
                        const calloutData: CalloutData = typeof block.content === 'object' && block.content !== null
                          ? block.content
                          : { type: 'info', body: typeof block.content === 'string' ? block.content : '' };
                        const preset = CALLOUT_PRESETS[calloutData.type] || CALLOUT_PRESETS.info;
                        return (
                          <div 
                            className="p-3.5 rounded-xl border text-xs my-2.5 transition-all"
                            style={{
                              backgroundColor: calloutData.bgColor || preset.bgColor,
                              borderColor: calloutData.borderColor || preset.borderColor,
                              color: calloutData.textColor || preset.textColor,
                            }}
                          >
                            {calloutData.title && (
                              <div className="font-bold text-sm mb-1">{calloutData.title}</div>
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed">{calloutData.body || ''}</div>
                          </div>
                        );
                      })()}
                      {block.type === 'code' && (
                        <div className="rounded-lg p-3 bg-slate-900 text-slate-100 font-mono text-xs my-2 whitespace-pre-wrap">
                          {block.content}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Positioned Blocks in Print */}
                {page.blocks.filter(b => b.layoutType === 'positioned').map((block) => (
                  <div
                    key={block.id}
                    style={{
                      position: 'absolute',
                      left: `${block.x || 48}px`,
                      top: `${block.y || 48}px`,
                      width: block.width ? `${block.width}px` : undefined,
                      height: block.height ? `${block.height}px` : undefined,
                    }}
                  >
                    {block.type === 'shape' && (
                      <div 
                        className="w-full h-full flex items-center justify-center p-2 text-xs font-semibold text-center"
                        style={{
                          backgroundColor: block.content?.color || '#dbeafe',
                          borderColor: block.content?.borderColor || '#3b82f6',
                          borderWidth: `${block.content?.borderWidth !== undefined ? block.content.borderWidth : 2}px`,
                          borderStyle: block.content?.borderStyle || 'solid',
                          borderRadius: block.content?.shapeType === 'circle' ? '50%' : block.content?.shapeType === 'rounded' ? '12px' : '4px',
                          color: block.content?.textColor || '#1e3a8a',
                          opacity: block.content?.opacity !== undefined ? block.content.opacity : 1,
                        }}
                      >
                        {block.content?.label || 'Shape'}
                      </div>
                    )}
                    {block.type === 'diagram' && (
                      <div className="relative w-full h-full border border-slate-200 rounded-lg p-2 bg-slate-50">
                        {/* SVG Connections with dynamic anchors & bezier curves */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          <defs>
                            <marker id="pdf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                            </marker>
                          </defs>
                          {(block.content?.connections || []).map((conn: any) => {
                            const fromNode = (block.content?.nodes || []).find((n: any) => n.id === conn.from);
                            const toNode = (block.content?.nodes || []).find((n: any) => n.id === conn.to);
                            if (!fromNode || !toNode) return null;
                            
                            const fw = fromNode.width || 100;
                            const fh = fromNode.height || 44;
                            const tw = toNode.width || 100;
                            const th = toNode.height || 44;

                            const isHorizontal = Math.abs(toNode.x - fromNode.x) > Math.abs(toNode.y - fromNode.y);
                            let x1 = fromNode.x + fw / 2;
                            let y1 = fromNode.y + fh / 2;
                            let x2 = toNode.x + tw / 2;
                            let y2 = toNode.y + th / 2;

                            if (isHorizontal) {
                              if (toNode.x > fromNode.x) {
                                x1 = fromNode.x + fw;
                                x2 = toNode.x;
                              } else {
                                x1 = fromNode.x;
                                x2 = toNode.x + tw;
                              }
                            } else {
                              if (toNode.y > fromNode.y) {
                                y1 = fromNode.y + fh;
                                y2 = toNode.y;
                              } else {
                                y1 = fromNode.y;
                                y2 = toNode.y + th;
                              }
                            }

                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const d = isHorizontal
                              ? `M ${x1} ${y1} C ${x1 + dx * 0.5} ${y1}, ${x2 - dx * 0.5} ${y2}, ${x2} ${y2}`
                              : `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.5}, ${x2} ${y2 - dy * 0.5}, ${x2} ${y2}`;

                            return (
                              <path
                                key={conn.id}
                                d={d}
                                fill="none"
                                stroke={conn.color || "#64748b"}
                                strokeWidth="2"
                                markerEnd="url(#pdf-arrow)"
                              />
                            );
                          })}
                        </svg>

                        {(block.content?.nodes || []).map((node: any) => {
                          const nw = node.width || 100;
                          const nh = node.height || 44;
                          const isDiamond = node.shape === 'diamond';
                          return (
                            <div 
                              key={node.id}
                              className="absolute flex items-center justify-center px-2 py-1 text-xs font-semibold text-white shadow-sm"
                              style={{
                                left: `${node.x}px`,
                                top: `${node.y}px`,
                                width: `${nw}px`,
                                height: `${nh}px`,
                                backgroundColor: node.color || '#3b82f6',
                                borderRadius: isDiamond ? '0px' : node.shape === 'pill' ? '9999px' : node.shape === 'circle' ? '50%' : '6px',
                                transform: isDiamond ? 'rotate(45deg)' : undefined,
                                color: node.textColor || '#ffffff',
                              }}
                            >
                              <span style={{ transform: isDiamond ? 'rotate(-45deg)' : undefined }}>
                                {node.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {block.type === 'image' && block.content?.url && (
                      <div className="flex flex-col items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={block.content.url} alt="" className="max-w-xs max-h-48 object-contain rounded" />
                        {block.content.caption && <span className="text-[10px] text-slate-500 mt-1">{block.content.caption}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Running Print Footer */}
              {doc.settings.showPageNumbers && (
                <div className="absolute bottom-4 left-0 right-0 px-12 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1">
                  <span>{doc.settings.footerText || ''}</span>
                  <span>Page {page.pageNumber} of {doc.pages.length}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
