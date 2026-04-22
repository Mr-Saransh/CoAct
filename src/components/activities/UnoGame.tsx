"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, RefreshCcw, Sparkles } from "lucide-react";

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

const COLOR_META: Record<UnoCard["color"], { bg: string; glow: string; text: string }> = {
  red: { bg: "from-red-500 via-red-600 to-red-700", glow: "shadow-red-500/45", text: "text-white" },
  blue: { bg: "from-blue-500 via-blue-600 to-indigo-700", glow: "shadow-blue-500/45", text: "text-white" },
  green: { bg: "from-emerald-500 via-green-600 to-green-700", glow: "shadow-emerald-500/45", text: "text-white" },
  yellow: { bg: "from-yellow-300 via-yellow-400 to-amber-500", glow: "shadow-yellow-400/45", text: "text-black" },
  wild: { bg: "from-zinc-700 via-zinc-800 to-black", glow: "shadow-fuchsia-500/35", text: "text-white" },
};

function labelForCard(card: UnoCard) {
  if (card.type === "number") return `${card.value}`;
  if (card.type === "skip") return "Skip";
  if (card.type === "reverse") return "Reverse";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "Wild";
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

function cardAccent(card: UnoCard) {
  if (card.type === "wild4") return "bg-gradient-to-br from-red-500 via-yellow-400 via-emerald-400 to-blue-500";
  if (card.type === "wild") return "bg-gradient-to-br from-red-500 via-blue-500 to-emerald-500";
  if (card.type === "draw2") return "bg-gradient-to-r from-white/20 to-cyan-200/30";
  return "bg-white/10";
}

function getSeatPosition(index: number, total: number) {
  const seatSets: Record<number, Array<{ x: number; y: number }>> = {
    1: [{ x: 0, y: -43 }],
    2: [{ x: -30, y: -43 }, { x: 30, y: -43 }],
    3: [{ x: -35, y: -40 }, { x: 0, y: -45 }, { x: 35, y: -40 }],
    4: [{ x: -42, y: -35 }, { x: 42, y: -35 }, { x: -42, y: 5 }, { x: 42, y: 5 }],
    5: [{ x: -42, y: -35 }, { x: 0, y: -46 }, { x: 42, y: -35 }, { x: -42, y: 6 }, { x: 42, y: 6 }],
    6: [{ x: -42, y: -35 }, { x: 0, y: -46 }, { x: 42, y: -35 }, { x: -42, y: 5 }, { x: 42, y: 5 }, { x: 0, y: 30 }],
    7: [{ x: -44, y: -35 }, { x: -16, y: -46 }, { x: 16, y: -46 }, { x: 44, y: -35 }, { x: -44, y: 5 }, { x: 44, y: 5 }, { x: 0, y: 32 }],
    8: [{ x: -44, y: -35 }, { x: -16, y: -46 }, { x: 16, y: -46 }, { x: 44, y: -35 }, { x: -44, y: 5 }, { x: 44, y: 5 }, { x: -20, y: 32 }, { x: 20, y: 32 }],
    9: [{ x: -45, y: -35 }, { x: -22, y: -46 }, { x: 0, y: -48 }, { x: 22, y: -46 }, { x: 45, y: -35 }, { x: -45, y: 5 }, { x: 45, y: 5 }, { x: -22, y: 32 }, { x: 22, y: 32 }],
  };
  const set = seatSets[Math.min(total, 9)] || seatSets[9];
  return set[index] || { x: 0, y: 0 };
}

function RoleBadge({ role }: { role: "player" | "spectator" }) {
  return (
    <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${role === 'player' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'}`}>
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
        x: 20 + Math.random() * 60,
        y: 80 + Math.random() * 10,
      };
      setReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    };

    socket.on("session:reaction", handler);
    return () => {
      socket.off("session:reaction", handler);
    };
  }, [socket]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -400, scale: [0.5, 1.5, 1.5, 2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute text-4xl"
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
      <div className="w-full max-w-2xl mx-auto p-4 md:p-8">
        <Card className="border-white/10 bg-gradient-to-b from-[#1A2030] to-[#121826] shadow-2xl shadow-black/40">
          <CardHeader>
            <CardTitle className="text-2xl font-outfit tracking-wide">UNO Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/80">Lobby Participants</h4>
                <div className="text-[10px] font-bold text-white/40 uppercase">Max Players: {session.maxPlayers}</div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {(session?.participants || []).map((p, i) => {
                  const isPlayer = session.players.includes(p.name);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{p.name} {p.name === session.hostName && "👑"}</span>
                        <RoleBadge role={isPlayer ? "player" : "spectator"} />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {isPlayer ? (
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-8 text-[10px] uppercase font-black text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                             onClick={() => socket.emit("session:toggle_role", { sessionId: session.id, targetName: p.name })}
                           >
                             Demote
                           </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-[10px] uppercase font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                            disabled={session.players.length >= session.maxPlayers}
                            onClick={() => socket.emit("session:toggle_role", { sessionId: session.id, targetName: p.name })}
                          >
                            Promote
                          </Button>
                        )}
                        <div className={`w-2 h-2 rounded-full ${p.isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Hand Size</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={cardsPerPlayer === 7 ? "default" : "outline"}
                  onClick={() => setCardsPerPlayer(7)}
                  className="h-12 text-sm"
                >
                  7 cards
                </Button>
                <Button
                  variant={cardsPerPlayer === 9 ? "default" : "outline"}
                  onClick={() => setCardsPerPlayer(9)}
                  className="h-12 text-sm"
                >
                  9 cards
                </Button>
              </div>
            </div>
            <Button onClick={startGame} disabled={!canStart} className="w-full h-14 bg-primary text-lg font-bold">
              Start Battle
            </Button>
            {!canStart && <p className="text-xs text-red-400/80 text-center italic">Need 2-10 selected players to start.</p>}
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
      <div className="w-full max-w-md mx-auto text-center">
        <h2 className="text-2xl font-outfit font-bold mb-2">UNO is setting up</h2>
        <p className="text-muted-foreground">Host will start the game shortly.</p>
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
    const timer = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil(((state.turnEndsAt || 0) - nowTs) / 1000));
  const currentColorMeta = COLOR_META[(state.currentColor || "red") as UnoCard["color"]];

  const playCard = (card: UnoCard, chosenColor?: "red" | "blue" | "green" | "yellow") => {
    if (!isMyTurn || isSpectator) return;
    if (!playableSet.has(card.id)) return;
    setPlayedAnimCardId(card.id);
    setTimeout(() => setPlayedAnimCardId(null), 380);
    socket.emit("uno:play_card", { sessionId: session.id, cardId: card.id, color: chosenColor });
  };

  const onCardTap = (card: UnoCard) => {
    if (card.type === "wild" || card.type === "wild4") {
      setSelectedWildCardId(card.id);
      return;
    }
    playCard(card);
  };

  const drawCard = () => {
    if (!isMyTurn || isSpectator) return;
    socket.emit("uno:draw_card", { sessionId: session.id });
  };

  const others = (state.order || []).filter((n) => n !== me);
  const isSpectator = session.spectators.includes(me);

  const sendReaction = (emoji: string) => {
    socket.emit("session:reaction", { sessionId: session.id, userName: me, emoji });
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-3 md:p-5 pb-24 relative">
      <FloatingReactions sessionId={session.id} socket={socket} />
      
      {/* Spectator Overlay */}
      {isSpectator && (
        <div className="fixed top-4 right-4 z-[70]">
           <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/90 backdrop-blur-md border border-white/20 shadow-xl">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Spectating Live</span>
           </div>
        </div>
      )}

      {/* Quick Reactions Bar */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
         <div className="flex flex-col-reverse gap-2">
            {['🔥', '😂', '😲', '👏', '💔'].map(emoji => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-lg"
              >
                {emoji}
              </motion.button>
            ))}
         </div>
      </div>
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#101827] via-[#0C1321] to-[#0A101C] p-3 md:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_38%)]" />

        <div className="grid gap-2 grid-cols-2 mb-3">
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs flex justify-between">
            <span className="text-muted-foreground">Turn</span>
            <span className="font-semibold text-white truncate ml-2">{state.turn}</span>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs flex justify-between">
            <span className="text-muted-foreground">Direction</span>
            <motion.span
              animate={state.direction === "clockwise" ? { rotate: 0 } : { rotate: 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="font-semibold text-white"
            >
              ↻
            </motion.span>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs flex justify-between">
            <span className="text-muted-foreground">Color</span>
            <span className={`font-semibold capitalize ${currentColorMeta.text}`}>{state.currentColor}</span>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs flex justify-between ${isMyTurn ? "bg-primary/20 border-primary/50 text-primary" : "bg-black/30 border-white/10 text-muted-foreground"}`}>
            <span>{isMyTurn ? "Your turn" : "Waiting"}</span>
            <span className="font-semibold">{isMyTurn ? `${secondsLeft}s` : "--"}</span>
          </div>
        </div>

        <div className="relative min-h-[250px] md:min-h-[300px] rounded-2xl border border-white/10 bg-black/25 mb-4 p-3">
          <div className="absolute inset-4 rounded-full border border-white/5" />
          <div className="absolute inset-8 rounded-full border border-white/5" />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Discard</div>
            <AnimatePresence mode="wait">
              {state.currentCard && (
                <motion.div
                  key={state.currentCard.id}
                  initial={{ opacity: 0, y: -20, rotate: -8, scale: 0.84 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <UnoCardFace card={state.currentCard} playable={false} compact />
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={drawCard} disabled={!isMyTurn} className="h-10 px-6 text-sm">
              Draw
            </Button>
          </div>

          {others.map((name, idx) => {
            const cardsCount = state.players?.[name]?.cards?.length || 0;
            const isTurn = name === state.turn;
            const seat = getSeatPosition(idx, others.length);
            return (
              <motion.div
                key={name}
                className="absolute left-1/2 top-1/2 z-10"
                style={{ transform: `translate(calc(-50% + ${seat.x}%), calc(-50% + ${seat.y}%))` }}
                animate={isTurn ? { scale: [1, 1.04, 1], y: [0, -2, 0] } : { scale: 1 }}
                transition={{ duration: 1.3, repeat: isTurn ? Infinity : 0 }}
              >
                <div className={`rounded-xl px-2.5 py-2 min-w-24 border text-center bg-black/50 backdrop-blur-md ${isTurn ? "border-primary/60 shadow-[0_0_16px_rgba(139,92,246,0.45)]" : "border-white/15"}`}>
                  <p className="text-[11px] truncate text-white">{name}</p>
                  <p className="text-[10px] text-muted-foreground">{cardsCount} cards</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <Card className="border-white/10 bg-black/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Your Hand</div>
              <div className="text-[11px] text-muted-foreground">{myCards.length} cards</div>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end px-2 min-h-[150px]">
                {myCards.map((card, index) => {
                  const playable = isMyTurn && playableSet.has(card.id);
                  const isAnimatingOut = playedAnimCardId === card.id;
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      onClick={() => onCardTap(card)}
                      disabled={!playable}
                      initial={false}
                      animate={
                        isAnimatingOut
                          ? { x: 120, y: -120, scale: 0.75, opacity: 0, rotate: 14 }
                          : playable
                            ? { y: [0, -4, 0] }
                            : { y: 0 }
                      }
                      transition={{
                        duration: isAnimatingOut ? 0.35 : 1.2,
                        repeat: playable && !isAnimatingOut ? Infinity : 0,
                        ease: "easeOut",
                        delay: index * 0.015,
                      }}
                      whileTap={playable ? { scale: 1.06 } : undefined}
                      className={`touch-manipulation ${index > 0 ? "-ml-4" : ""} ${playable ? "z-10" : "z-0"} relative`}
                    >
                      <UnoCardFace card={card} playable={playable} />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {state.winner && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <WinnerFx winner={state.winner} />
        </div>
      )}

      {selectedWildCardId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xs border-white/10 bg-[#10161f]">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-center">Choose next color</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["red", "blue", "green", "yellow"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-10 rounded-md font-semibold uppercase ${c === "red" ? "bg-red-500" : ""} ${c === "blue" ? "bg-blue-500" : ""} ${c === "green" ? "bg-green-500" : ""} ${c === "yellow" ? "bg-yellow-400 text-black" : ""}`}
                    onClick={() => {
                      const card = myCards.find((x) => x.id === selectedWildCardId);
                      if (card) playCard(card, c);
                      setSelectedWildCardId(null);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSelectedWildCardId(null)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {state.currentCard && (state.currentCard.type === "draw2" || state.currentCard.type === "wild4" || state.currentCard.type === "reverse" || state.currentCard.type === "wild") && (
          <motion.div
            key={`${state.currentCard.id}-fx`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full border border-white/20 bg-black/60 backdrop-blur-md text-sm font-semibold"
          >
            {state.currentCard.type === "draw2" && "Draw Two!"}
            {state.currentCard.type === "wild4" && "Wild Draw Four!"}
            {state.currentCard.type === "reverse" && "Direction Reversed!"}
            {state.currentCard.type === "wild" && "Color Changed!"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UnoCardFace({ card, playable, compact = false }: { card: UnoCard; playable: boolean; compact?: boolean }) {
  const meta = COLOR_META[card.color];
  const baseHeight = compact ? "h-32 w-22" : "h-34 w-24";
  const textTone = meta.text;
  const special = card.type !== "number";
  const label = labelForCard(card);

  return (
    <div
      className={[
        "relative rounded-2xl border border-white/20 bg-gradient-to-br shadow-xl overflow-hidden",
        meta.bg,
        meta.glow,
        "shadow-[0_12px_24px_rgba(0,0,0,0.35)]",
        playable ? "ring-2 ring-primary/70" : "opacity-85",
        baseHeight,
      ].join(" ")}
    >
      <div className={`absolute inset-0 ${cardAccent(card)} opacity-50`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.35),transparent_40%)]" />
      <div className="absolute inset-0 border border-white/20 rounded-2xl" />

      <div className={`absolute top-1.5 left-1.5 text-xs font-black ${textTone}`}>{label}</div>
      <div className={`absolute bottom-1.5 right-1.5 text-xs font-black rotate-180 ${textTone}`}>{label}</div>

      <div className={`absolute inset-0 flex items-center justify-center ${textTone}`}>
        {card.type === "number" && <span className="text-4xl font-black drop-shadow-sm">{card.value}</span>}
        {card.type === "skip" && <Ban className="w-10 h-10" strokeWidth={2.8} />}
        {card.type === "reverse" && (
          <motion.div animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <RefreshCcw className="w-10 h-10" strokeWidth={2.8} />
          </motion.div>
        )}
        {card.type === "draw2" && <span className="text-4xl font-black drop-shadow-sm">+2</span>}
        {card.type === "wild" && <Sparkles className="w-10 h-10" strokeWidth={2.7} />}
        {card.type === "wild4" && <span className="text-4xl font-black drop-shadow-sm">+4</span>}
      </div>

      {special && <div className="absolute -inset-1 bg-white/15 blur-xl opacity-30 pointer-events-none" />}
    </div>
  );
}

function WinnerFx({ winner }: { winner: string }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 97) % 100}%`,
        color: ["#ef4444", "#3b82f6", "#10b981", "#facc15", "#8b5cf6"][i % 5],
        delay: i * 0.03,
        rotate: (i * 37) % 90,
      })),
    []
  );

  return (
    <div className="relative w-full max-w-sm">
      <Card className="border-white/10 bg-gradient-to-b from-[#1B2436] to-[#121a2c] shadow-2xl">
        <CardContent className="p-6 text-center">
          <motion.div initial={{ scale: 0.92 }} animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.3, repeat: Infinity }}>
            <h3 className="text-3xl font-black mb-2 tracking-tight">UNO!</h3>
          </motion.div>
          <p className="text-muted-foreground mb-1">Winner</p>
          <p className="text-xl font-semibold text-white mb-4">{winner}</p>
          <div className="inline-flex px-4 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-sm">Champion</div>
        </CardContent>
      </Card>

      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {confetti.map((piece) => (
          <motion.span
            key={piece.id}
            className="absolute top-0 w-1.5 h-3 rounded-sm"
            style={{ left: piece.left, backgroundColor: piece.color }}
            initial={{ y: -20, opacity: 0.9, rotate: 0 }}
            animate={{ y: 260, opacity: 0.1, rotate: piece.rotate }}
            transition={{ duration: 1.6, delay: piece.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>
    </div>
  );
}
