"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import { Pencil, Type, Square, Circle, Triangle, Eraser, Undo2, Redo2, Move, Check, Lock, MousePointer2, Minus, Settings2, Trash2, ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Tool = "draw" | "text" | "rect" | "circle" | "line" | "eraser" | "lineEraser" | "pan" | "move" | "triangle";

interface Point { x: number; y: number; }

interface BoardElement {
  id: string;
  kind: "stroke" | "text" | "rect" | "circle" | "line" | "eraseStroke" | "triangle";
  points?: Point[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  fontFamily?: "sans" | "serif" | "mono";
  fontSize?: number;
  color: string;
  thickness?: number;
  author: string;
  createdAt: number;
}

interface UserPermissions {
  draw: boolean;
  erase: boolean;
  type: boolean;
  move: boolean;
}

interface BoardConfig {
  mode: "live" | "private";
  defaultPermissions: UserPermissions;
  userPermissions: Record<string, UserPermissions>;
  elements: BoardElement[];
}

const palette = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ffffff", "#000000"];

const DEFAULT_PERMS: UserPermissions = { draw: true, erase: true, type: true, move: true };

const FALLBACK_BOARD: BoardConfig = {
  mode: "live",
  defaultPermissions: DEFAULT_PERMS,
  userPermissions: {},
  elements: [],
};

// Helper: distance between line segment (p, w) and point p0
function distToSegment(p0: Point, v: Point, w: Point) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p0.x - v.x, p0.y - v.y);
  let t = ((p0.x - v.x) * (w.x - v.x) + (p0.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p0.x - (v.x + t * (w.x - v.x)), p0.y - (v.y + t * (w.y - v.y)));
}

