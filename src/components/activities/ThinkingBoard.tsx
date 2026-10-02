"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import {
  Pencil,
  Type,
  Square,
  Circle,
  Triangle,
  Eraser,
  Undo2,
  Redo2,
  Move,
  MousePointer2,
  Minus,
  Settings2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Map as MapIcon,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Tool = "draw" | "text" | "rect" | "circle" | "line" | "eraser" | "lineEraser" | "pan" | "move" | "triangle";

interface Point {
  x: number;
  y: number;
}

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

interface UserPresence {
  userName: string;
  viewport: { x: number; y: number; zoom: number; w: number; h: number };
  lastUpdate: number;
}

const palette = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ffffff", "#000000"];
const DEFAULT_PERMS: UserPermissions = { draw: true, erase: true, type: true, move: true };

const FALLBACK_BOARD: BoardConfig = {
  mode: "live",
  defaultPermissions: DEFAULT_PERMS,
  userPermissions: {},
  elements: [],
};

const USER_COLORS = ["#22d3ee", "#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#fb923c", "#ef4444", "#818cf8"];
function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Helper: distance between line segment (p, w) and point p0
function distToSegment(p0: Point, v: Point, w: Point) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p0.x - v.x, p0.y - v.y);
  let t = ((p0.x - v.x) * (w.x - v.x) + (p0.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p0.x - (v.x + t * (w.x - v.x)), p0.y - (v.y + t * (w.y - v.y)));
}

