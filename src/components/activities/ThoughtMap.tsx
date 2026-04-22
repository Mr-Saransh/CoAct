"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Network, Plus, BrainCircuit, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  author: string;
}

interface ThoughtMapState {
  nodes: Node[];
}

function MapCanvas({ 
  state, 
  updateActivity, 
  isHost, 
  pan, 
  setPan, 
  scale, 
  setScale, 
  isDragging, 
  setIsDragging, 
  dragNodeId, 
  setDragNodeId 
}: any) {
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s: number) => Math.min(Math.max(0.2, s - e.deltaY * 0.01), 3));
    } else {
      setPan((p: any) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.tm-node')) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPan((p: any) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    } else if (dragNodeId) {
      const updatedNodes = state.nodes.map((n: any) => 
        n.id === dragNodeId ? { ...n, x: n.x + e.movementX / scale, y: n.y + e.movementY / scale } : n
      );
      updateActivity({ ...state, nodes: updatedNodes });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragNodeId(null);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#050505] rounded-3xl border border-white/10"
         onWheel={handleWheel}
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         style={{ touchAction: 'none' }}>
      
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{
             backgroundSize: `${50 * scale}px ${50 * scale}px`,
             backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
             backgroundPosition: `${pan.x}px ${pan.y}px`
           }} />

      {/* Canvas Layer */}
      <div className="absolute inset-0 origin-center"
           style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
        {state.nodes.map((node: any) => (
          <div
            key={node.id}
            className="tm-node absolute bg-[#0A0D14] border border-white/20 rounded-xl p-4 shadow-xl cursor-grab active:cursor-grabbing hover:border-white/40 transition-colors"
            style={{ 
              transform: `translate(${node.x}px, ${node.y}px)`, 
              width: 200,
              left: '50%',
              top: '50%',
              marginLeft: -100,
              marginTop: -50
            }}
            onPointerDown={(e) => { e.stopPropagation(); setDragNodeId(node.id); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          >
            <p className="text-white font-medium text-sm mb-3">{node.text}</p>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">{node.author}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThoughtMapHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const state: ThoughtMapState = {
    nodes: session.activityData?.nodes ?? []
  };
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  const autoCluster = () => {
    if (!state.nodes.length) return;
    const cols = Math.ceil(Math.sqrt(state.nodes.length));
    const spacing = 200;
    const updated = state.nodes.map((n, i) => ({
      ...n,
      x: (i % cols) * spacing - (cols * spacing) / 2,
      y: Math.floor(i / cols) * spacing - (cols * spacing) / 2
    }));
    updateActivity({ ...state, nodes: updated }, "live");
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
        <Network className="w-12 h-12 text-white mb-6" />
        <h2 className="text-4xl font-bold mb-2 text-white">Thought Map</h2>
        <p className="text-white/60 mb-8">An infinite canvas for your team's ideas.</p>

        <Button
          onClick={() => updateActivity({ nodes: [] }, "live")}
          className="w-full max-w-sm bg-white text-black font-bold h-12 rounded-xl hover:bg-white/90"
        >
          Initialize Canvas
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapCanvas 
        state={state} 
        updateActivity={(data: any) => updateActivity(data, "live")}
        isHost={true}
        pan={pan} setPan={setPan}
        scale={scale} setScale={setScale}
        isDragging={isDragging} setIsDragging={setIsDragging}
        dragNodeId={dragNodeId} setDragNodeId={setDragNodeId}
      />
      
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={autoCluster} className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur text-xs px-2 h-8">
          <BrainCircuit className="w-3.5 h-3.5 mr-1.5" /> Auto-Cluster
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setPan({x:0, y:0}); setScale(1); }} className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur w-8 h-8 p-0">
          <Maximize className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-sm font-bold text-white">
        {state.nodes.length} Ideas
      </div>
    </div>
  );
}

export function ThoughtMapParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const state: ThoughtMapState = {
    nodes: session.activityData?.nodes ?? []
  };
  const [idea, setIdea] = useState("");
  const [showInput, setShowInput] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

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

  const submitIdea = () => {
    if (!idea.trim()) return;
    const newNode: Node = {
      id: Math.random().toString(36).substr(2, 9),
      text: idea,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      author: userName
    };
    socket.emit("session:updateActivity", { sessionId: session.id, activityData: { ...state, nodes: [...state.nodes, newNode] } });
    setIdea("");
    setShowInput(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <MapCanvas 
          state={state} 
          updateActivity={(data: any) => socket.emit("session:updateActivity", { sessionId: session.id, activityData: data })}
          isHost={false}
          pan={pan} setPan={setPan}
          scale={scale} setScale={setScale}
          isDragging={isDragging} setIsDragging={setIsDragging}
          dragNodeId={dragNodeId} setDragNodeId={setDragNodeId}
        />
      </div>

      <div className="absolute bottom-6 right-6 z-30">
        <Button 
          onClick={() => setShowInput(!showInput)}
          className="w-14 h-14 rounded-full bg-white text-black shadow-2xl hover:scale-105 transition-transform"
        >
          {showInput ? <Maximize className="w-6 h-6 rotate-45" /> : <Plus className="w-6 h-6" />}
        </Button>
      </div>

      {showInput && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Add Idea</h3>
            <textarea
              autoFocus
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white resize-none outline-none focus:border-white/30 transition-colors mb-4"
            />
            <div className="flex gap-3">
              <Button onClick={() => setShowInput(false)} variant="ghost" className="flex-1 text-white/60">Cancel</Button>
              <Button 
                onClick={submitIdea}
                disabled={!idea.trim()}
                className="flex-1 bg-white text-black font-bold h-12 rounded-xl"
              >
                Drop Idea
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
