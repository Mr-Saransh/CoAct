"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, RefreshCcw, Sparkles, User } from "lucide-react";

type UnoCard = {
  id: string;
  color: "red" | "blue" | "green" | "yellow" | "wild";
  type: "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
  value: number | null;
};

type UnoState = {
  players: Record<string, { cards: UnoCard[] }>;
  order: string[];
  currentCard: UnoCard | null;
  currentColor: "red" | "blue" | "green" | "yellow";
  turn: string;
  direction: "clockwise" | "counterclockwise";
  status: "setup" | "live" | "ended";
  cardsPerPlayer: 7 | 9;
  winner: string | null;
  turnEndsAt: number | null;
  turnDurationMs: number;
  hasDrawnThisTurn: boolean;
  lastEvent?: { type: string; actor?: string; timestamp: number };
};

type SessionLike = {
  id: string;
  hostName: string;
  participants: Array<{ name: string; isConnected: boolean }>;
  players: string[];
  spectators: string[];
  maxPlayers: number;
  activityData: Partial<UnoState>;
};

type SocketLike = {
  emit: (event: string, payload: Record<string, unknown>) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
};

const COLOR_META: Record<UnoCard["color"], { bg: string; glow: string; text: string; accent: string }> = {
  red: { bg: "from-rose-500 via-red-600 to-red-800", glow: "shadow-red-500/40", text: "text-white", accent: "rgba(255,255,255,0.2)" },
  blue: { bg: "from-blue-500 via-blue-600 to-indigo-800", glow: "shadow-blue-500/40", text: "text-white", accent: "rgba(255,255,255,0.2)" },
  green: { bg: "from-emerald-500 via-green-600 to-emerald-800", glow: "shadow-emerald-500/40", text: "text-white", accent: "rgba(255,255,255,0.2)" },
  yellow: { bg: "from-amber-300 via-yellow-400 to-amber-600", glow: "shadow-yellow-400/40", text: "text-black", accent: "rgba(0,0,0,0.1)" },
  wild: { bg: "from-zinc-800 via-zinc-900 to-black", glow: "shadow-purple-500/30", text: "text-white", accent: "rgba(255,255,255,0.1)" },
};

function labelForCard(card: UnoCard) {
  if (card.type === "number") return `${card.value}`;
  if (card.type === "skip") return "SKIP";
  if (card.type === "reverse") return "REV";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "WILD";
  return "+4";
}

function canPlayCard(card: UnoCard, currentCard: UnoCard | null, currentColor: string) {
  if (!currentCard) return true;
  if (card.type === "wild" || card.type === "wild4") return true;
  if (card.color === currentColor) return true;
  if (card.type === "number" && currentCard.type === "number" && card.value === currentCard.value) return true;
  if (card.type !== "number" && currentCard.type !== "number" && card.type === currentCard.type) return true;
  return false;
}

function getSeatPosition(index: number, total: number, isMobile: boolean) {
  const angle = (index / total) * Math.PI * 2;
  // Reduced radius even more to prevent overlap and cut-offs
  const radiusX = isMobile ? 32 : 38;
  const radiusY = isMobile ? 28 : 34;
  return {
    x: Math.cos(angle - Math.PI / 2) * radiusX,
    y: Math.sin(angle - Math.PI / 2) * radiusY
  };
}