export function ThinkingBoard({
  socket,
  sessionId,
  userName,
  session,
  isHost = false,
}: {
  socket: Socket;
  sessionId: string;
  userName: string;
  session?: any;
  isHost?: boolean;
  onExit?: () => void;
}) {
  const board = useMemo(() => (session?.activityData?.board || FALLBACK_BOARD) as BoardConfig, [session?.activityData?.board]);

  const [localElements, setLocalElements] = useState<BoardElement[]>(board.elements || []);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(palette[0]);
  const [thickness, setThickness] = useState(3);
  const [freq, setFreq] = useState<"low" | "medium" | "high">("medium"); // input sampling freq
  const [eraserFreq, setEraserFreq] = useState<"low" | "medium" | "high">("medium");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [fontSize, setFontSize] = useState(24);

  const [history, setHistory] = useState<BoardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([]);
  
  const [draftShape, setDraftShape] = useState<BoardElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [showTextInput, setShowTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const startPointRef = useRef<Point | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [movingElementId, setMovingElementId] = useState<string | null>(null);

  const pinchRef = useRef<{ dist: number; scale: number; pan: Point } | null>(null);
  const activePointersRef = useRef<Map<number, PointerEvent>>(new Map());

  const lastEventTimeRef = useRef<number>(0);

  const participants = (session?.participants || []).filter((p: any) => p.isConnected);
  const spectators = new Set<string>(session?.spectators || []);

  const myPerms = useMemo(() => {
    if (isHost) return { draw: true, erase: true, type: true, move: true };
    if (spectators.has(userName)) return { draw: false, erase: false, type: false, move: false };
    return board.userPermissions?.[userName] || board.defaultPermissions || DEFAULT_PERMS;
  }, [isHost, spectators, userName, board.userPermissions, board.defaultPermissions]);

  const hasServerBoard = !!session?.activityData?.board;

  useEffect(() => {
    if (board.elements && board.elements.length !== localElements.length) {
      setLocalElements(board.elements);
    } else if (board.elements && JSON.stringify(board.elements) !== JSON.stringify(localElements)) {
      setLocalElements(board.elements);
    }
  }, [board.elements]);

  useEffect(() => {
    if (!isHost || !session || hasServerBoard) return;
    socket.emit("board:set_config", { 
      sessionId, 
      mode: "live", 
      defaultPermissions: DEFAULT_PERMS, 
      userPermissions: {} 
    });
  }, [isHost, session, hasServerBoard, socket, sessionId]);

  const pushHistory = (snapshot: BoardElement[]) => {
    setHistory((h) => [...h.slice(-29), snapshot]);
    setRedoStack([]);
  };

  const syncLive = useCallback((next: BoardElement[]) => {
    setLocalElements(next);
    socket.emit("board:sync_state", { sessionId, elements: next });
  }, [socket, sessionId]);

  const drawElementsToCanvas = (ctx: CanvasRenderingContext2D, elements: BoardElement[], canvasWidth: number, canvasHeight: number) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const el of elements) {
      if (el.kind === "text") continue; // Text is rendered via DOM
      
      ctx.beginPath();
      if (el.kind === "eraseStroke") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = el.thickness || 20;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.thickness || 3;
      }

      if ((el.kind === "stroke" || el.kind === "eraseStroke") && el.points?.length) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.kind === "line" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.stroke();
      } else if (el.kind === "rect" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.rect(Math.min(el.x, el.x + el.w), Math.min(el.y, el.y + el.h), Math.abs(el.w), Math.abs(el.h));
        ctx.stroke();
      } else if (el.kind === "circle" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        const rx = Math.abs(el.w) / 2;
        const ry = Math.abs(el.h) / 2;
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.kind === "triangle" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
        ctx.moveTo(el.x + el.w / 2, el.y);
        ctx.lineTo(el.x, el.y + el.h);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    
    // Auto-resize canvas to match container
    const resize = () => {
      if (containerRef.current) {
        cvs.width = containerRef.current.clientWidth;
        cvs.height = containerRef.current.clientHeight;
        if (draftCanvasRef.current) {
          draftCanvasRef.current.width = cvs.width;
          draftCanvasRef.current.height = cvs.height;
        }
        drawElementsToCanvas(ctx, localElements, cvs.width, cvs.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Use requestAnimationFrame for rendering
    let rafId: number;
    const render = () => {
      drawElementsToCanvas(ctx, localElements, cvs.width, cvs.height);
      rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [localElements, pan, scale]);

  useEffect(() => {
    const dCvs = draftCanvasRef.current;
    if (!dCvs) return;
    const dCtx = dCvs.getContext("2d");
    if (!dCtx) return;
    
    let rafId: number;
    const renderDraft = () => {
      dCtx.clearRect(0, 0, dCvs.width, dCvs.height);
      if (draftShape) {
        drawElementsToCanvas(dCtx, [draftShape], dCvs.width, dCvs.height);
      }
      rafId = requestAnimationFrame(renderDraft);
    };
    renderDraft();
    return () => cancelAnimationFrame(rafId);
  }, [draftShape, pan, scale]);

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale };
  }, [pan, scale]);

  const getPointerDist = (e1: PointerEvent, e2: PointerEvent) => Math.hypot(e1.clientX - e2.clientX, e1.clientY - e2.clientY);
  const getPointerCenter = (e1: PointerEvent, e2: PointerEvent) => ({ x: (e1.clientX + e2.clientX) / 2, y: (e1.clientY + e2.clientY) / 2 });

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture:", err);
    }
    activePointersRef.current.set(e.pointerId, e.nativeEvent);

    if (activePointersRef.current.size === 2) {
      setIsDrawing(false);
      setDraftShape(null);
      const [p1, p2] = [...activePointersRef.current.values()];
      pinchRef.current = { dist: getPointerDist(p1, p2), scale, pan: { ...pan } };
      setIsPanning(true);
      return;
    }

    if (tool === "pan" || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      return;
    }

    const p = toCanvasPoint(e.clientX, e.clientY);

    // Tools logic
    if (tool === "draw" && myPerms.draw) {
      startPointRef.current = p;
      setIsDrawing(true);
      setDraftShape({
        id: Math.random().toString(36).slice(2, 10),
        kind: "stroke",
        points: [p],
        color,
        thickness,
        author: userName,
        createdAt: Date.now(),
      });
    } else if (tool === "eraser" && myPerms.erase) {
      startPointRef.current = p;
      setIsDrawing(true);
      setDraftShape({
        id: Math.random().toString(36).slice(2, 10),
        kind: "eraseStroke",
        points: [p],
        color: "transparent", // acts as eraser mask
        thickness: 20,
        author: userName,
        createdAt: Date.now(),
      });
    } else if (tool === "lineEraser" && myPerms.erase) {
      // Find element to delete
      const hitRadius = 15 / scale;
      for (let i = localElements.length - 1; i >= 0; i--) {
        const el = localElements[i];
        let hit = false;
        if (el.kind === "stroke" && el.points) {
          for (let j = 0; j < el.points.length - 1; j++) {
            if (distToSegment(p, el.points[j], el.points[j+1]) < hitRadius) { hit = true; break; }
          }
        } else if (el.kind === "line" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
          if (distToSegment(p, {x: el.x, y: el.y}, {x: el.x + el.w, y: el.y + el.h}) < hitRadius) hit = true;
        } else if (el.kind === "rect" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
          if (p.x >= Math.min(el.x, el.x + el.w) && p.x <= Math.max(el.x, el.x + el.w) &&
              p.y >= Math.min(el.y, el.y + el.h) && p.y <= Math.max(el.y, el.y + el.h)) hit = true;
        } else if (el.kind === "circle" && el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined) {
          const cx = el.x + el.w / 2; const cy = el.y + el.h / 2;
          if (Math.hypot(p.x - cx, p.y - cy) <= Math.max(Math.abs(el.w), Math.abs(el.h)) / 2) hit = true;
        } else if (el.kind === "text" && el.x !== undefined && el.y !== undefined) {
           if (Math.hypot(p.x - el.x, p.y - el.y) < 30 / scale) hit = true; // rough hit test for text
        }
        
        if (hit) {
          pushHistory(localElements);
          syncLive(localElements.filter(e => e.id !== el.id));
          break;
        }
      }
    } else if (tool === "text" && myPerms.type) {
      setShowTextInput(p);
      setTextDraft("");
      setEditingTextId(null);
    } else if (tool === "move" && myPerms.move) {
      // Find text element to move
      for (let i = localElements.length - 1; i >= 0; i--) {
        const el = localElements[i];
        if (el.kind === "text" && el.x !== undefined && el.y !== undefined) {
          if (Math.hypot(p.x - el.x, p.y - el.y) < 40 / scale) {
            setMovingElementId(el.id);
            startPointRef.current = p;
            setIsDrawing(true);
            pushHistory(localElements); // save state before move
            break;
          }
        }
      }
    } else if ((tool === "rect" || tool === "circle" || tool === "line" || tool === "triangle") && myPerms.draw) {
      startPointRef.current = p;
      setIsDrawing(true);
      setDraftShape({
        id: Math.random().toString(36).slice(2, 10),
        kind: tool,
        x: p.x, y: p.y, w: 0, h: 0,
        color, thickness, author: userName, createdAt: Date.now(),
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, e.nativeEvent);

    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const [p1, p2] = [...activePointersRef.current.values()];
      const newDist = getPointerDist(p1, p2);
      const ratio = newDist / pinchRef.current.dist;
      setScale(Math.max(0.1, Math.min(5, pinchRef.current.scale * ratio)));
      
      const center = getPointerCenter(p1, p2);
      setPan({
        x: center.x - (center.x - pinchRef.current.pan.x) * ratio,
        y: center.y - (center.y - pinchRef.current.pan.y) * ratio
      });
      return;
    }

    if (isPanning) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      return;
    }

    if (!isDrawing || !startPointRef.current) return;

    // Frequency throttling for draw/erase
    const now = Date.now();
    const currentFreq = tool === "eraser" ? eraserFreq : freq;
    const msThrottle = currentFreq === "low" ? 50 : currentFreq === "medium" ? 25 : 5;
    if (now - lastEventTimeRef.current < msThrottle && (tool === "draw" || tool === "eraser")) return;
    lastEventTimeRef.current = now;

    const p = toCanvasPoint(e.clientX, e.clientY);

    if (tool === "move" && movingElementId) {
      setLocalElements(prev => prev.map(el => {
        if (el.id === movingElementId) {
          return { ...el, x: (el.x || 0) + (p.x - startPointRef.current!.x), y: (el.y || 0) + (p.y - startPointRef.current!.y) };
        }
        return el;
      }));
      startPointRef.current = p;
    } else if (draftShape) {
      if (draftShape.kind === "stroke" || draftShape.kind === "eraseStroke") {
        setDraftShape({ ...draftShape, points: [...(draftShape.points || []), p] });
      } else {
        setDraftShape({ ...draftShape, w: p.x - startPointRef.current.x, h: p.y - startPointRef.current.y });
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;

    if (isPanning) {
      if (activePointersRef.current.size === 0) setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === "move" && movingElementId) {
      syncLive(localElements);
      setMovingElementId(null);
    } else if (draftShape) {
      pushHistory(localElements);
      syncLive([...localElements, draftShape]);
      setDraftShape(null);
    }
    startPointRef.current = null;
  };

  const submitText = () => {
    if (!showTextInput || !textDraft.trim()) {
      setShowTextInput(null); setEditingTextId(null);
      return;
    }
    
    if (editingTextId) {
      pushHistory(localElements);
      syncLive(localElements.map(el => el.id === editingTextId ? { ...el, text: textDraft.trim(), fontFamily, fontSize, color } : el));
    } else {
      const textEl: BoardElement = {
        id: Math.random().toString(36).slice(2, 10),
        kind: "text",
        x: showTextInput.x, y: showTextInput.y,
        text: textDraft.trim(),
        fontFamily, fontSize, color,
        author: userName, createdAt: Date.now(),
      };
      pushHistory(localElements);
      syncLive([...localElements, textEl]);
    }
    setShowTextInput(null);
    setTextDraft("");
    setEditingTextId(null);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, localElements]);
    syncLive(prev);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, localElements]);
    syncLive(next);
  };

  const toggleUserPerm = (name: string, perm: keyof UserPermissions) => {
    const current = board.userPermissions[name] || board.defaultPermissions;
    const next = { ...current, [perm]: !current[perm] };
    socket.emit("board:set_config", {
      sessionId,
      userPermissions: { ...board.userPermissions, [name]: next }
    });
  };

  return (
    <div
      className="absolute inset-0 bg-[#0B0E14] overflow-hidden touch-none"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={(e) => {
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size === 0) { setIsPanning(false); setIsDrawing(false); pinchRef.current = null; }
      }}
      onWheel={(e) => {
        if (e.ctrlKey) { e.preventDefault(); setScale((s) => Math.max(0.1, Math.min(5, s - e.deltaY * 0.01))); } 
        else { setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY })); }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: `${40 * scale}px ${40 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <canvas ref={draftCanvasRef} className="absolute inset-0 pointer-events-none" />

      {/* DOM layer for Text Nodes */}
      <div className="absolute inset-0 origin-top-left pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
        {localElements.filter((e) => e.kind === "text").map((el) => (
          <div 
            key={el.id} 
            onPointerDown={(e) => {
              if (myPerms.type && e.detail === 2) { // double click to edit
                setShowTextInput({ x: el.x || 0, y: el.y || 0 });
                setTextDraft(el.text || "");
                setEditingTextId(el.id);
                setFontFamily(el.fontFamily || "sans");
                setFontSize(el.fontSize || 24);
                setColor(el.color);
              }
            }}
            className={`absolute pointer-events-auto break-words whitespace-pre-wrap max-w-sm ${myPerms.type ? "cursor-text hover:outline outline-1 outline-white/20" : ""}`} 
            style={{ 
              left: el.x, top: el.y, 
              color: el.color,
              fontFamily: el.fontFamily === "mono" ? "monospace" : el.fontFamily === "serif" ? "serif" : "sans-serif",
              fontSize: `${el.fontSize || 24}px`,
              lineHeight: 1.2
            }}
          >
            {el.text}
          </div>
        ))}
      </div>

      {/* Toolbar Layer - Optimized for Mobile (Double Row) */}
      <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#0A0D14]/90 backdrop-blur-2xl p-2 sm:px-4 sm:py-2.5 rounded-[1.5rem] sm:rounded-full border border-white/10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-[98vw] sm:max-w-fit">
        
        {/* Row 1: Primary Tools */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
          <button onClick={() => setTool("pan")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors ${tool === "pan" ? "bg-primary text-black" : "text-white/60 hover:text-white"}`} title="Pan (Space/Middle Click)"><Move className="w-4 h-4 sm:w-5 h-5" /></button>
          <button disabled={!myPerms.move} onClick={() => setTool("move")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 ${tool === "move" ? "bg-primary text-black" : "text-white/60 hover:text-white"}`} title="Move Text"><MousePointer2 className="w-4 h-4 sm:w-5 h-5" /></button>
        </div>
        
        <div className="w-px h-6 sm:h-8 bg-white/10" />
        
        <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
          <Popover>
            <PopoverTrigger disabled={!myPerms.draw} onClick={() => setTool("draw")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 ${tool === "draw" ? "bg-primary text-black" : "text-white/60 hover:text-white"}`} title="Draw">
              <Pencil className="w-4 h-4 sm:w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 bg-black/90 border-white/10 backdrop-blur-xl">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Thickness</p>
                  <Slider value={[thickness]} onValueChange={(v: any) => setThickness(Array.isArray(v) ? v[0] : v)} max={20} min={1} step={1} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Smoothing Freq</p>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map((f) => (
                      <Button key={f} size="sm" variant={freq === f ? "default" : "secondary"} onClick={() => setFreq(f as any)} className="flex-1 capitalize text-xs">{f}</Button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger disabled={!myPerms.type} onClick={() => setTool("text")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 ${tool === "text" ? "bg-primary text-black" : "text-white/60 hover:text-white"}`} title="Text">
              <Type className="w-4 h-4 sm:w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 bg-black/90 border-white/10 backdrop-blur-xl space-y-4">
               <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Font Family</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant={fontFamily === "sans" ? "default" : "secondary"} onClick={() => setFontFamily("sans")} className="flex-1 text-xs font-sans">Sans</Button>
                    <Button size="sm" variant={fontFamily === "serif" ? "default" : "secondary"} onClick={() => setFontFamily("serif")} className="flex-1 text-xs font-serif">Serif</Button>
                    <Button size="sm" variant={fontFamily === "mono" ? "default" : "secondary"} onClick={() => setFontFamily("mono")} className="flex-1 text-xs font-mono">Mono</Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Size</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant={fontSize === 16 ? "default" : "secondary"} onClick={() => setFontSize(16)} className="flex-1 text-xs">Sm</Button>
                    <Button size="sm" variant={fontSize === 24 ? "default" : "secondary"} onClick={() => setFontSize(24)} className="flex-1 text-xs">Md</Button>
                    <Button size="sm" variant={fontSize === 36 ? "default" : "secondary"} onClick={() => setFontSize(36)} className="flex-1 text-xs">Lg</Button>
                  </div>
                </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger disabled={!myPerms.draw} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 ${(tool === "rect" || tool === "circle" || tool === "line" || tool === "triangle") ? "bg-primary text-black" : "text-white/60 hover:text-white"}`} title="Shapes">
              {tool === "rect" ? <Square className="w-4 h-4 sm:w-5 h-5" /> : 
               tool === "circle" ? <Circle className="w-4 h-4 sm:w-5 h-5" /> : 
               tool === "triangle" ? <Triangle className="w-4 h-4 sm:w-5 h-5" /> : 
               tool === "line" ? <Minus className="w-4 h-4 sm:w-5 h-5 transform -rotate-45" /> : 
               <Square className="w-4 h-4 sm:w-5 h-5" />}
            </PopoverTrigger>
            <PopoverContent side="top" className="w-44 bg-black/95 border-white/10 backdrop-blur-xl p-1 shadow-2xl rounded-xl">
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" onClick={() => setTool("rect")} className={`justify-start gap-3 h-11 px-3 rounded-lg ${tool === "rect" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  <Square className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Rectangle</span>
                </Button>
                <Button variant="ghost" onClick={() => setTool("circle")} className={`justify-start gap-3 h-11 px-3 rounded-lg ${tool === "circle" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  <Circle className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Circle</span>
                </Button>
                <Button variant="ghost" onClick={() => setTool("triangle")} className={`justify-start gap-3 h-11 px-3 rounded-lg ${tool === "triangle" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  <Triangle className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Triangle</span>
                </Button>
                <Button variant="ghost" onClick={() => setTool("line")} className={`justify-start gap-3 h-11 px-3 rounded-lg ${tool === "line" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  <Minus className="w-4 h-4 transform -rotate-45" /> <span className="text-xs font-bold uppercase tracking-wider">Line</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-px h-8 bg-white/10" />
        
        <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
          <Popover>
            <PopoverTrigger disabled={!myPerms.erase} onClick={() => setTool("eraser")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 ${tool === "eraser" ? "bg-red-400 text-black" : "text-white/60 hover:text-white"}`} title="Eraser Brush">
              <Eraser className="w-4 h-4 sm:w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 bg-black/90 border-white/10 backdrop-blur-xl space-y-4">
              <div>
                <p className="text-xs font-bold text-white/50 mb-2">Eraser Frequency</p>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((f) => (
                    <Button key={f} size="sm" variant={eraserFreq === f ? "default" : "secondary"} onClick={() => setEraserFreq(f as any)} className="flex-1 capitalize text-xs">{f}</Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button disabled={!myPerms.erase} onClick={() => setTool("lineEraser")} className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 ${tool === "lineEraser" ? "bg-red-500 text-black" : "text-white/60 hover:text-white"}`} title="Delete Whole Element">
            <Trash2 className="w-4 h-4 sm:w-5 h-5" />
          </button>
        </div>

        <div className="w-px h-8 bg-white/10" />

        <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
          <button disabled={!history.length} onClick={undo} className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30" title="Undo"><Undo2 className="w-4 h-4 sm:w-5 h-5" /></button>
          <button disabled={!redoStack.length} onClick={redo} className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30" title="Redo"><Redo2 className="w-4 h-4 sm:w-5 h-5" /></button>
        </div>
        
        </div>
        
        {/* Row 2: Secondary Tools (Colors & Zoom) */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-px h-6 bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2">
          {palette.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform ${color === c ? "ring-2 ring-white scale-110" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>

        <div className="w-px h-8 bg-white/10 hidden sm:block" />
        
        <div className="bg-white/5 rounded-xl p-0.5 sm:p-1 flex">
          <button onClick={() => setScale(s => Math.min(5, s * 1.2))} className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white" title="Zoom In"><ZoomIn className="w-4 h-4 sm:w-5 h-5" /></button>
          <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))} className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white" title="Zoom Out"><ZoomOut className="w-4 h-4 sm:w-5 h-5" /></button>
          <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white" title="Reset View"><Maximize2 className="w-4 h-4 sm:w-5 h-5" /></button>
        </div>


      </div>
    </div>

      {isHost && (
        <div className="absolute top-4 right-4 z-[150] flex flex-col items-end gap-2">
          <Popover>
            <PopoverTrigger className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 text-sm font-medium rounded-md hover:bg-black hover:text-white transition-colors flex items-center shadow-xl cursor-pointer">
              <Settings2 className="w-4 h-4 mr-2"/> Permissions
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-black/95 border-white/10 p-4">
              <h4 className="font-bold text-sm mb-4">Board Permissions</h4>
              <div className="space-y-4 max-h-[60vh] overflow-auto">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Default (New Users)</p>
                  <div className="flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={board.defaultPermissions?.draw ?? true} onChange={() => {
                      socket.emit("board:set_config", { sessionId, defaultPermissions: { ...(board.defaultPermissions || DEFAULT_PERMS), draw: !(board.defaultPermissions?.draw ?? true) }});
                    }}/> Draw</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={board.defaultPermissions?.erase ?? true} onChange={() => {
                      socket.emit("board:set_config", { sessionId, defaultPermissions: { ...(board.defaultPermissions || DEFAULT_PERMS), erase: !(board.defaultPermissions?.erase ?? true) }});
                    }}/> Erase</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={board.defaultPermissions?.type ?? true} onChange={() => {
                      socket.emit("board:set_config", { sessionId, defaultPermissions: { ...(board.defaultPermissions || DEFAULT_PERMS), type: !(board.defaultPermissions?.type ?? true) }});
                    }}/> Type</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={board.defaultPermissions?.move ?? true} onChange={() => {
                      socket.emit("board:set_config", { sessionId, defaultPermissions: { ...(board.defaultPermissions || DEFAULT_PERMS), move: !(board.defaultPermissions?.move ?? true) }});
                    }}/> Move</label>
                  </div>
                </div>

                {participants.filter((p:any) => p.role !== "host" && !spectators.has(p.name)).map((p: any) => {
                  const perms = board.userPermissions?.[p.name] || board.defaultPermissions || DEFAULT_PERMS;
                  return (
                    <div key={p.name} className="p-2 border-b border-white/5">
                      <p className="text-sm font-medium mb-2">{p.name}</p>
                      <div className="flex justify-between items-center text-xs text-white/70">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={perms.draw ?? true} onChange={() => toggleUserPerm(p.name, "draw")}/> Draw</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={perms.erase ?? true} onChange={() => toggleUserPerm(p.name, "erase")}/> Erase</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={perms.type ?? true} onChange={() => toggleUserPerm(p.name, "type")}/> Type</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={perms.move} onChange={() => toggleUserPerm(p.name, "move")}/> Move</label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <AnimatePresence>
        {showTextInput && (
          <motion.div 
            onPointerDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="absolute z-30 bg-black/90 border border-white/20 rounded-xl p-3 shadow-2xl flex flex-col gap-2" 
            style={{ left: showTextInput.x * scale + pan.x, top: showTextInput.y * scale + pan.y }}
          >
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitText();
                if (e.key === "Escape") { setShowTextInput(null); setEditingTextId(null); }
              }}
              autoFocus
              placeholder="Type text... (Ctrl+Enter to save)"
              className="bg-white/5 border border-white/10 rounded-lg p-2 text-white min-w-[200px] min-h-[80px] resize-none focus:outline-none focus:ring-2 ring-primary/50"
              style={{ fontFamily: fontFamily === "mono" ? "monospace" : fontFamily === "serif" ? "serif" : "sans-serif", fontSize: "14px" }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowTextInput(null); setEditingTextId(null); }}>Cancel</Button>
              <Button size="sm" onClick={submitText}>Save</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