// ==================== BIRD'S-EYE / MINIMAP COMPONENT ====================
const ThinkingBoardMinimap = memo(function ThinkingBoardMinimap({
  elements,
  viewport,
  containerSize,
  userPresences,
  currentUser,
  onNavigate,
  collapsed,
  onToggle,
}: {
  elements: BoardElement[];
  viewport: { pan: { x: number; y: number }; scale: number };
  containerSize: { w: number; h: number };
  userPresences: Map<string, UserPresence>;
  currentUser: string;
  onNavigate: (worldX: number, worldY: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const MINIMAP_W = 190;
  const MINIMAP_H = 130;
  const PADDING = 60;

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed bottom-24 sm:bottom-6 left-4 z-30 bg-[#0A0D14]/85 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-2xl active:scale-95 cursor-pointer"
        title="Show Minimap (Bird's-Eye View)"
      >
        <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </button>
    );
  }

  // Calculate world bounds from elements
  let minX = -600, minY = -450, maxX = 600, maxY = 450;
  for (const el of elements) {
    if (el.points) {
      for (const p of el.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (el.x !== undefined && el.y !== undefined) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      const w = el.w || 60;
      const h = el.h || 40;
      if (el.x + w > maxX) maxX = el.x + w;
      if (el.y + h > maxY) maxY = el.y + h;
    }
  }

  // Include current viewport area
  const vpWorldX = -viewport.pan.x / viewport.scale;
  const vpWorldY = -viewport.pan.y / viewport.scale;
  const vpWorldW = containerSize.w / viewport.scale;
  const vpWorldH = containerSize.h / viewport.scale;
  if (vpWorldX < minX) minX = vpWorldX;
  if (vpWorldY < minY) minY = vpWorldY;
  if (vpWorldX + vpWorldW > maxX) maxX = vpWorldX + vpWorldW;
  if (vpWorldY + vpWorldH > maxY) maxY = vpWorldY + vpWorldH;

  // Include other user viewports
  userPresences.forEach((p) => {
    const v = p.viewport;
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x + (v.w || 1000) > maxX) maxX = v.x + (v.w || 1000);
    if (v.y + (v.h || 700) > maxY) maxY = v.y + (v.h || 700);
  });

  minX -= PADDING;
  minY -= PADDING;
  maxX += PADDING;
  maxY += PADDING;
  const worldW = maxX - minX || 1;
  const worldH = maxY - minY || 1;
  const scaleX = MINIMAP_W / worldW;
  const scaleY = MINIMAP_H / worldH;
  const s = Math.min(scaleX, scaleY);

  const toMinimap = (wx: number, wy: number) => ({
    x: (wx - minX) * s,
    y: (wy - minY) * s,
  });

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = mx / s + minX;
    const worldY = my / s + minY;
    onNavigate(worldX, worldY);
  };

  const vpMini = toMinimap(vpWorldX, vpWorldY);
  const vpMiniW = vpWorldW * s;
  const vpMiniH = vpWorldH * s;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-24 sm:bottom-6 left-4 z-30 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#0A0D14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-primary" /> Bird's-Eye
          </span>
          <button
            onClick={onToggle}
            className="text-white/40 hover:text-white p-0.5 rounded transition-colors"
            title="Collapse Minimap"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>

        <div
          onClick={handleClick}
          className="relative cursor-crosshair bg-black/60"
          style={{ width: MINIMAP_W, height: MINIMAP_H }}
        >
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)",
              backgroundSize: "12px 12px",
            }}
          />

          {/* SVG representation of elements */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {elements.map((el) => {
              if (el.kind === "stroke" && el.points && el.points.length > 1) {
                const pathD = el.points.reduce((acc, pt, i) => {
                  const m = toMinimap(pt.x, pt.y);
                  return i === 0 ? `M ${m.x} ${m.y}` : `${acc} L ${m.x} ${m.y}`;
                }, "");
                return (
                  <path
                    key={el.id}
                    d={pathD}
                    fill="none"
                    stroke={el.color || "#ffffff"}
                    strokeWidth={Math.max(1, (el.thickness || 2) * s)}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                );
              }
              if (el.x !== undefined && el.y !== undefined) {
                const pt = toMinimap(el.x, el.y);
                const w = Math.max(3, (el.w || 40) * s);
                const h = Math.max(3, (el.h || 30) * s);
                return (
                  <rect
                    key={el.id}
                    x={pt.x}
                    y={pt.y}
                    width={w}
                    height={h}
                    fill={el.kind === "text" ? "#38bdf8" : el.color || "#ffffff"}
                    opacity={0.7}
                    rx={1}
                  />
                );
              }
              return null;
            })}
          </svg>

          {/* Remote users' viewports & markers */}
          {Array.from(userPresences.values()).map((p) => {
            const v = p.viewport;
            const pm = toMinimap(v.x, v.y);
            const pw = (v.w || 1000) * s;
            const ph = (v.h || 700) * s;
            const color = getUserColor(p.userName);
            return (
              <React.Fragment key={p.userName}>
                <div
                  className="absolute pointer-events-none rounded border border-dashed transition-all duration-300"
                  style={{
                    left: pm.x,
                    top: pm.y,
                    width: Math.max(6, pw),
                    height: Math.max(6, ph),
                    borderColor: `${color}88`,
                    backgroundColor: `${color}15`,
                  }}
                />
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1"
                  style={{
                    left: pm.x + Math.max(6, pw) / 2,
                    top: pm.y + Math.max(6, ph) / 2,
                  }}
                >
                  <div className="w-2 h-2 rounded-full shadow-sm ring-1 ring-black" style={{ backgroundColor: color }} />
                  <span className="text-[7px] font-bold text-white bg-black/80 px-1 py-0.2 rounded truncate max-w-[45px]">
                    {p.userName}
                  </span>
                </div>
              </React.Fragment>
            );
          })}

          {/* Current user viewport rectangle */}
          <div
            className="absolute border border-primary/90 bg-primary/10 rounded pointer-events-none shadow-sm transition-all duration-75"
            style={{
              left: Math.max(0, Math.min(MINIMAP_W - 8, vpMini.x)),
              top: Math.max(0, Math.min(MINIMAP_H - 8, vpMini.y)),
              width: Math.max(8, Math.min(MINIMAP_W, vpMiniW)),
              height: Math.max(8, Math.min(MINIMAP_H, vpMiniH)),
            }}
          >
            <div className="absolute -top-3.5 left-0 text-[7px] font-black text-primary bg-black/80 px-1 rounded uppercase tracking-wider">
              You
            </div>
          </div>
        </div>

        {/* Presence footer */}
        <div className="px-2.5 py-1 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[8px] text-white/40">
          <span className="flex items-center gap-1">
            <Users className="w-2.5 h-2.5" /> {userPresences.size + 1} online
          </span>
          <span>Click to jump</span>
        </div>
      </div>
    </div>
  );
});