function RoleBadge({ role }: { role: "player" | "spectator" }) {
  return (
    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${role === 'player' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
      {role}
    </div>
  );
}

function FloatingReactions({ sessionId, socket }: { sessionId: string; socket: SocketLike }) {
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);

  useEffect(() => {
    const handler = (reaction: { id: string; emoji: string }) => {
      const newReaction = {
        ...reaction,
        x: 10 + Math.random() * 80,
        y: 80 + Math.random() * 10,
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    };

    socket.on("session:reaction", handler);
    return () => socket.off("session:reaction", handler);
  }, [socket]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -500, scale: [0.5, 1.5, 1.5, 2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute text-5xl md:text-6xl drop-shadow-2xl"
            style={{ left: `${r.x}%`, bottom: `10%` }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function UnoHost({ session, socket }: { session: SessionLike; socket: SocketLike }) {
  const players = (session?.participants || []).filter((p) => p.isConnected);
  const [cardsPerPlayer, setCardsPerPlayer] = useState<7 | 9>(7);
  const unoState = (session?.activityData || {}) as Partial<UnoState>;
  const gameStatus = unoState.status || "setup";
  const canStart = players.length >= 2 && players.length <= 10;

  const startGame = () => {
    if (!canStart) return;
    socket.emit("uno:start", { sessionId: session.id, cardsPerPlayer });
  };

  if (gameStatus !== "live") {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="border-white/10 bg-[#0A0F1D]/80 backdrop-blur-2xl shadow-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-500 via-blue-500 via-green-500 to-yellow-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl md:text-3xl font-black font-outfit text-white tracking-tight">UNO BATTLE</CardTitle>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Configuration</p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Participants</h4>
                <div className="text-[10px] font-black text-primary uppercase">{players.length}/10</div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {(session?.participants || []).map((p, i) => {
                  const isPlayer = session.players.includes(p.name);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white truncate max-w-[80px]">{p.name}</span>
                        <RoleBadge role={isPlayer ? "player" : "spectator"} />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`h-8 text-[9px] uppercase font-black px-3 rounded-lg ${isPlayer ? 'text-amber-400' : 'text-emerald-400'}`}
                          onClick={() => socket.emit("session:toggle_role", { sessionId: session.id, targetName: p.name })}
                        >
                          {isPlayer ? "Spec" : "Play"}
                        </Button>
                        <div className={`w-2 h-2 rounded-full ${p.isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">Rules</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCardsPerPlayer(7)} className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${cardsPerPlayer === 7 ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/40"}`}>
                  <span className="text-lg font-black">7</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest">Cards</span>
                </button>
                <button onClick={() => setCardsPerPlayer(9)} className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${cardsPerPlayer === 9 ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/40"}`}>
                  <span className="text-lg font-black">9</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest">Cards</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={startGame} disabled={!canStart} className="w-full h-14 bg-white text-black text-base font-black uppercase tracking-widest rounded-xl">
                Launch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <UnoBoard session={session} socket={socket} />;
}

export function UnoParticipant({ session, socket, userName }: { session: SessionLike; socket: SocketLike; userName: string }) {
  const unoState = (session?.activityData || {}) as Partial<UnoState>;
  if ((unoState.status || "setup") !== "live") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12 animate-in fade-in zoom-in duration-1000">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 via-blue-500 to-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h2 className="text-3xl font-black font-outfit text-white tracking-tight mb-2 italic uppercase">Waiting for Host</h2>
        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Preparing for battle...</p>
      </div>
    );
  }
  return <UnoBoard session={session} socket={socket} userName={userName} />;
}

function UnoBoard({ session, socket, userName }: { session: SessionLike; socket: SocketLike; userName?: string }) {
  const state = (session.activityData || {}) as UnoState;
  const me = userName || session.hostName;
  const myCards = useMemo(() => state.players?.[me]?.cards || [], [state.players, me]);
  const isMyTurn = state.turn === me && state.status === "live" && !state.winner;
  const [selectedWildCardId, setSelectedWildCardId] = useState<string | null>(null);
  const [playedAnimCardId, setPlayedAnimCardId] = useState<string | null>(null);

  const playableSet = useMemo(() => {
    const ids = new Set<string>();
    for (const c of myCards) {
      if (canPlayCard(c, state.currentCard, state.currentColor)) ids.add(c.id);
    }
    return ids;
  }, [myCards, state.currentCard, state.currentColor]);

  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil(((state.turnEndsAt || 0) - nowTs) / 1000));
  const currentColorMeta = COLOR_META[(state.currentColor || "red") as UnoCard["color"]];

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const playCard = (card: UnoCard, chosenColor?: "red" | "blue" | "green" | "yellow") => {
    if (!isMyTurn || isSpectator) return;
    if (!playableSet.has(card.id)) return;
    setPlayedAnimCardId(card.id);
    setTimeout(() => {
      setPlayedAnimCardId(null);
      socket.emit("uno:play_card", { sessionId: session.id, cardId: card.id, color: chosenColor });
    }, 400);
  };

  const onCardTap = (card: UnoCard) => {
    if (card.type === "wild" || card.type === "wild4") {
      setSelectedWildCardId(card.id);
      return;
    }
    playCard(card);
  };

  const drawCard = () => {
    if (!isMyTurn || isSpectator || state.hasDrawnThisTurn) return;
    socket.emit("uno:draw_card", { sessionId: session.id });
  };

  const others = (state.order || []).filter((n) => n !== me);
  const isSpectator = session.spectators.includes(me);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-10 pb-32 relative font-outfit select-none flex flex-col gap-8 md:gap-12 min-h-screen">
      <FloatingReactions sessionId={session.id} socket={socket} />
      
      {/* Header Stats */}
      <div className="flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl transition-all ${isMyTurn ? "border-primary/50 ring-2 ring-primary/20" : ""}`}>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Active Turn</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white truncate max-w-[120px]">{state.turn}</span>
              {isMyTurn && <div className="px-2 py-0.5 rounded-md bg-primary text-black text-[9px] font-black">YOU</div>}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Time Left</p>
            <span className={`text-sm font-black ${secondsLeft < 10 ? "text-red-400 animate-pulse" : "text-white"}`}>{secondsLeft}s</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Active Color</span>
                <span className="text-[10px] font-black text-white uppercase">{state.currentColor || "WAITING"}</span>
            </div>
            <div className={`w-10 h-10 rounded-full shadow-lg border-2 border-white/20 transition-colors duration-500 ${currentColorMeta.bg.split(' ')[1]}`} />
        </div>
      </div>

      {/* Main Arena Area */}
      <div className="flex-1 relative min-h-[400px] md:min-h-[500px] rounded-[3rem] border border-white/10 bg-[#0A0D14]/40 backdrop-blur-3xl shadow-3xl overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Center Deck Area */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-12 z-30 scale-110">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Discard</p>
            <div className="relative">
              <AnimatePresence mode="wait">
                {state.currentCard && (
                  <motion.div
                    key={state.currentCard.id}
                    initial={{ opacity: 0, x: 50, y: -20, rotate: 15, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, y: 0, rotate: (state.lastEvent?.timestamp || 0) % 10 - 5, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <UnoCardFace card={state.currentCard} playable={false} compact />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Draw</p>
            <motion.button
              onPointerDown={drawCard}
              disabled={!isMyTurn || state.hasDrawnThisTurn}
              className={`relative rounded-2xl w-24 h-34 border-2 border-white/10 bg-[#1A1F2B] overflow-hidden shadow-2xl transition-all ${isMyTurn && !state.hasDrawnThisTurn ? "cursor-pointer ring-4 ring-primary/40 border-primary/50" : "grayscale opacity-40 cursor-not-allowed"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-white/10 tracking-tighter italic">COACT</span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Players Orbit */}
        {others.map((name, idx) => {
          const cardsCount = state.players?.[name]?.cards?.length || 0;
          const isTurn = name === state.turn;
          const seat = getSeatPosition(idx, others.length, isMobile);
          return (
            <motion.div
              key={name}
              className="absolute left-1/2 top-1/2 z-20"
              style={{ x: `calc(-50% + ${seat.x}vw)`, y: `calc(-50% + ${seat.y}vh)` }}
              animate={isTurn ? { scale: 1.1 } : { scale: 1 }}
            >
              <div className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl backdrop-blur-2xl border transition-all min-w-[100px] ${isTurn ? "bg-primary/10 border-primary shadow-xl" : "bg-black/40 border-white/10"}`}>
                <div className={`w-8 h-8 md:w-10 rounded-xl flex items-center justify-center text-white font-black text-lg ${isTurn ? "bg-primary text-black" : "bg-white/10"}`}>
                  {name[0].toUpperCase()}
                </div>
                <div className="text-center w-full px-2">
                  <p className="text-[10px] font-black text-white truncate w-full uppercase tracking-tight">{name}</p>
                  <p className={`text-[8px] font-bold ${isTurn ? "text-primary" : "text-white/20"}`}>{cardsCount} CARDS</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* User Hand Area - Now in Flow */}
      <div className="w-full py-12 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <div className="px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Battle Hand</span>
            <span className="text-xs font-black text-primary">{myCards.length} Cards</span>
          </div>
          
          <div className="w-full flex justify-center items-end px-10 h-52 overflow-visible">
            <div className="flex items-end perspective-1000">
              {myCards.map((card, index) => {
                const playable = isMyTurn && playableSet.has(card.id);
                const isAnimatingOut = playedAnimCardId === card.id;
                const rotation = (index - (myCards.length - 1) / 2) * Math.min(spread(myCards.length), 6);
                
                return (
                  <motion.button
                    key={card.id}
                    onPointerDown={() => onCardTap(card)}
                    disabled={!playable}
                    animate={
                      isAnimatingOut
                        ? { y: -200, opacity: 0 }
                        : { y: playable ? -15 : 0, rotate: rotation, zIndex: index }
                    }
                    whileHover={playable ? { y: -45, scale: 1.15, zIndex: 100 } : {}}
                    className={`relative transition-all duration-300 ${index > 0 ? "-ml-12 md:-ml-16" : ""} group`}
                  >
                    <UnoCardFace card={card} playable={playable} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Wild Card Color Selection Overlay */}
      <AnimatePresence>
        {selectedWildCardId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0D14] border border-white/10 rounded-[3rem] p-10 max-w-sm w-full text-center shadow-3xl"
            >
              <h3 className="text-3xl font-black text-white mb-2 italic uppercase">Choose Color</h3>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-10">Define your strategy</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(["red", "blue", "green", "yellow"] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      const card = myCards.find(c => c.id === selectedWildCardId);
                      if (card) playCard(card, color);
                      setSelectedWildCardId(null);
                    }}
                    className={`h-24 rounded-3xl bg-gradient-to-br shadow-xl hover:scale-105 transition-transform border border-white/10 flex items-center justify-center ${COLOR_META[color].bg}`}
                  >
                    <Sparkles className={`w-8 h-8 ${color === 'yellow' ? 'text-black/40' : 'text-white/40'}`} />
                  </button>
                ))}
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => setSelectedWildCardId(null)}
                className="mt-8 text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white"
              >
                Cancel Action
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.winner && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 backdrop-blur-xl">
            <WinnerFx winner={state.winner} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function spread(count: number) {
  if (count <= 1) return 0;
  return 80 / count;
}

function UnoCardFace({ card, playable, compact = false }: { card: UnoCard; playable: boolean; compact?: boolean }) {
  const meta = COLOR_META[card.color];
  const baseSize = compact ? "h-28 w-18 md:h-36 md:w-24" : "h-36 w-24 md:h-52 md:w-36";
  const label = labelForCard(card);

  return (
    <div
      className={`relative rounded-xl md:rounded-3xl border border-white/20 bg-gradient-to-br shadow-2xl overflow-hidden transition-all duration-500 ${meta.bg} ${playable ? "ring-2 ring-primary/40 border-primary/50" : "grayscale-[0.3]"} ${baseSize}`}
    >
      <div className="absolute inset-1 md:inset-3 rounded-lg md:rounded-2xl border border-white/10 flex flex-col items-center justify-center">
        <div className={`absolute top-1 left-1 md:top-2 md:left-2 text-[10px] md:text-sm font-black ${meta.text}`}>{label}</div>
        <div className={`z-10 ${meta.text} drop-shadow-lg`}>
          {card.type === "number" && <span className="text-3xl md:text-6xl font-black italic">{card.value}</span>}
          {card.type === "skip" && <Ban className="w-10 h-10 md:w-16 md:h-16" strokeWidth={3} />}
          {card.type === "reverse" && <RefreshCcw className="w-10 h-10 md:w-16 md:h-16" strokeWidth={3} />}
          {card.type === "draw2" && <span className="text-2xl md:text-5xl font-black italic">+2</span>}
          {card.type === "wild" && <Sparkles className="w-10 h-10 md:w-16 md:h-16" strokeWidth={2.5} />}
          {card.type === "wild4" && <span className="text-2xl md:text-5xl font-black italic">+4</span>}
        </div>
      </div>
    </div>
  );
}

function WinnerFx({ winner }: { winner: string }) {
  return (
    <div className="text-center animate-in zoom-in duration-500">
      <div className="w-32 h-32 bg-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-3xl mb-8 animate-bounce">
        <Sparkles className="w-16 h-16 text-black" />
      </div>
      <h2 className="text-5xl md:text-7xl font-black font-outfit text-white tracking-tighter italic mb-4 uppercase">Victory!</h2>
      <p className="text-xl md:text-2xl font-bold text-white/80 uppercase tracking-widest mb-12">{winner} Won</p>
      <Button onPointerDown={() => window.location.href = "/"} className="h-14 px-10 bg-white text-black font-black text-base uppercase tracking-widest rounded-xl">
        Lobby
      </Button>
    </div>
  );
}
