"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import { Pencil, Type, Shapes, Eraser, Undo2, Redo2, Move, Check, Lock } from "lucide-react";

type Tool = "draw" | "text" | "rect" | "circle" | "line" | "eraser" | "pan";

interface Point {
  x: number;
  y: number;
}

interface BoardElement {
  id: string;
  kind: "stroke" | "text" | "rect" | "circle" | "line";
  points?: Point[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  color: string;
  author: string;
  createdAt: number;
}

interface BoardConfig {
  mode: "live" | "private";
  livePermission: "all" | "host" | "selected";
  allowedUsers: string[];
  elements: BoardElement[];
}

const palette = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#ffffff"];

const FALLBACK_BOARD: BoardConfig = {
  mode: "live",
  livePermission: "all",
  allowedUsers: [],
  elements: [],
};

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
}) {
  const board = useMemo(() => (session?.activityData?.board || FALLBACK_BOARD) as BoardConfig, [session?.activityData?.board]);

  const [localElements, setLocalElements] = useState<BoardElement[]>(board.elements || []);
  const [privateElements, setPrivateElements] = useState<BoardElement[]>([]);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(palette[0]);
  const [privateEditing, setPrivateEditing] = useState(false);
  const [livePermission, setLivePermission] = useState<"all" | "host" | "selected">(board.livePermission || "all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>(board.allowedUsers || []);
  const [history, setHistory] = useState<BoardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([]);
  const [draftShape, setDraftShape] = useState<BoardElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTextInput, setShowTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState("");

  const startPointRef = useRef<Point | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Pinch-to-zoom state
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const activePointersRef = useRef<Map<number, PointerEvent>>(new Map());

  const participants = (session?.participants || []).filter((p: any) => p.isConnected);
  const spectators = new Set<string>(session?.spectators || []);

  const canDrawLive = useMemo(() => {
    if (spectators.has(userName)) return false;
    if (board.livePermission === "all") return true;
    if (board.livePermission === "host") return isHost;
    return isHost || (board.allowedUsers || []).includes(userName);
  }, [board.livePermission, board.allowedUsers, spectators, userName, isHost]);

  const canDraw = board.mode === "live" ? canDrawLive : privateEditing && !spectators.has(userName);
  const activeElements = board.mode === "private" && privateEditing ? privateElements : localElements;

  const hasServerBoard = !!session?.activityData?.board;

  useEffect(() => {
    if (board.elements && JSON.stringify(board.elements) !== JSON.stringify(localElements)) {
      setLocalElements(board.elements);
    }
    setLivePermission(board.livePermission || "all");
    setSelectedUsers(board.allowedUsers || []);
  }, [board.elements, board.livePermission, board.allowedUsers, board.mode]);

  useEffect(() => {
    if (!isHost || !session || hasServerBoard) return;
    socket.emit("board:set_config", { sessionId, mode: "live", livePermission: "all", allowedUsers: [] });
  }, [isHost, session, hasServerBoard, socket, sessionId]);

  const pushHistory = (snapshot: BoardElement[]) => {
    setHistory((h) => [...h.slice(-29), snapshot]);
    setRedoStack([]);
  };

  const syncLive = (next: BoardElement[]) => {
    setLocalElements(next);
    socket.emit("board:sync_state", { sessionId, elements: next });
  };

  const applyElements = (next: BoardElement[]) => {
    if (board.mode === "private" && privateEditing) {
      setPrivateElements(next);
      return;
    }
    syncLive(next);
  };

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale };
  }, [pan, scale]);

  const getPointerDist = (e1: PointerEvent, e2: PointerEvent) => {
    return Math.hypot(e1.clientX - e2.clientX, e1.clientY - e2.clientY);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, e.nativeEvent);

    // Two-finger pinch/pan on mobile
    if (activePointersRef.current.size === 2) {
      setIsDrawing(false);
      setDraftShape(null);
      const [p1, p2] = [...activePointersRef.current.values()];
      pinchRef.current = { dist: getPointerDist(p1, p2), scale };
      setIsPanning(true);
      return;
    }

    if (tool === "pan" || !canDraw) {
      if (tool === "pan" || e.button === 1) setIsPanning(true);
      return;
    }
    const p = toCanvasPoint(e.clientX, e.clientY);
    startPointRef.current = p;
    setIsDrawing(true);

    if (tool === "draw" || tool === "eraser") {
      const stroke: BoardElement = {
        id: Math.random().toString(36).slice(2, 10),
        kind: "stroke",
        points: [p],
        color: tool === "eraser" ? "#0B0E14" : color,
        author: userName,
        createdAt: Date.now(),
      };
      setDraftShape(stroke);
    } else if (tool === "text") {
      setShowTextInput(p);
      setTextDraft("");
      setIsDrawing(false);
    } else {
      setDraftShape({
        id: Math.random().toString(36).slice(2, 10),
        kind: tool as "rect" | "circle" | "line",
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color,
        author: userName,
        createdAt: Date.now(),
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, e.nativeEvent);

    // Two-finger pinch-to-zoom
    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const [p1, p2] = [...activePointersRef.current.values()];
      const newDist = getPointerDist(p1, p2);
      const ratio = newDist / pinchRef.current.dist;
      setScale(Math.max(0.2, Math.min(3, pinchRef.current.scale * ratio)));
      // Also pan with two fingers
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      return;
    }

    if (isPanning) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      return;
    }
    if (!isDrawing || !draftShape || !startPointRef.current) return;
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (draftShape.kind === "stroke") {
      setDraftShape({ ...draftShape, points: [...(draftShape.points || []), p] });
    } else {
      setDraftShape({ ...draftShape, w: p.x - startPointRef.current.x, h: p.y - startPointRef.current.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (isPanning) {
      if (activePointersRef.current.size === 0) setIsPanning(false);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!draftShape) return;
    pushHistory(activeElements);
    applyElements([...activeElements, draftShape]);
    setDraftShape(null);
    startPointRef.current = null;
  };

  const submitText = () => {
    if (!showTextInput || !textDraft.trim()) {
      setShowTextInput(null);
      return;
    }
    const textEl: BoardElement = {
      id: Math.random().toString(36).slice(2, 10),
      kind: "text",
      x: showTextInput.x,
      y: showTextInput.y,
      text: textDraft.trim(),
      color,
      author: userName,
      createdAt: Date.now(),
    };
    pushHistory(activeElements);
    applyElements([...activeElements, textEl]);
    setShowTextInput(null);
    setTextDraft("");
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, activeElements]);
    applyElements(prev);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, activeElements]);
    applyElements(next);
  };

  const toggleAllowed = (name: string) => {
    const next = selectedUsers.includes(name) ? selectedUsers.filter((n) => n !== name) : [...selectedUsers, name];
    setSelectedUsers(next);
    socket.emit("board:set_config", { sessionId, allowedUsers: next, livePermission, mode: board.mode });
  };

  return (
    <div
      className="absolute inset-0 bg-[#0B0E14] overflow-hidden touch-none"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={(e) => {
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size === 0) {
          setIsPanning(false);
          setIsDrawing(false);
          pinchRef.current = null;
        }
      }}
      onWheel={(e) => {
        const delta = e.deltaY * -0.001;
        setScale((s) => Math.max(0.2, Math.min(3, s + delta)));
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: `${40 * scale}px ${40 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2 py-2 rounded-xl border border-white/10 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setTool("pan")} className={`p-3 rounded-lg ${tool === "pan" ? "bg-primary text-black" : "bg-white/10"}`}><Move className="w-5 h-5" /></button>
        <button onClick={() => setTool("draw")} className={`p-3 rounded-lg ${tool === "draw" ? "bg-primary text-black" : "bg-white/10"}`}><Pencil className="w-5 h-5" /></button>
        <button onClick={() => setTool("text")} className={`p-3 rounded-lg ${tool === "text" ? "bg-primary text-black" : "bg-white/10"}`}><Type className="w-5 h-5" /></button>
        <button onClick={() => setTool("rect")} className={`p-3 rounded-lg ${tool === "rect" ? "bg-primary text-black" : "bg-white/10"}`}><Shapes className="w-5 h-5" /></button>
        <button onClick={() => setTool("circle")} className={`p-3 rounded-lg text-lg ${tool === "circle" ? "bg-primary text-black" : "bg-white/10"}`}>◯</button>
        <button onClick={() => setTool("line")} className={`p-3 rounded-lg text-lg ${tool === "line" ? "bg-primary text-black" : "bg-white/10"}`}>／</button>
        <button onClick={() => setTool("eraser")} className={`p-3 rounded-lg ${tool === "eraser" ? "bg-primary text-black" : "bg-white/10"}`}><Eraser className="w-5 h-5" /></button>
        <button onClick={undo} className="p-3 rounded-lg bg-white/10"><Undo2 className="w-5 h-5" /></button>
        <button onClick={redo} className="p-3 rounded-lg bg-white/10"><Redo2 className="w-5 h-5" /></button>
        <div className="flex items-center gap-1 px-1">
          {palette.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? "ring-2 ring-white" : ""}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center gap-1 ml-1">
          <button onClick={() => setScale((s) => Math.max(0.2, s - 0.2))} className="w-8 h-8 rounded-lg bg-white/10 text-lg">-</button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="w-8 h-8 rounded-lg bg-white/10 text-lg">+</button>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className={`px-3 py-2 rounded-xl border text-xs font-semibold ${board.mode === "live" ? "bg-emerald-500/20 border-emerald-400/40" : "bg-violet-500/20 border-violet-400/40"}`}>
          {board.mode === "live" ? "Live Drawing Enabled" : "Private Creation Mode"}
        </div>
        {board.mode === "private" && !spectators.has(userName) && (
          <div className="flex gap-2">
            {!privateEditing ? (
              <button onClick={() => setPrivateEditing(true)} className="px-3 py-2 rounded-lg bg-primary text-black text-xs font-bold">Start Creating</button>
            ) : (
              <button
                onClick={() => {
                  if (privateElements.length) socket.emit("board:submit_private", { sessionId, elements: privateElements });
                  setPrivateElements([]);
                  setPrivateEditing(false);
                }}
                className="px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Done
              </button>
            )}
          </div>
        )}
      </div>

      {isHost && (
        <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 w-full max-w-[280px] md:max-w-[320px]">
          <p className="text-[10px] md:text-xs font-bold mb-2 uppercase tracking-widest text-white/40">Host Controls</p>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => socket.emit("board:set_config", { sessionId, mode: "live", livePermission, allowedUsers: selectedUsers })}
              className={`px-2 py-1 rounded text-xs ${board.mode === "live" ? "bg-primary text-black" : "bg-white/10"}`}
            >
              Live Mode
            </button>
            <button
              onClick={() => socket.emit("board:set_config", { sessionId, mode: "private", livePermission, allowedUsers: selectedUsers })}
              className={`px-2 py-1 rounded text-xs ${board.mode === "private" ? "bg-primary text-black" : "bg-white/10"}`}
            >
              Private Mode
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            {(["host", "selected", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setLivePermission(p);
                  socket.emit("board:set_config", { sessionId, mode: board.mode, livePermission: p, allowedUsers: selectedUsers });
                }}
                className={`px-2 py-1 rounded text-xs ${livePermission === p ? "bg-emerald-500 text-black" : "bg-white/10"}`}
              >
                {p}
              </button>
            ))}
          </div>
          {livePermission === "selected" && (
            <div className="max-h-24 overflow-auto space-y-1 pr-1">
              {participants
                .filter((p: any) => !spectators.has(p.name))
                .map((p: any) => (
                  <button key={p.name} onClick={() => toggleAllowed(p.name)} className="w-full text-left text-xs px-2 py-1 rounded bg-white/10 flex items-center justify-between">
                    <span>{p.name}</span>
                    {selectedUsers.includes(p.name) ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3 opacity-40" />}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        <svg style={{ position: 'absolute', overflow: 'visible', width: '1px', height: '1px', left: 0, top: 0 }}>
          {[...activeElements, ...(draftShape ? [draftShape] : [])].map((el) => {
            if (el.kind === "stroke" && el.points?.length) {
              const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
              return <path key={el.id} d={d} stroke={el.color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
            }
            if (el.kind === "line") {
              return <line key={el.id} x1={el.x} y1={el.y} x2={(el.x || 0) + (el.w || 0)} y2={(el.y || 0) + (el.h || 0)} stroke={el.color} strokeWidth={3} />;
            }
            if (el.kind === "rect") {
              return <rect key={el.id} x={Math.min(el.x || 0, (el.x || 0) + (el.w || 0))} y={Math.min(el.y || 0, (el.y || 0) + (el.h || 0))} width={Math.abs(el.w || 0)} height={Math.abs(el.h || 0)} fill="transparent" stroke={el.color} strokeWidth={3} />;
            }
            if (el.kind === "circle") {
              const rx = Math.abs(el.w || 0) / 2;
              const ry = Math.abs(el.h || 0) / 2;
              return <ellipse key={el.id} cx={(el.x || 0) + (el.w || 0) / 2} cy={(el.y || 0) + (el.h || 0) / 2} rx={rx} ry={ry} fill="transparent" stroke={el.color} strokeWidth={3} />;
            }
            return null;
          })}
        </svg>
        {[...activeElements, ...(draftShape ? [draftShape] : [])]
          .filter((e) => e.kind === "text")
          .map((el) => (
            <div key={el.id} className="absolute text-sm font-semibold" style={{ left: el.x, top: el.y, color: el.color }}>
              {el.text}
            </div>
          ))}
      </div>

      <AnimatePresence>
        {showTextInput && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-30 bg-black/70 border border-white/15 rounded-lg p-2" style={{ left: showTextInput.x * scale + pan.x, top: showTextInput.y * scale + pan.y }}>
            <input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitText();
                if (e.key === "Escape") setShowTextInput(null);
              }}
              autoFocus
              placeholder="Type text..."
              className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
            />
            <button onClick={submitText} className="ml-2 text-xs px-2 py-1 rounded bg-primary text-black">Add</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