// ==================== MAIN THINKING BOARD ====================
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
  const board = useMemo(
    () => (session?.activityData?.board || FALLBACK_BOARD) as BoardConfig,
    [session?.activityData?.board]
  );

  const [localElements, setLocalElements] = useState<BoardElement[]>(board.elements || []);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(palette[0]);
  const [thickness, setThickness] = useState(3);
  const [freq, setFreq] = useState<"low" | "medium" | "high">("medium");
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

  // Modal & Minimap state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 1000, h: 700 });
  const [userPresences, setUserPresences] = useState<Map<string, UserPresence>>(new Map());

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
  const presenceThrottleRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const participants = (session?.participants || []).filter((p: any) => p.isConnected);
  const spectators = new Set<string>(session?.spectators || []);

  const myPerms = useMemo(() => {
    if (isHost) return { draw: true, erase: true, type: true, move: true };
    if (spectators.has(userName)) return { draw: false, erase: false, type: false, move: false };
    return board.userPermissions?.[userName] || board.defaultPermissions || DEFAULT_PERMS;
  }, [isHost, spectators, userName, board.userPermissions, board.defaultPermissions]);

  const hasServerBoard = !!session?.activityData?.board;

  // Synchronized initial viewport: center at existing content center or (0,0)
  useEffect(() => {
    if (!initializedRef.current && containerRef.current) {
      initializedRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const cw = rect.width || window.innerWidth;
      const ch = rect.height || window.innerHeight;
      setContainerSize({ w: cw, h: ch });

      if (board.elements && board.elements.length > 0) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const el of board.elements) {
          if (el.points) {
            for (const p of el.points) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            }
          }
          if (el.x !== undefined && el.y !== undefined) {
            if (el.x < minX) minX = el.x;
            if (el.y < minY) minY = el.y;
            const w = el.w || 60;
            const h = el.h || 40;
            if (el.x + w > maxX) maxX = el.x + w;
            if (el.y + h > maxY) maxY = el.y + h;
          }
        }
        if (isFinite(minX) && isFinite(maxX)) {
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          setPan({ x: cw / 2 - cx, y: ch / 2 - cy });
          return;
        }
      }
      setPan({ x: cw / 2, y: ch / 2 });
    }
  }, [board.elements]);

  // Sync elements from server
  useEffect(() => {
    if (board.elements && board.elements.length !== localElements.length) {
      setLocalElements(board.elements);
    } else if (board.elements && JSON.stringify(board.elements) !== JSON.stringify(localElements)) {
      setLocalElements(board.elements);
    }
  }, [board.elements]);

  // Initial config setup for host
  useEffect(() => {
    if (!isHost || !session || hasServerBoard) return;
    socket.emit("board:set_config", {
      sessionId,
      mode: "live",
      defaultPermissions: DEFAULT_PERMS,
      userPermissions: {},
    });
  }, [isHost, session, hasServerBoard, socket, sessionId]);

  // Escape key listener for closing permissions modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPermissionsModal) {
        setShowPermissionsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPermissionsModal]);

  // Listen for multi-user presence
  useEffect(() => {
    if (!socket) return;
    const handlePresence = ({ userName: name, viewport }: { userName: string; viewport: any }) => {
      if (name === userName) return;
      setUserPresences((prev) => {
        const next = new Map(prev);
        next.set(name, { userName: name, viewport, lastUpdate: Date.now() });
        return next;
      });
    };
    socket.on("presence:viewport", handlePresence);
    return () => {
      socket.off("presence:viewport", handlePresence);
    };
  }, [socket, userName]);

  // Broadcast viewport on pan/zoom (throttled)
  const broadcastViewport = useCallback(() => {
    const now = Date.now();
    if (now - presenceThrottleRef.current < 500) return;
    presenceThrottleRef.current = now;
    if (!socket || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    socket.emit("presence:viewport", {
      sessionId,
      userName,
      viewport: {
        x: -pan.x / scale,
        y: -pan.y / scale,
        zoom: scale,
        w: rect.width / scale,
        h: rect.height / scale,
      },
    });
  }, [socket, sessionId, userName, pan, scale]);

  useEffect(() => {
    broadcastViewport();
  }, [pan, scale, broadcastViewport]);

  // Clean up stale presences
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUserPresences((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const [name, p] of next) {
          if (now - p.lastUpdate > 30000) {
            next.delete(name);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const pushHistory = (snapshot: BoardElement[]) => {
    setHistory((h) => [...h.slice(-29), snapshot]);
    setRedoStack([]);
  };

  const syncLive = useCallback(
    (next: BoardElement[]) => {
      setLocalElements(next);
      socket.emit("board:sync_state", { sessionId, elements: next });
    },
    [socket, sessionId]
  );

  const drawElementsToCanvas = (
    ctx: CanvasRenderingContext2D,
    elements: BoardElement[],
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const el of elements) {
      if (el.kind === "text") continue; // Text rendered via DOM

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
      } else if (
        el.kind === "line" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.stroke();
      } else if (
        el.kind === "rect" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        ctx.rect(Math.min(el.x, el.x + el.w), Math.min(el.y, el.y + el.h), Math.abs(el.w), Math.abs(el.h));
        ctx.stroke();
      } else if (
        el.kind === "circle" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        const rx = Math.abs(el.w) / 2;
        const ry = Math.abs(el.h) / 2;
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (
        el.kind === "triangle" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        ctx.moveTo(el.x + el.w / 2, el.y);
        ctx.lineTo(el.x, el.y + el.h);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Efficient On-Demand Rendering: single rAF callback when elements, pan, or scale change
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cvs.width = w;
        cvs.height = h;
        if (draftCanvasRef.current) {
          draftCanvasRef.current.width = w;
          draftCanvasRef.current.height = h;
        }
        setContainerSize({ w, h });
        drawElementsToCanvas(ctx, localElements, w, h);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const rafId = requestAnimationFrame(() => {
      drawElementsToCanvas(ctx, localElements, cvs.width, cvs.height);
    });

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [localElements, pan, scale]);

  // Draft Canvas Rendering: only redraws when draftShape is non-null
  useEffect(() => {
    const dCvs = draftCanvasRef.current;
    if (!dCvs) return;
    const dCtx = dCvs.getContext("2d");
    if (!dCtx) return;

    if (!draftShape) {
      dCtx.clearRect(0, 0, dCvs.width, dCvs.height);
      return;
    }

    const rafId = requestAnimationFrame(() => {
      dCtx.clearRect(0, 0, dCvs.width, dCvs.height);
      drawElementsToCanvas(dCtx, [draftShape], dCvs.width, dCvs.height);
    });

    return () => cancelAnimationFrame(rafId);
  }, [draftShape, pan, scale]);

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale };
    },
    [pan, scale]
  );

  const getPointerDist = (e1: PointerEvent, e2: PointerEvent) =>
    Math.hypot(e1.clientX - e2.clientX, e1.clientY - e2.clientY);
  const getPointerCenter = (e1: PointerEvent, e2: PointerEvent) => ({
    x: (e1.clientX + e2.clientX) / 2,
    y: (e1.clientY + e2.clientY) / 2,
  });

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
        color: "transparent",
        thickness: 20,
        author: userName,
        createdAt: Date.now(),
      });
    } else if (tool === "lineEraser" && myPerms.erase) {
      const hitRadius = 15 / scale;
      for (let i = localElements.length - 1; i >= 0; i--) {
        const el = localElements[i];
        let hit = false;
        if (el.kind === "stroke" && el.points) {
          for (let j = 0; j < el.points.length - 1; j++) {
            if (distToSegment(p, el.points[j], el.points[j + 1]) < hitRadius) {
              hit = true;
              break;
            }
          }
        } else if (
          el.kind === "line" &&
          el.x !== undefined &&
          el.y !== undefined &&
          el.w !== undefined &&
          el.h !== undefined
        ) {
          if (distToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }) < hitRadius) hit = true;
        } else if (
          el.kind === "rect" &&
          el.x !== undefined &&
          el.y !== undefined &&
          el.w !== undefined &&
          el.h !== undefined
        ) {
          if (
            p.x >= Math.min(el.x, el.x + el.w) &&
            p.x <= Math.max(el.x, el.x + el.w) &&
            p.y >= Math.min(el.y, el.y + el.h) &&
            p.y <= Math.max(el.y, el.y + el.h)
          )
            hit = true;
        } else if (
          el.kind === "circle" &&
          el.x !== undefined &&
          el.y !== undefined &&
          el.w !== undefined &&
          el.h !== undefined
        ) {
          const cx = el.x + el.w / 2;
          const cy = el.y + el.h / 2;
          if (Math.hypot(p.x - cx, p.y - cy) <= Math.max(Math.abs(el.w), Math.abs(el.h)) / 2) hit = true;
        } else if (el.kind === "text" && el.x !== undefined && el.y !== undefined) {
          if (Math.hypot(p.x - el.x, p.y - el.y) < 30 / scale) hit = true;
        }

        if (hit) {
          pushHistory(localElements);
          syncLive(localElements.filter((e) => e.id !== el.id));
          break;
        }
      }
    } else if (tool === "text" && myPerms.type) {
      setShowTextInput(p);
      setTextDraft("");
      setEditingTextId(null);
    } else if (tool === "move" && myPerms.move) {
      const hitRadius = 25 / scale;
      for (let i = localElements.length - 1; i >= 0; i--) {
        const el = localElements[i];
        let hit = false;
        if (el.kind === "text" && el.x !== undefined && el.y !== undefined) {
          if (Math.hypot(p.x - el.x, p.y - el.y) < 40 / scale) hit = true;
        } else if (
          (el.kind === "rect" || el.kind === "triangle") &&
          el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined
        ) {
          const minX = Math.min(el.x, el.x + el.w);
          const maxX = Math.max(el.x, el.x + el.w);
          const minY = Math.min(el.y, el.y + el.h);
          const maxY = Math.max(el.y, el.y + el.h);
          if (p.x >= minX - 10 && p.x <= maxX + 10 && p.y >= minY - 10 && p.y <= maxY + 10) {
            hit = true;
          }
        } else if (
          el.kind === "circle" &&
          el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined
        ) {
          const cx = el.x + el.w / 2;
          const cy = el.y + el.h / 2;
          const radius = Math.max(Math.abs(el.w), Math.abs(el.h)) / 2 + 10;
          if (Math.hypot(p.x - cx, p.y - cy) <= radius) hit = true;
        } else if (
          el.kind === "line" &&
          el.x !== undefined && el.y !== undefined && el.w !== undefined && el.h !== undefined
        ) {
          if (distToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }) < hitRadius) {
            hit = true;
          }
        } else if (el.kind === "stroke" && el.points) {
          for (let j = 0; j < el.points.length - 1; j++) {
            if (distToSegment(p, el.points[j], el.points[j + 1]) < hitRadius) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          setMovingElementId(el.id);
          startPointRef.current = p;
          setIsDrawing(true);
          pushHistory(localElements);
          break;
        }
      }
    } else if ((tool === "rect" || tool === "circle" || tool === "line" || tool === "triangle") && myPerms.draw) {
      startPointRef.current = p;
      setIsDrawing(true);
      setDraftShape({
        id: Math.random().toString(36).slice(2, 10),
        kind: tool,
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color,
        thickness,
        author: userName,
        createdAt: Date.now(),
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
        y: center.y - (center.y - pinchRef.current.pan.y) * ratio,
      });
      return;
    }

    if (isPanning) {
      setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      return;
    }

    if (!isDrawing || !startPointRef.current) return;

    const now = Date.now();
    const currentFreq = tool === "eraser" ? eraserFreq : freq;
    const msThrottle = currentFreq === "low" ? 50 : currentFreq === "medium" ? 25 : 5;
    if (now - lastEventTimeRef.current < msThrottle && (tool === "draw" || tool === "eraser")) return;
    lastEventTimeRef.current = now;

    const p = toCanvasPoint(e.clientX, e.clientY);

    if (tool === "move" && movingElementId) {
      const dx = p.x - startPointRef.current!.x;
      const dy = p.y - startPointRef.current!.y;
      setLocalElements((prev) =>
        prev.map((el) => {
          if (el.id === movingElementId) {
            if (el.points && el.points.length > 0) {
              return {
                ...el,
                points: el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
              };
            }
            return {
              ...el,
              x: (el.x || 0) + dx,
              y: (el.y || 0) + dy,
            };
          }
          return el;
        })
      );
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
      setShowTextInput(null);
      setEditingTextId(null);
      return;
    }

    if (editingTextId) {
      pushHistory(localElements);
      syncLive(
        localElements.map((el) =>
          el.id === editingTextId ? { ...el, text: textDraft.trim(), fontFamily, fontSize, color } : el
        )
      );
    } else {
      const textEl: BoardElement = {
        id: Math.random().toString(36).slice(2, 10),
        kind: "text",
        x: showTextInput.x,
        y: showTextInput.y,
        text: textDraft.trim(),
        fontFamily,
        fontSize,
        color,
        author: userName,
        createdAt: Date.now(),
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
      userPermissions: { ...board.userPermissions, [name]: next },
    });
  };

  const navigateToWorld = (worldX: number, worldY: number) => {
    const cw = containerSize.w || window.innerWidth;
    const ch = containerSize.h || window.innerHeight;
    setPan({
      x: cw / 2 - worldX * scale,
      y: ch / 2 - worldY * scale,
    });
  };

  return (
    <div
      className="absolute inset-0 bg-[#0B0E14] overflow-hidden touch-none select-none"
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
        if (activePointersRef.current.size === 0) {
          setIsPanning(false);
          setIsDrawing(false);
          pinchRef.current = null;
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          setScale((s) => Math.max(0.1, Math.min(5, s - e.deltaY * 0.01)));
        } else {
          setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: `${40 * scale}px ${40 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Main & Draft Canvases */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <canvas ref={draftCanvasRef} className="absolute inset-0 pointer-events-none" />

      {/* DOM layer for Text Nodes */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        {localElements
          .filter((e) => e.kind === "text")
          .map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => {
                if (myPerms.type && e.detail === 2) {
                  setShowTextInput({ x: el.x || 0, y: el.y || 0 });
                  setTextDraft(el.text || "");
                  setEditingTextId(el.id);
                  setFontFamily(el.fontFamily || "sans");
                  setFontSize(el.fontSize || 24);
                  setColor(el.color);
                }
              }}
              className={`absolute pointer-events-auto break-words whitespace-pre-wrap max-w-sm select-text ${
                myPerms.type ? "cursor-text hover:outline outline-1 outline-white/20" : ""
              }`}
              style={{
                left: el.x,
                top: el.y,
                color: el.color,
                fontFamily: el.fontFamily === "mono" ? "monospace" : el.fontFamily === "serif" ? "serif" : "sans-serif",
                fontSize: `${el.fontSize || 24}px`,
                lineHeight: 1.2,
              }}
            >
              {el.text}
            </div>
          ))}
      </div>

      {/* Host Permissions Button in Top Right */}
      {isHost && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 z-[150] flex flex-col items-end gap-2"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPermissionsModal(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="bg-[#0A0D14]/90 backdrop-blur-xl border border-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white/90 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 shadow-2xl cursor-pointer active:scale-95"
            title="Board Permissions & Host Controls"
          >
            <Settings2 className="w-4 h-4 text-primary" />
            <span>Permissions</span>
          </button>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div
          className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowPermissionsModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0D1117] border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Board Permissions</h3>
                  <p className="text-[11px] text-white/50">Manage editing privileges & tools for participants</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {/* Default Permissions for New Participants */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Default (New Users)</span>
                  <span className="text-[10px] text-white/40">Auto-applied</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-white/80">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/10 text-primary"
                      checked={board.defaultPermissions?.draw ?? true}
                      onChange={() => {
                        socket.emit("board:set_config", {
                          sessionId,
                          defaultPermissions: {
                            ...(board.defaultPermissions || DEFAULT_PERMS),
                            draw: !(board.defaultPermissions?.draw ?? true),
                          },
                        });
                      }}
                    />
                    Draw
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/10 text-primary"
                      checked={board.defaultPermissions?.erase ?? true}
                      onChange={() => {
                        socket.emit("board:set_config", {
                          sessionId,
                          defaultPermissions: {
                            ...(board.defaultPermissions || DEFAULT_PERMS),
                            erase: !(board.defaultPermissions?.erase ?? true),
                          },
                        });
                      }}
                    />
                    Erase
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/10 text-primary"
                      checked={board.defaultPermissions?.type ?? true}
                      onChange={() => {
                        socket.emit("board:set_config", {
                          sessionId,
                          defaultPermissions: {
                            ...(board.defaultPermissions || DEFAULT_PERMS),
                            type: !(board.defaultPermissions?.type ?? true),
                          },
                        });
                      }}
                    />
                    Type
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/10 text-primary"
                      checked={board.defaultPermissions?.move ?? true}
                      onChange={() => {
                        socket.emit("board:set_config", {
                          sessionId,
                          defaultPermissions: {
                            ...(board.defaultPermissions || DEFAULT_PERMS),
                            move: !(board.defaultPermissions?.move ?? true),
                          },
                        });
                      }}
                    />
                    Move
                  </label>
                </div>
              </div>

              {/* Individual Participants List */}
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Connected Participants</p>
                {participants.filter((p: any) => p.role !== "host" && !spectators.has(p.name)).length === 0 ? (
                  <p className="text-xs text-white/40 italic py-2">No other participants currently connected.</p>
                ) : (
                  <div className="space-y-2">
                    {participants
                      .filter((p: any) => p.role !== "host" && !spectators.has(p.name))
                      .map((p: any) => {
                        const perms = board.userPermissions?.[p.name] || board.defaultPermissions || DEFAULT_PERMS;
                        return (
                          <div key={p.name} className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-white">{p.name}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs text-white/70">
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={perms.draw ?? true}
                                  onChange={() => toggleUserPerm(p.name, "draw")}
                                />
                                Draw
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={perms.erase ?? true}
                                  onChange={() => toggleUserPerm(p.name, "erase")}
                                />
                                Erase
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={perms.type ?? true}
                                  onChange={() => toggleUserPerm(p.name, "type")}
                                />
                                Type
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={perms.move ?? true}
                                  onChange={() => toggleUserPerm(p.name, "move")}
                                />
                                Move
                              </label>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Clear Canvas Action */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/50">Host Actions</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear the entire thinking board for all participants?")) {
                      pushHistory(localElements);
                      syncLive([]);
                    }
                  }}
                  className="text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Elements
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bird's-Eye View / Minimap */}
      <ThinkingBoardMinimap
        elements={localElements}
        viewport={{ pan, scale }}
        containerSize={containerSize}
        userPresences={userPresences}
        currentUser={userName}
        onNavigate={navigateToWorld}
        collapsed={minimapCollapsed}
        onToggle={() => setMinimapCollapsed(!minimapCollapsed)}
      />

      {/* Floating Toolbar Layer - Intelligently Responsive */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#0A0D14]/90 backdrop-blur-2xl p-2 sm:px-4 sm:py-2.5 rounded-[1.5rem] sm:rounded-full border border-white/10 flex flex-col sm:flex-row items-center justify-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-[calc(100vw-2rem)] sm:max-w-fit"
      >
        {/* Row 1: Primary Tools */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          {/* Navigation & Move */}
          <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
            <button
              onClick={() => setTool("pan")}
              className={`p-1.5 sm:p-2.5 rounded-lg transition-colors cursor-pointer ${
                tool === "pan" ? "bg-primary text-black font-bold" : "text-white/60 hover:text-white"
              }`}
              title="Pan (Space / Drag)"
            >
              <Move className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              disabled={!myPerms.move}
              onClick={() => setTool("move")}
              className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 cursor-pointer ${
                tool === "move" ? "bg-primary text-black font-bold" : "text-white/60 hover:text-white"
              }`}
              title="Move Text"
            >
              <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="w-px h-6 sm:h-8 bg-white/10 hidden xs:block" />

          {/* Creation Tools */}
          <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
            <Popover>
              <PopoverTrigger
                disabled={!myPerms.draw}
                onClick={() => setTool("draw")}
                className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer ${
                  tool === "draw" ? "bg-primary text-black font-bold" : "text-white/60 hover:text-white"
                }`}
                title="Pencil (Freehand Drawing)"
              >
                <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
              </PopoverTrigger>
              <PopoverContent side="top" className="w-64 bg-[#0D1117] border-white/10 backdrop-blur-xl">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-white/50 mb-2">Stroke Thickness</p>
                    <Slider
                      value={[thickness]}
                      onValueChange={(v: any) => setThickness(Array.isArray(v) ? v[0] : v)}
                      max={20}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/50 mb-2">Smoothing Frequency</p>
                    <div className="flex gap-2">
                      {["low", "medium", "high"].map((f) => (
                        <Button
                          key={f}
                          size="sm"
                          variant={freq === f ? "default" : "secondary"}
                          onClick={() => setFreq(f as any)}
                          className="flex-1 capitalize text-xs"
                        >
                          {f}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger
                disabled={!myPerms.type}
                onClick={() => setTool("text")}
                className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer ${
                  tool === "text" ? "bg-primary text-black font-bold" : "text-white/60 hover:text-white"
                }`}
                title="Text Node"
              >
                <Type className="w-4 h-4 sm:w-5 sm:h-5" />
              </PopoverTrigger>
              <PopoverContent side="top" className="w-64 bg-[#0D1117] border-white/10 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Font Family</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={fontFamily === "sans" ? "default" : "secondary"}
                      onClick={() => setFontFamily("sans")}
                      className="flex-1 text-xs font-sans"
                    >
                      Sans
                    </Button>
                    <Button
                      size="sm"
                      variant={fontFamily === "serif" ? "default" : "secondary"}
                      onClick={() => setFontFamily("serif")}
                      className="flex-1 text-xs font-serif"
                    >
                      Serif
                    </Button>
                    <Button
                      size="sm"
                      variant={fontFamily === "mono" ? "default" : "secondary"}
                      onClick={() => setFontFamily("mono")}
                      className="flex-1 text-xs font-mono"
                    >
                      Mono
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Size</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={fontSize === 16 ? "default" : "secondary"}
                      onClick={() => setFontSize(16)}
                      className="flex-1 text-xs"
                    >
                      Sm
                    </Button>
                    <Button
                      size="sm"
                      variant={fontSize === 24 ? "default" : "secondary"}
                      onClick={() => setFontSize(24)}
                      className="flex-1 text-xs"
                    >
                      Md
                    </Button>
                    <Button
                      size="sm"
                      variant={fontSize === 36 ? "default" : "secondary"}
                      onClick={() => setFontSize(36)}
                      className="flex-1 text-xs"
                    >
                      Lg
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger
                disabled={!myPerms.draw}
                className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer ${
                  tool === "rect" || tool === "circle" || tool === "line" || tool === "triangle"
                    ? "bg-primary text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
                title="Geometric Shapes"
              >
                {tool === "rect" ? (
                  <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : tool === "circle" ? (
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : tool === "triangle" ? (
                  <Triangle className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : tool === "line" ? (
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5 transform -rotate-45" />
                ) : (
                  <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </PopoverTrigger>
              <PopoverContent side="top" className="w-44 bg-[#0D1117] border-white/10 backdrop-blur-xl p-1 shadow-2xl rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    onClick={() => setTool("rect")}
                    className={`justify-start gap-3 h-10 px-3 rounded-lg ${
                      tool === "rect" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Square className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Rectangle</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTool("circle")}
                    className={`justify-start gap-3 h-10 px-3 rounded-lg ${
                      tool === "circle" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Circle className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Circle</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTool("triangle")}
                    className={`justify-start gap-3 h-10 px-3 rounded-lg ${
                      tool === "triangle" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Triangle className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Triangle</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTool("line")}
                    className={`justify-start gap-3 h-10 px-3 rounded-lg ${
                      tool === "line" ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Minus className="w-4 h-4 transform -rotate-45" /> <span className="text-xs font-bold uppercase tracking-wider">Line</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-px h-6 sm:h-8 bg-white/10 hidden xs:block" />

          {/* Eraser Tools */}
          <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
            <Popover>
              <PopoverTrigger
                disabled={!myPerms.erase}
                onClick={() => setTool("eraser")}
                className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 cursor-pointer ${
                  tool === "eraser" ? "bg-red-400 text-black font-bold" : "text-white/60 hover:text-white"
                }`}
                title="Eraser Brush"
              >
                <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
              </PopoverTrigger>
              <PopoverContent side="top" className="w-64 bg-[#0D1117] border-white/10 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-xs font-bold text-white/50 mb-2">Eraser Frequency</p>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={eraserFreq === f ? "default" : "secondary"}
                        onClick={() => setEraserFreq(f as any)}
                        className="flex-1 capitalize text-xs"
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <button
              disabled={!myPerms.erase}
              onClick={() => setTool("lineEraser")}
              className={`p-1.5 sm:p-2.5 rounded-lg transition-colors disabled:opacity-30 cursor-pointer ${
                tool === "lineEraser" ? "bg-red-500 text-black font-bold" : "text-white/60 hover:text-white"
              }`}
              title="Delete Whole Element"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="w-px h-6 sm:h-8 bg-white/10 hidden xs:block" />

          {/* Undo / Redo */}
          <div className="flex bg-white/5 rounded-xl p-0.5 sm:p-1">
            <button
              disabled={!history.length}
              onClick={undo}
              className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              disabled={!redoStack.length}
              onClick={redo}
              className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Tools (Colors & Zoom) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Palette */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  color === c ? "ring-2 ring-white scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>

          <div className="w-px h-6 sm:h-8 bg-white/10 hidden sm:block" />

          {/* Zoom controls */}
          <div className="bg-white/5 rounded-xl p-0.5 sm:p-1 flex">
            <button
              onClick={() => setScale((s) => Math.min(5, s * 1.2))}
              className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(0.1, s / 1.2))}
              className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => {
                const cw = containerSize.w || window.innerWidth;
                const ch = containerSize.h || window.innerHeight;
                setScale(1);
                setPan({ x: cw / 2, y: ch / 2 });
              }}
              className="p-1.5 sm:p-2.5 rounded-lg text-white/60 hover:text-white cursor-pointer"
              title="Reset View to Center"
            >
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Text Input Popup for Adding / Editing Text */}
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
                if (e.key === "Escape") {
                  setShowTextInput(null);
                  setEditingTextId(null);
                }
              }}
              autoFocus
              placeholder="Type text... (Ctrl+Enter to save)"
              className="bg-white/5 border border-white/10 rounded-lg p-2 text-white min-w-[200px] min-h-[80px] resize-none focus:outline-none focus:ring-2 ring-primary/50 text-sm"
              style={{
                fontFamily: fontFamily === "mono" ? "monospace" : fontFamily === "serif" ? "serif" : "sans-serif",
                fontSize: "14px",
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowTextInput(null);
                  setEditingTextId(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submitText}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
