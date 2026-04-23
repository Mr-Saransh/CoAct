"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/providers/SocketProvider";
import { Network, BrainCircuit, Maximize, Trash2, Link2, X, Palette } from "lucide-react";

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

const NODE_COLORS = [
  { bg: "#fbbf24", text: "#78350f", label: "Amber" },
  { bg: "#34d399", text: "#064e3b", label: "Emerald" },
  { bg: "#60a5fa", text: "#1e3a5f", label: "Blue" },
  { bg: "#f472b6", text: "#831843", label: "Pink" },
  { bg: "#a78bfa", text: "#3b0764", label: "Violet" },
  { bg: "#fb923c", text: "#7c2d12", label: "Orange" },
];

function getNodeColor(colorKey: string) {
  return NODE_COLORS.find((c) => c.bg === colorKey) || NODE_COLORS[0];
}

// Shared canvas used by both host and participant
function SharedCanvas({
  nodes,
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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState<{ x: number; y: number } | null>(null);
  const [inputText, setInputText] = useState("");
  const [selectedColor, setSelectedColor] = useState(NODE_COLORS[0].bg);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  // Double-tap detection
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  // Drag tracking via pointer position (not movementX which breaks on mobile)
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pinch zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - pan.x) / scale, y: (clientY - rect.top - pan.y) / scale };
    },
    [pan, scale]
  );

  const addNode = useCallback(
    (x: number, y: number) => {
      setShowInput({ x, y });
      setInputText("");
    },
    []
  );

  const submitNode = useCallback(() => {
    if (!showInput || !inputText.trim()) {
      setShowInput(null);
      return;
    }
    const node: ThoughtNode = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText.trim(),
      x: showInput.x,
      y: showInput.y,
      color: selectedColor,
      author: userName,
    };
    socket.emit("thoughtmap:add_node", { sessionId, node });
    setShowInput(null);
    setInputText("");
  }, [showInput, inputText, selectedColor, userName, socket, sessionId]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      socket.emit("thoughtmap:delete_node", { sessionId, nodeId });
    },
    [socket, sessionId]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
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
    },
    [connectMode, connectFrom, socket, sessionId]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Two-finger pinch
    if (activePointersRef.current.size === 2) {
      const pts = [...activePointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = { dist, scale };
      setIsPanning(true);
      return;
    }

    // If clicking on a node
    if (target.closest(".tm-node")) return;

    // Double-tap detection
    const now = Date.now();
    const dt = now - lastTapRef.current.time;
    const dx = Math.abs(e.clientX - lastTapRef.current.x);
    const dy = Math.abs(e.clientY - lastTapRef.current.y);

    if (dt < 400 && dx < 30 && dy < 30) {
      // Double tap! Create node at this position
      const canvasPoint = toCanvasPoint(e.clientX, e.clientY);
      addNode(canvasPoint.x, canvasPoint.y);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

    // Start panning
    setIsPanning(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch zoom
    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...activePointersRef.current.values()];
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = newDist / pinchRef.current.dist;
      setScale(Math.max(0.2, Math.min(3, pinchRef.current.scale * ratio)));
    }

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    if (dragNodeId) {
      const node = nodes.find((n) => n.id === dragNodeId);
      if (node) {
        socket.emit("thoughtmap:move_node", {
          sessionId,
          nodeId: dragNodeId,
          x: node.x + dx / scale,
          y: node.y + dy / scale,
        });
      }
      return;
    }

    if (isPanning && activePointersRef.current.size <= 1) {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
    if (activePointersRef.current.size === 0) {
      setIsPanning(false);
      setDragNodeId(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setScale((s) => Math.min(Math.max(0.2, s - e.deltaY * 0.005), 3));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const autoCluster = () => {
    if (!nodes.length) return;
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 250;
    nodes.forEach((n, i) => {
      socket.emit("thoughtmap:move_node", {
        sessionId,
        nodeId: n.id,
        x: (i % cols) * spacing - (cols * spacing) / 2,
        y: Math.floor(i / cols) * spacing - (cols * spacing) / 2,
      });
    });
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  // Get node center position for arrow drawing
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    return { x: node.x + 100, y: node.y + 35 };
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#050505] rounded-3xl border border-white/10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={(e) => {
        activePointersRef.current.delete(e.pointerId);
        setIsPanning(false);
        setDragNodeId(null);
      }}
      onWheel={onWheel}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundSize: `${50 * scale}px ${50 * scale}px`,
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={autoCluster}
          className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur text-xs px-3 h-10"
        >
          <BrainCircuit className="w-4 h-4 mr-1.5" /> Auto-Cluster
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setScale(1);
          }}
          className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur w-10 h-10 p-0"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={connectMode ? "default" : "secondary"}
          onClick={() => {
            setConnectMode(!connectMode);
            setConnectFrom(null);
          }}
          className={`backdrop-blur text-xs px-3 h-10 ${
            connectMode
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-white/10 text-white hover:bg-white/20 border-white/10"
          }`}
        >
          <Link2 className="w-4 h-4 mr-1.5" /> {connectMode ? (connectFrom ? "Click target..." : "Click source...") : "Connect"}
        </Button>
      </div>

      {/* Info */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-sm font-bold text-white">
          {nodes.length} Ideas
        </div>
        <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-full border border-white/10 text-xs text-white/60">
          Double-tap to add
        </div>
      </div>

      {/* Canvas Layer */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        {/* Arrows/Connections */}
        <svg style={{ position: 'absolute', overflow: 'visible', width: '1px', height: '1px', left: 0, top: 0, pointerEvents: 'none' }}>
          {connections.map((conn) => {
            const from = getNodeCenter(conn.from);
            const to = getNodeCenter(conn.to);
            if (!from || !to) return null;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const angle = Math.atan2(dy, dx);
            const len = Math.hypot(dx, dy);
            // Arrow tip offset
            const tipX = to.x - Math.cos(angle) * 20;
            const tipY = to.y - Math.sin(angle) * 20;
            return (
              <g key={conn.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={tipX}
                  y2={tipY}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                />
                {/* Arrowhead */}
                <polygon
                  points={`${tipX},${tipY} ${tipX - 10 * Math.cos(angle - 0.4)},${tipY - 10 * Math.sin(angle - 0.4)} ${tipX - 10 * Math.cos(angle + 0.4)},${tipY - 10 * Math.sin(angle + 0.4)}`}
                  fill="rgba(255,255,255,0.4)"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const nc = getNodeColor(node.color);
          const isConnectSource = connectFrom === node.id;
          return (
            <div
              key={node.id}
              className={`tm-node absolute select-none ${connectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} ${
                isConnectSource ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#050505]" : ""
              }`}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: 200,
                pointerEvents: 'auto',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                lastPointerRef.current = { x: e.clientX, y: e.clientY };
                if (connectMode) {
                  handleNodeClick(node.id);
                } else {
                  setDragNodeId(node.id);
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                }
              }}
            >
              {/* Sticker Node */}
              <div
                className="rounded-2xl p-4 shadow-lg border-2 relative group transition-shadow hover:shadow-xl"
                style={{
                  backgroundColor: nc.bg,
                  borderColor: `${nc.bg}88`,
                  boxShadow: `0 4px 20px ${nc.bg}33, 0 8px 40px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Sticker fold effect */}
                <div
                  className="absolute top-0 right-0 w-6 h-6 rounded-bl-xl"
                  style={{ backgroundColor: `${nc.bg}cc`, boxShadow: `inset -2px 2px 4px rgba(0,0,0,0.1)` }}
                />

                {editingNode === node.id ? (
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => {
                      if (editText.trim()) {
                        socket.emit("thoughtmap:update_node", { sessionId, nodeId: node.id, text: editText.trim() });
                      }
                      setEditingNode(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (editText.trim()) {
                          socket.emit("thoughtmap:update_node", { sessionId, nodeId: node.id, text: editText.trim() });
                        }
                        setEditingNode(null);
                      }
                    }}
                    className="w-full bg-transparent resize-none outline-none text-sm font-semibold"
                    style={{ color: nc.text }}
                    rows={2}
                  />
                ) : (
                  <p
                    className="font-semibold text-sm leading-snug mb-3 break-words"
                    style={{ color: nc.text }}
                    onDoubleClick={() => {
                      setEditingNode(node.id);
                      setEditText(node.text);
                    }}
                  >
                    {node.text}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest font-bold opacity-60" style={{ color: nc.text }}>
                    {node.author}
                  </span>
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker(showColorPicker === node.id ? null : node.id);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10"
                    >
                      <Palette className="w-4 h-4" style={{ color: nc.text }} />
                    </button>
                    {(isHost || node.author === userName) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: nc.text }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Color picker dropdown */}
                {showColorPicker === node.id && (
                  <div className="absolute -bottom-14 left-0 flex gap-2 bg-black/80 backdrop-blur rounded-xl p-3 z-50 border border-white/10">
                    {NODE_COLORS.map((c) => (
                      <button
                        key={c.bg}
                        onClick={(e) => {
                          e.stopPropagation();
                          socket.emit("thoughtmap:update_node", { sessionId, nodeId: node.id, color: c.bg });
                          setShowColorPicker(null);
                        }}
                        className={`w-8 h-8 rounded-full border-2 ${node.color === c.bg ? "border-white" : "border-transparent"}`}
                        style={{ backgroundColor: c.bg }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Node Input Popup */}
      {showInput && (
        <div
          className="absolute z-50"
          style={{
            left: showInput.x * scale + pan.x,
            top: showInput.y * scale + pan.y,
          }}
        >
          <div className="bg-[#0A0D14] border border-white/20 rounded-2xl p-4 shadow-2xl w-64 -translate-x-1/2 -translate-y-1/2">
            <h4 className="text-sm font-bold text-white mb-3">New Thought</h4>
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
                  key={c.bg}
                  onClick={() => setSelectedColor(c.bg)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === c.bg ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowInput(null)}
                variant="ghost"
                className="flex-1 text-white/60 text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={submitNode}
                disabled={!inputText.trim()}
                className="flex-1 bg-white text-black font-bold text-xs h-9"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
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

  // Host needs socket - we'll get it from the parent
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

// ==================== CANVAS WRAPPER (gets socket from context) ====================
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
  // For host, we need socket from provider
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
