"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/providers/SocketProvider";
import { Network, BrainCircuit, Maximize, Trash2, Link2, X, Palette, ZoomIn, ZoomOut, Map as MapIcon, Eye, EyeOff, Users, Plus } from "lucide-react";

interface ThoughtNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  author: string;
}

interface ThoughtConnection {
  id: string;
  from: string;
  to: string;
}

interface UserPresence {
  userName: string;
  viewport: { x: number; y: number; zoom: number; w: number; h: number };
  lastUpdate: number;
}

const NODE_COLORS = [
  { bg: "#fbbf24", text: "#78350f", label: "Amber" },
  { bg: "#34d399", text: "#064e3b", label: "Emerald" },
  { bg: "#60a5fa", text: "#1e3a5f", label: "Blue" },
  { bg: "#f472b6", text: "#831843", label: "Pink" },
  { bg: "#a78bfa", text: "#3b0764", label: "Violet" },
  { bg: "#fb923c", text: "#7c2d12", label: "Orange" },
];

const USER_COLORS = ["#22d3ee", "#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#fb923c", "#ef4444", "#818cf8"];

function getNodeColor(colorKey: string) {
  return NODE_COLORS.find((c) => c.bg === colorKey) || NODE_COLORS[0];
}

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ==================== MINIMAP ====================
const Minimap = memo(function Minimap({
  nodes,
  connections,
  viewport,
  containerSize,
  userPresences,
  currentUser,
  onNavigate,
  collapsed,
  onToggle,
}: {
  nodes: ThoughtNode[];
  connections: ThoughtConnection[];
  viewport: { x: number; y: number; zoom: number };
  containerSize: { w: number; h: number };
  userPresences: Map<string, UserPresence>;
  currentUser: string;
  onNavigate: (worldX: number, worldY: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const MINIMAP_W = 200;
  const MINIMAP_H = 140;
  const PADDING = 50;

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 sm:bottom-6 left-4 z-30 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-xl"
        title="Show Minimap"
      >
        <MapIcon className="w-5 h-5" />
      </button>
    );
  }

  // Calculate world bounds from all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + 200 > maxX) maxX = n.x + 200;
    if (n.y + 70 > maxY) maxY = n.y + 70;
  }

  // Include viewport area in bounds
  const vpWorldX = -viewport.x / viewport.zoom;
  const vpWorldY = -viewport.y / viewport.zoom;
  const vpWorldW = containerSize.w / viewport.zoom;
  const vpWorldH = containerSize.h / viewport.zoom;
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

  if (!isFinite(minX)) { minX = -500; minY = -500; maxX = 500; maxY = 500; }

  minX -= PADDING; minY -= PADDING; maxX += PADDING; maxY += PADDING;
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
    <div className="fixed bottom-20 sm:bottom-6 left-4 z-30 select-none">
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Bird's-Eye
          </span>
          <button onClick={onToggle} className="text-white/40 hover:text-white p-0.5">
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
        <div
          style={{ width: MINIMAP_W, height: MINIMAP_H, position: "relative", cursor: "crosshair" }}
          onClick={handleClick}
        >
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 0.5px, transparent 0)",
              backgroundSize: `${Math.max(4, 50 * s)}px ${Math.max(4, 50 * s)}px`,
              backgroundPosition: `${-minX * s}px ${-minY * s}px`,
            }}
          />

          {/* Connection lines */}
          <svg className="absolute inset-0" width={MINIMAP_W} height={MINIMAP_H} style={{ pointerEvents: "none" }}>
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const f = toMinimap(fromNode.x + 100, fromNode.y + 35);
              const t = toMinimap(toNode.x + 100, toNode.y + 35);
              return <line key={conn.id} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const nc = getNodeColor(n.color);
            const pos = toMinimap(n.x, n.y);
            const w = Math.max(4, 200 * s);
            const h = Math.max(3, 70 * s);
            return (
              <div
                key={n.id}
                className="absolute rounded-sm"
                style={{
                  left: pos.x, top: pos.y, width: w, height: h,
                  backgroundColor: nc.bg,
                  opacity: 0.8,
                }}
              />
            );
          })}

          {/* Other users' viewports */}
          {Array.from(userPresences.entries()).map(([name, p]) => {
            if (name === currentUser) return null;
            const color = getUserColor(name);
            const pos = toMinimap(p.viewport.x, p.viewport.y);
            const w = (p.viewport.w || 1000) * s;
            const h = (p.viewport.h || 700) * s;
            return (
              <div key={name}>
                <div
                  className="absolute border rounded-sm"
                  style={{
                    left: pos.x, top: pos.y, width: w, height: h,
                    borderColor: color,
                    opacity: 0.4,
                  }}
                />
                <div
                  className="absolute text-[6px] font-bold px-1 rounded-sm whitespace-nowrap"
                  style={{
                    left: pos.x, top: Math.max(0, pos.y - 10),
                    backgroundColor: color,
                    color: "#000",
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}

          {/* Current viewport */}
          <div
            className="absolute border-2 border-cyan-400/60 rounded-sm"
            style={{
              left: vpMini.x, top: vpMini.y,
              width: Math.max(8, vpMiniW), height: Math.max(6, vpMiniH),
              boxShadow: "0 0 8px rgba(34,211,238,0.3)",
            }}
          />
        </div>
      </div>
    </div>
  );
});

// ==================== OPTIMIZED NODE COMPONENT ====================
const ThoughtNodeCard = memo(function ThoughtNodeCard({
  node,
  isHost,
  userName,
  connectMode,
  connectFrom,
  editingNode,
  editText,
  showColorPicker,
  onPointerDown,
  onNodeClick,
  onDelete,
  onEditStart,
  onEditChange,
  onEditEnd,
  onColorPickerToggle,
  onColorChange,
}: {
  node: ThoughtNode;
  isHost: boolean;
  userName: string;
  connectMode: boolean;
  connectFrom: string | null;
  editingNode: string | null;
  editText: string;
  showColorPicker: string | null;
  onPointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onNodeClick: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onEditStart: (nodeId: string, text: string) => void;
  onEditChange: (text: string) => void;
  onEditEnd: (nodeId: string, text: string) => void;
  onColorPickerToggle: (nodeId: string) => void;
  onColorChange: (nodeId: string, color: string) => void;
}) {
  const nc = getNodeColor(node.color);
  const isConnectSource = connectFrom === node.id;

  return (
    <div
      data-node-id={node.id}
      className={`tm-node absolute select-none will-change-transform ${connectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} ${
        isConnectSource ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#050505]" : ""
      }`}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: 200,
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (connectMode) {
          onNodeClick(node.id);
        } else {
          onPointerDown(e, node.id);
        }
      }}
    >
      <div
        className="rounded-2xl p-5 border relative group"
        style={{
          backgroundColor: nc.bg,
          borderColor: `${nc.bg}aa`,
          boxShadow: `0 8px 32px -4px ${nc.bg}44, 0 16px 40px -8px rgba(0,0,0,0.4)`,
        }}
      >
        <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-2xl bg-black/5" />

        {editingNode === node.id ? (
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onEditEnd(node.id, editText)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onEditEnd(node.id, editText);
              }
            }}
            className="w-full bg-white/10 rounded-xl p-3 resize-none outline-none text-sm font-bold placeholder:text-black/20"
            style={{ color: nc.text }}
            rows={3}
          />
        ) : (
          <p
            className="font-bold text-sm leading-relaxed mb-4 break-words min-h-[44px]"
            style={{ color: nc.text }}
            onDoubleClick={() => onEditStart(node.id, node.text)}
          >
            {node.text}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-black/5 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black uppercase" style={{ color: nc.text }}>
              {node.author[0]}
            </div>
            <span className="text-[10px] uppercase tracking-tighter font-black opacity-30" style={{ color: nc.text }}>
              {node.author}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => { e.stopPropagation(); onColorPickerToggle(node.id); }}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: nc.text }} />
            </button>
            {(isHost || node.author === userName) && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" style={{ color: nc.text }} />
              </button>
            )}
          </div>
        </div>

        {showColorPicker === node.id && (
          <div className="absolute -bottom-16 left-0 right-0 flex justify-between bg-black/90 backdrop-blur-xl rounded-2xl p-2.5 z-50 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2">
            {NODE_COLORS.map((c) => (
              <button
                key={c.bg}
                onClick={(e) => { e.stopPropagation(); onColorChange(node.id, c.bg); }}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${node.color === c.bg ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ==================== SHARED CANVAS ====================
function SharedCanvas({
  nodes: propNodes,
  connections,
  socket,
  sessionId,
  userName,
  isHost,
}: {
  nodes: ThoughtNode[];
  connections: ThoughtConnection[];
  socket: any;
  sessionId: string;
  userName: string;
  isHost: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasLayerRef = useRef<HTMLDivElement>(null);

  // ---- Viewport as ref for high-frequency updates ----
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [viewportState, setViewportState] = useState({ x: 0, y: 0, zoom: 1 });

  // ---- Local node positions (Map for O(1) lookup) ----
  const nodesMapRef = useRef<Map<string, ThoughtNode>>(new Map());

  // ---- Interaction state (refs to avoid re-renders during drag) ----
  const isPanningRef = useRef(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const dragThrottleRef = useRef(0);
  const rafIdRef = useRef(0);
  const needsRenderRef = useRef(false);

  // ---- UI state (low-frequency, OK to use React state) ----
  const [showInput, setShowInput] = useState<{ x: number; y: number } | null>(null);
  const [inputText, setInputText] = useState("");
  const [selectedColor, setSelectedColor] = useState(NODE_COLORS[0].bg);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 1000, h: 700 });

  // ---- Presence state ----
  const [userPresences, setUserPresences] = useState<Map<string, UserPresence>>(new Map());
  const presenceThrottleRef = useRef(0);
  const isSubmittingNodeRef = useRef(false);

  // Force re-render counter for when nodes change
  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick(t => t + 1), []);

  // Synchronized initial viewport -- center at existing thoughts focal center or (0,0)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && containerRef.current) {
      initializedRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      let startX = cx;
      let startY = cy;
      if (propNodes.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of propNodes) {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x + 200 > maxX) maxX = n.x + 200;
          if (n.y + 80 > maxY) maxY = n.y + 80;
        }
        if (isFinite(minX) && isFinite(maxX)) {
          startX = cx - (minX + maxX) / 2;
          startY = cy - (minY + maxY) / 2;
        }
      }

      viewportRef.current = { x: startX, y: startY, zoom: 1 };
      setViewportState({ x: startX, y: startY, zoom: 1 });
      setContainerSize({ w: rect.width, h: rect.height });
    }
  }, [propNodes]);

  // Sync prop nodes into our local map
  useEffect(() => {
    const map = nodesMapRef.current;
    const existing = new Set(map.keys());

    for (const node of propNodes) {
      const current = map.get(node.id);
      // Only update if we are not actively dragging this node
      if (dragNodeIdRef.current === node.id) {
        existing.delete(node.id);
        continue;
      }
      if (!current || current.text !== node.text || current.color !== node.color ||
          current.x !== node.x || current.y !== node.y) {
        map.set(node.id, { ...node });
      }
      existing.delete(node.id);
    }

    // Remove deleted nodes
    for (const id of existing) {
      map.delete(id);
    }

    forceRender();
  }, [propNodes, forceRender]);

  // Listen for lightweight move updates from other users
  useEffect(() => {
    if (!socket) return;

    const handleNodeMoved = ({ nodeId, x, y, by }: { nodeId: string; x: number; y: number; by: string }) => {
      if (by === userName) return;
      if (dragNodeIdRef.current === nodeId) return;
      const node = nodesMapRef.current.get(nodeId);
      if (node) {
        node.x = x;
        node.y = y;
        needsRenderRef.current = true;
      }
    };

    const handlePresence = ({ userName: name, viewport }: { userName: string; viewport: any }) => {
      if (name === userName) return;
      setUserPresences(prev => {
        const next = new Map(prev);
        next.set(name, { userName: name, viewport, lastUpdate: Date.now() });
        return next;
      });
    };

    const handleNodeAdded = ({ node, by }: { node: ThoughtNode; by: string }) => {
      if (by === userName) return;
      if (!nodesMapRef.current.has(node.id)) {
        nodesMapRef.current.set(node.id, node);
        forceRender();
      }
    };

    const handleNodeDeleted = ({ nodeId }: { nodeId: string }) => {
      if (nodesMapRef.current.has(nodeId)) {
        nodesMapRef.current.delete(nodeId);
        forceRender();
      }
    };

    socket.on("thoughtmap:node_moved", handleNodeMoved);
    socket.on("thoughtmap:node_added", handleNodeAdded);
    socket.on("thoughtmap:node_deleted", handleNodeDeleted);
    socket.on("presence:viewport", handlePresence);

    return () => {
      socket.off("thoughtmap:node_moved", handleNodeMoved);
      socket.off("thoughtmap:node_added", handleNodeAdded);
      socket.off("thoughtmap:node_deleted", handleNodeDeleted);
      socket.off("presence:viewport", handlePresence);
    };
  }, [socket, userName]);

  // Broadcast viewport to other users (throttled)
  const broadcastViewport = useCallback(() => {
    const now = Date.now();
    if (now - presenceThrottleRef.current < 500) return;
    presenceThrottleRef.current = now;
    if (!socket || !containerRef.current) return;
    const vp = viewportRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    socket.emit("presence:viewport", {
      sessionId,
      userName,
      viewport: {
        x: -vp.x / vp.zoom,
        y: -vp.y / vp.zoom,
        zoom: vp.zoom,
        w: rect.width / vp.zoom,
        h: rect.height / vp.zoom,
      },
    });
  }, [socket, sessionId, userName]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Clean up stale presences
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setUserPresences(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [name] of next) {
          const p = next.get(name);
          if (p && now - p.lastUpdate > 30000) {
            next.delete(name);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ---- ANIMATION LOOP: updates DOM directly for dragged nodes ----
  useEffect(() => {
    const loop = () => {
      rafIdRef.current = requestAnimationFrame(loop);

      if (needsRenderRef.current) {
        needsRenderRef.current = false;
        forceRender();
      }

      // Update dragged node DOM element directly (bypass React)
      const dragId = dragNodeIdRef.current;
      if (dragId) {
        const el = containerRef.current?.querySelector(`[data-node-id="${dragId}"]`) as HTMLElement;
        const node = nodesMapRef.current.get(dragId);
        if (el && node) {
          el.style.transform = `translate3d(${node.x}px, ${node.y}px, 0)`;
        }
      }

      // Update canvas layer transform
      if (canvasLayerRef.current) {
        const vp = viewportRef.current;
        canvasLayerRef.current.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
      }
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [forceRender]);

  // ---- COORDINATE CONVERSION ----
  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const vp = viewportRef.current;
    return {
      x: (clientX - rect.left - vp.x) / vp.zoom,
      y: (clientY - rect.top - vp.y) / vp.zoom,
    };
  }, []);

  // ---- COMMIT VIEWPORT to React state (debounced) ----
  const commitViewportRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitViewport = useCallback(() => {
    if (commitViewportRef.current) clearTimeout(commitViewportRef.current);
    commitViewportRef.current = setTimeout(() => {
      const vp = viewportRef.current;
      setViewportState({ ...vp });
      broadcastViewport();
    }, 60);
  }, [broadcastViewport]);

  // ---- ACTIONS ----
  const submitNode = useCallback(() => {
    if (isSubmittingNodeRef.current) return;
    if (!showInput || !inputText.trim()) {
      setShowInput(null);
      return;
    }
    isSubmittingNodeRef.current = true;
    const text = inputText.trim();
    const nodeId = "tm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const node: ThoughtNode = {
      id: nodeId,
      text,
      x: showInput.x,
      y: showInput.y,
      color: selectedColor,
      author: userName,
    };

    // 1. INSTANT OPTIMISTIC ADD: 0ms delay, appears immediately on the screen
    nodesMapRef.current.set(node.id, node);
    forceRender();

    // 2. Clear input immediately so user cannot double-submit
    setShowInput(null);
    setInputText("");

    // 3. Emit to server
    if (socket) {
      socket.emit("thoughtmap:add_node", { sessionId, node });
    }

    setTimeout(() => {
      isSubmittingNodeRef.current = false;
    }, 400);
  }, [showInput, inputText, selectedColor, userName, socket, sessionId, forceRender]);

  const deleteNode = useCallback((nodeId: string) => {
    // Instant optimistic delete
    nodesMapRef.current.delete(nodeId);
    forceRender();
    if (socket) {
      socket.emit("thoughtmap:delete_node", { sessionId, nodeId });
    }
  }, [socket, sessionId, forceRender]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(nodeId);
      } else if (connectFrom !== nodeId) {
        const connection: ThoughtConnection = {
          id: Math.random().toString(36).substr(2, 9),
          from: connectFrom,
          to: nodeId,
        };
        socket.emit("thoughtmap:add_connection", { sessionId, connection });
        setConnectFrom(null);
        setConnectMode(false);
      }
    }
  }, [connectMode, connectFrom, socket, sessionId]);

  const autoCluster = useCallback(() => {
    const allNodes = Array.from(nodesMapRef.current.values());
    if (!allNodes.length) return;
    const cols = Math.ceil(Math.sqrt(allNodes.length));
    const spacing = 250;
    allNodes.forEach((n, i) => {
      socket.emit("thoughtmap:move_node_final", {
        sessionId,
        nodeId: n.id,
        x: (i % cols) * spacing - (cols * spacing) / 2,
        y: Math.floor(i / cols) * spacing - (cols * spacing) / 2,
      });
    });
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      viewportRef.current = { x: rect.width / 2, y: rect.height / 2, zoom: 1 };
      commitViewport();
    }
  }, [socket, sessionId, commitViewport]);

  const navigateToWorld = useCallback((worldX: number, worldY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vp = viewportRef.current;
    viewportRef.current = {
      ...vp,
      x: -worldX * vp.zoom + rect.width / 2,
      y: -worldY * vp.zoom + rect.height / 2,
    };
    commitViewport();
  }, [commitViewport]);

  // ---- POINTER HANDLERS ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Two-finger pinch
    if (activePointersRef.current.size === 2) {
      const pts = [...activePointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      pinchRef.current = { dist, scale: viewportRef.current.zoom, cx, cy };
      isPanningRef.current = true;
      return;
    }

    if (target.closest(".tm-node")) return;

    if (showInput) {
      setShowInput(null);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    // Double-tap detection
    const now = Date.now();
    const dt = now - lastTapRef.current.time;
    const dx = Math.abs(e.clientX - lastTapRef.current.x);
    const dy = Math.abs(e.clientY - lastTapRef.current.y);

    if (dt < 400 && dx < 30 && dy < 30) {
      const canvasPoint = toCanvasPoint(e.clientX, e.clientY);
      setShowInput({ x: canvasPoint.x, y: canvasPoint.y });
      setInputText("");
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

    isPanningRef.current = true;
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch (_) {}
  }, [toCanvasPoint]);

  const onNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragNodeIdRef.current = nodeId;
    dragThrottleRef.current = 0;
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch (_) {}
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch zoom
    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...activePointersRef.current.values()];
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = newDist / pinchRef.current.dist;
      const newZoom = Math.max(0.2, Math.min(3, pinchRef.current.scale * ratio));
      viewportRef.current.zoom = newZoom;
      commitViewport();
      return;
    }

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Node dragging -- update ref directly, no setState
    const dragId = dragNodeIdRef.current;
    if (dragId) {
      const node = nodesMapRef.current.get(dragId);
      if (node) {
        const zoom = viewportRef.current.zoom;
        node.x += dx / zoom;
        node.y += dy / zoom;

        // Throttled network update (every ~80ms)
        const now = Date.now();
        if (now - dragThrottleRef.current > 80) {
          dragThrottleRef.current = now;
          socket.emit("thoughtmap:move_node", {
            sessionId,
            nodeId: dragId,
            x: node.x,
            y: node.y,
          });
        }
      }
      return;
    }

    // Panning -- update ref directly
    if (isPanningRef.current && activePointersRef.current.size <= 1) {
      viewportRef.current.x += dx;
      viewportRef.current.y += dy;
      commitViewport();
    }
  }, [socket, sessionId, commitViewport]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const dragId = dragNodeIdRef.current;
    if (dragId) {
      const node = nodesMapRef.current.get(dragId);
      if (node) {
        // Send final authoritative position
        socket.emit("thoughtmap:move_node_final", {
          sessionId,
          nodeId: dragId,
          x: node.x,
          y: node.y,
        });
      }
      needsRenderRef.current = true;
    }

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
    if (activePointersRef.current.size === 0) {
      isPanningRef.current = false;
      dragNodeIdRef.current = null;
    }
  }, [socket, sessionId]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const newZoom = Math.min(Math.max(0.2, viewportRef.current.zoom - e.deltaY * 0.005), 3);
      viewportRef.current.zoom = newZoom;
    } else {
      viewportRef.current.x -= e.deltaX;
      viewportRef.current.y -= e.deltaY;
    }
    commitViewport();
  }, [commitViewport]);

  // ---- DERIVED DATA ----
  const currentNodes = useMemo(() => Array.from(nodesMapRef.current.values()), [viewportState, propNodes]);
  const vp = viewportState;

  // Get node center position for arrow drawing
  const getNodeCenter = useCallback((nodeId: string) => {
    const node = nodesMapRef.current.get(nodeId);
    if (!node) return null;
    return { x: node.x + 100, y: node.y + 35 };
  }, [viewportState]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#050505] rounded-3xl border border-white/10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={(e) => {
        activePointersRef.current.delete(e.pointerId);
        isPanningRef.current = false;
        if (dragNodeIdRef.current) {
          const node = nodesMapRef.current.get(dragNodeIdRef.current);
          if (node) {
            socket.emit("thoughtmap:move_node_final", { sessionId, nodeId: dragNodeIdRef.current, x: node.x, y: node.y });
          }
          dragNodeIdRef.current = null;
          needsRenderRef.current = true;
        }
      }}
      onWheel={onWheel}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundSize: `${50 * vp.zoom}px ${50 * vp.zoom}px`,
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundPosition: `${vp.x}px ${vp.y}px`,
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <Button
            size="sm"
            onClick={() => {
              const rect = containerRef.current?.getBoundingClientRect();
              const cx = rect ? rect.width / 2 : 500;
              const cy = rect ? rect.height / 2 : 350;
              const vp = viewportRef.current;
              setShowInput({
                x: (cx - vp.x) / vp.zoom - 100,
                y: (cy - vp.y) / vp.zoom - 40,
              });
              setInputText("");
            }}
            className="bg-primary text-black hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider px-3.5 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Idea
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={autoCluster}
            className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-xl text-[10px] font-bold uppercase tracking-widest px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <BrainCircuit className="w-4 h-4 mr-2" /> Organize
          </Button>
          <div className="flex bg-white/10 backdrop-blur rounded-xl p-1 border border-white/10">
            <button onClick={() => { viewportRef.current.zoom = Math.min(3, viewportRef.current.zoom * 1.2); commitViewport(); }} className="p-2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => { viewportRef.current.zoom = Math.max(0.2, viewportRef.current.zoom / 1.2); commitViewport(); }} className="p-2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                viewportRef.current = { x: rect.width / 2, y: rect.height / 2, zoom: 1 };
                commitViewport();
              }
            }} className="p-2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white" title="Reset View"><Maximize className="w-4 h-4" /></button>
          </div>

          <Button
            size="sm"
            variant={connectMode ? "default" : "secondary"}
            onClick={() => {
              setConnectMode(!connectMode);
              setConnectFrom(null);
            }}
            className={`backdrop-blur text-xs px-3 h-10 ${connectMode
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-white/10 text-white hover:bg-white/20 border-white/10"
            }`}
          >
            <Link2 className="w-4 h-4 mr-1.5" /> {connectMode ? (connectFrom ? "Click target..." : "Click source...") : "Connect"}
          </Button>
        </div>

        {/* User presence indicators */}
        {userPresences.size > 0 && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-white/5 backdrop-blur-xl rounded-full px-3 py-1.5 border border-white/10">
            <Users className="w-3.5 h-3.5 text-white/40" />
            {Array.from(userPresences.keys()).slice(0, 5).map((name) => (
              <div
                key={name}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                style={{ backgroundColor: getUserColor(name) }}
                title={name}
              >
                {name[0].toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex flex-col sm:flex-row items-end sm:items-center gap-2 pointer-events-none">
        <div className="flex gap-2">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] sm:text-sm font-bold text-white shadow-xl pointer-events-auto">
            {currentNodes.length} Ideas
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 text-[9px] sm:text-xs text-white/60 shadow-xl hidden xs:block pointer-events-auto">
            Double-tap to add
          </div>
        </div>
      </div>

      {/* Canvas Layer -- single transform for all objects */}
      <div
        ref={canvasLayerRef}
        className="absolute inset-0 origin-top-left pointer-events-none will-change-transform"
        style={{
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        }}
      >
        {/* Connections SVG -- removed expensive blur filters */}
        <svg style={{ position: 'absolute', overflow: 'visible', width: '1px', height: '1px', left: 0, top: 0, pointerEvents: 'none' }}>
          {connections.map((conn) => {
            const from = getNodeCenter(conn.from);
            const to = getNodeCenter(conn.to);
            if (!from || !to) return null;
            const cdx = to.x - from.x;
            const cdy = to.y - from.y;
            const angle = Math.atan2(cdy, cdx);
            const tipX = to.x - Math.cos(angle) * 20;
            const tipY = to.y - Math.sin(angle) * 20;
            return (
              <g key={conn.id}>
                <line
                  x1={from.x} y1={from.y} x2={tipX} y2={tipY}
                  stroke="rgba(139,92,246,0.3)" strokeWidth={2}
                />
                <line
                  x1={from.x} y1={from.y} x2={tipX} y2={tipY}
                  stroke="rgba(255,255,255,0.3)" strokeWidth={2}
                  strokeDasharray="6,4"
                />
                <polygon
                  points={`${tipX},${tipY} ${tipX - 10 * Math.cos(angle - 0.4)},${tipY - 10 * Math.sin(angle - 0.4)} ${tipX - 10 * Math.cos(angle + 0.4)},${tipY - 10 * Math.sin(angle + 0.4)}`}
                  fill="rgba(139,92,246,0.5)"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {currentNodes.map((node) => (
          <ThoughtNodeCard
            key={node.id}
            node={node}
            isHost={isHost}
            userName={userName}
            connectMode={connectMode}
            connectFrom={connectFrom}
            editingNode={editingNode}
            editText={editText}
            showColorPicker={showColorPicker}
            onPointerDown={onNodePointerDown}
            onNodeClick={handleNodeClick}
            onDelete={deleteNode}
            onEditStart={(id, text) => { setEditingNode(id); setEditText(text); }}
            onEditChange={setEditText}
            onEditEnd={(id, text) => {
              if (text.trim()) {
                socket.emit("thoughtmap:update_node", { sessionId, nodeId: id, text: text.trim() });
              }
              setEditingNode(null);
            }}
            onColorPickerToggle={(id) => setShowColorPicker(showColorPicker === id ? null : id)}
            onColorChange={(id, color) => {
              socket.emit("thoughtmap:update_node", { sessionId, nodeId: id, color });
              setShowColorPicker(null);
            }}
          />
        ))}
      </div>

      {/* New Node Input Popup */}
      {showInput && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: showInput.x * vp.zoom + vp.x,
            top: showInput.y * vp.zoom + vp.y,
          }}
        >
          <div className="bg-[#0A0D14] border border-white/20 rounded-2xl p-4 shadow-2xl w-64 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">New Thought</h4>
              <button
                type="button"
                onClick={() => setShowInput(null)}
                className="text-white/40 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white resize-none outline-none focus:border-white/30 mb-3"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitNode();
                }
                if (e.key === "Escape") setShowInput(null);
              }}
            />
            <div className="flex items-center gap-2 mb-3">
              {NODE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.bg}
                  onClick={() => setSelectedColor(c.bg)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${selectedColor === c.bg ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setShowInput(null)}
                variant="ghost"
                className="flex-1 text-white/60 text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitNode}
                disabled={!inputText.trim()}
                className="flex-1 bg-white text-black font-bold text-xs h-9 hover:bg-white/90 cursor-pointer disabled:opacity-40"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Minimap */}
      <Minimap
        nodes={currentNodes}
        connections={connections}
        viewport={viewportState}
        containerSize={containerSize}
        userPresences={userPresences}
        currentUser={userName}
        onNavigate={navigateToWorld}
        collapsed={minimapCollapsed}
        onToggle={() => setMinimapCollapsed(!minimapCollapsed)}
      />
    </div>
  );
}

// ==================== HOST ====================
export function ThoughtMapHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const nodes: ThoughtNode[] = session.activityData?.nodes ?? [];
  const connections: ThoughtConnection[] = session.activityData?.connections ?? [];

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
        <Network className="w-12 h-12 text-white mb-6" />
        <h2 className="text-4xl font-bold mb-2 text-white">Thought Map</h2>
        <p className="text-white/60 mb-8">An infinite canvas for your team's ideas. Double-tap anywhere to add thoughts.</p>

        <Button
          onClick={() => updateActivity({ nodes: [], connections: [] }, "live")}
          className="w-full max-w-sm bg-white text-black font-bold h-12 rounded-xl hover:bg-white/90"
        >
          Initialize Canvas
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ThoughtMapCanvas session={session} isHost={true} />
    </div>
  );
}

// ==================== PARTICIPANT ====================
export function ThoughtMapParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";

  if (isEditing) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center p-6">
        <div>
          <Network className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connecting Canvas</h2>
          <p className="text-white/40">Waiting for the host...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ThoughtMapCanvas session={session} isHost={false} socket={socket} userName={userName} />
    </div>
  );
}

// ==================== CANVAS WRAPPER ====================
function ThoughtMapCanvas({
  session,
  isHost,
  socket: propSocket,
  userName: propUserName,
}: {
  session: any;
  isHost: boolean;
  socket?: any;
  userName?: string;
}) {
  const { socket: contextSocket } = useSocket();
  const socket = propSocket || contextSocket;
  const userName = propUserName || session.hostName || "Host";
  const nodes: ThoughtNode[] = session.activityData?.nodes ?? [];
  const connections: ThoughtConnection[] = session.activityData?.connections ?? [];

  return (
    <SharedCanvas
      nodes={nodes}
      connections={connections}
      socket={socket}
      sessionId={session.id}
      userName={userName}
      isHost={isHost}
    />
  );
}
