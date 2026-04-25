"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Sparkles, Users, PartyPopper } from "lucide-react";
import { UnoCardFace } from "./UnoCardFace";
import { WinnerScreen } from "./WinnerScreen";
import { COLOR_META, UNO_COLORS, canPlayCard, type UnoCard, type UnoState, type SessionLike, type SocketLike } from "./uno-utils";

export function UnoBoard({ session, socket, userName }: { session: SessionLike; socket: SocketLike; userName?: string }) {
  const state = (session.activityData || {}) as UnoState & { winners?: string[] };
  const me = userName || session.hostName;
  const myCards = useMemo(() => state.players?.[me]?.cards || [], [state.players, me]);
  const isMyTurn = state.turn === me && state.status === "live" && !state.winner;
  const isSpectator = session.spectators.includes(me);
  const iFinished = (state.winners || []).includes(me);
  const others = (state.order || []).filter((n) => n !== me);

  const [wildPickForId, setWildPickForId] = useState<string | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [playerWonName, setPlayerWonName] = useState<string | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const playableSet = useMemo(() => {
    const ids = new Set<string>();
    for (const c of myCards) if (canPlayCard(c, state.currentCard, state.currentColor)) ids.add(c.id);
    return ids;
  }, [myCards, state.currentCard, state.currentColor]);

  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowTs(Date.now()), 500); return () => clearInterval(t); }, []);
  const secondsLeft = Math.max(0, Math.ceil(((state.turnEndsAt || 0) - nowTs) / 1000));
  const timerPct = state.turnDurationMs ? Math.min(100, ((state.turnEndsAt || 0) - nowTs) / state.turnDurationMs * 100) : 100;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 1024); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);

  useEffect(() => { setDrawLoading(false); }, [state.turn, state.hasDrawnThisTurn]);

  useEffect(() => {
    const onWon = (d: any) => { setPlayerWonName(d.winner); setTimeout(() => setPlayerWonName(null), 4000); };
    socket.on("uno:player_won", onWon);
    return () => { socket.off("uno:player_won", onWon); };
  }, [socket]);

  const drawCard = useCallback(() => {
    if (!isMyTurn || isSpectator || drawLoading || iFinished) return;
    setDrawLoading(true);
    socket.emit("uno:draw_card", { sessionId: session.id });
    setTimeout(() => setDrawLoading(false), 3000);
  }, [isMyTurn, isSpectator, drawLoading, iFinished, socket, session.id]);

  const playCard = useCallback((card: UnoCard, chosenColor?: string) => {
    if (!isMyTurn || isSpectator || iFinished) return;
    if (!playableSet.has(card.id)) return;
    socket.emit("uno:play_card", { sessionId: session.id, cardId: card.id, color: chosenColor });
  }, [isMyTurn, isSpectator, iFinished, playableSet, socket, session.id]);

  const onCardTap = useCallback((card: UnoCard) => {
    if (!isMyTurn || isSpectator || iFinished) return;
    if (!playableSet.has(card.id)) return;
    if (card.type === "wild" || card.type === "wild4") { setWildPickForId(card.id); return; }
    playCard(card);
  }, [isMyTurn, isSpectator, iFinished, playableSet, playCard]);

  const passTurn = useCallback(() => {
    if (!isMyTurn || isSpectator || iFinished || !state.hasDrawnThisTurn) return;
    socket.emit("uno:pass", { sessionId: session.id });
  }, [isMyTurn, isSpectator, iFinished, state.hasDrawnThisTurn, socket, session.id]);

  const scrollTray = (dir: number) => { trayRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" }); };
  const currentColorMeta = COLOR_META[(state.currentColor || "red") as UnoCard["color"]];

  return (
    <div className="h-full w-full flex flex-col font-outfit select-none overflow-hidden relative" style={{ background: "linear-gradient(145deg, #080b12 0%, #0d1117 50%, #0a0e16 100%)" }}>
      {/* TOP BAR */}
      <div className="shrink-0 px-3 py-2 md:px-6 md:py-3 flex items-center justify-between gap-3 border-b border-white/5 bg-black/30 backdrop-blur-md z-30">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border transition-all ${isMyTurn ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(0,212,255,0.15)]" : "bg-white/5 border-white/10"}`}>
            <div className={`w-2 h-2 rounded-full ${isMyTurn ? "bg-primary animate-pulse" : "bg-white/30"}`} />
            <span className="text-xs md:text-sm font-black text-white truncate max-w-[80px] md:max-w-[120px]">{state.turn}</span>
            {isMyTurn && <span className="px-1.5 py-0.5 rounded bg-primary text-black text-[8px] md:text-[9px] font-black">YOU</span>}
          </div>
          <div className="relative w-8 h-8 md:w-10 md:h-10">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={secondsLeft < 5 ? "#ef4444" : "#00d4ff"} strokeWidth="3" strokeDasharray={`${timerPct * 0.94} 100`} strokeLinecap="round" className="transition-all duration-500" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-black ${secondsLeft < 5 ? "text-red-400 animate-pulse" : "text-white"}`}>{secondsLeft}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {state.direction && !isMobile && (
            <div className="flex items-center gap-1 text-[10px] text-white/30 font-bold uppercase">
              {state.direction === "clockwise" ? <RotateCcw className="w-3 h-3 scale-x-[-1]" /> : <RotateCcw className="w-3 h-3" />}
              {state.direction === "clockwise" ? "CW" : "CCW"}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white/20 ${currentColorMeta.solid}`} />
            <span className="text-[10px] font-black text-white/60 uppercase">{state.currentColor}</span>
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* Left sidebar (desktop) */}
        {!isMobile && (
          <aside className="fixed left-0 top-1/2 -translate-y-1/2 w-56 xl:w-64 z-[40] border-r border-white/5 bg-black/40 backdrop-blur-xl p-4 flex flex-col gap-3 overflow-y-auto rounded-r-3xl shadow-2xl max-h-[70vh]">
            <h3 className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Users className="w-3 h-3" /> Players</h3>
            {(state.order || []).map((name) => {
              const count = state.players?.[name]?.cards?.length || 0;
              const isTurn = name === state.turn;
              const isMe = name === me;
              const finished = (state.winners || []).includes(name);
              return (
                <div key={name} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${finished ? "bg-yellow-500/10 border-yellow-500/20" : isTurn ? "bg-primary/10 border-primary/30" : "bg-white/[0.02] border-white/5"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${finished ? "bg-yellow-400 text-black" : isTurn ? "bg-primary text-black" : "bg-white/10 text-white/60"}`}>{name[0].toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{name}{isMe ? " (You)" : ""}</p>
                    <p className={`text-[10px] font-bold ${finished ? "text-yellow-400" : isTurn ? "text-primary" : "text-white/25"}`}>{finished ? "Finished!" : `${count} cards`}</p>
                  </div>
                </div>
              );
            })}
            {(state.winners || []).length > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-[9px] font-black text-yellow-400/60 uppercase tracking-wider mb-2">Finished</p>
                {(state.winners || []).map((w, i) => <p key={w} className="text-[10px] text-yellow-400 font-bold">#{i+1} {w}</p>)}
              </div>
            )}
          </aside>
        )}

        {/* Center board */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {isMobile && (
            <div className="shrink-0 px-3 py-2 flex gap-2 overflow-x-auto border-b border-white/5 bg-black/20">
              {(state.order || []).map((name) => {
                const count = state.players?.[name]?.cards?.length || 0;
                const isTurn = name === state.turn;
                return (
                  <div key={name} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 text-[10px] ${isTurn ? "bg-primary/15 border-primary/30 text-white" : "bg-white/5 border-white/5 text-white/40"}`}>
                    <span className="font-black truncate max-w-[60px]">{name === me ? "You" : name}</span>
                    <span className={`font-bold ${isTurn ? "text-primary" : "text-white/20"}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center relative p-4 overflow-hidden">
            <div className="flex items-center justify-center gap-8 sm:gap-16 z-10 w-full max-w-md mx-auto">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Discard</span>
                <AnimatePresence mode="wait">
                  {state.currentCard && (
                    <motion.div key={state.currentCard.id} initial={{ opacity: 0, scale: 0.8, rotate: 15 }} animate={{ opacity: 1, scale: 1, rotate: (state.lastEvent?.timestamp || 0) % 8 - 4 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", damping: 20 }}>
                      <UnoCardFace card={state.currentCard} playable={false} compact />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Draw</span>
                <button 
                  onClick={drawCard} 
                  disabled={!isMyTurn || drawLoading || iFinished} 
                  className={`relative rounded-2xl h-28 w-[4.5rem] border-2 overflow-hidden transition-all ${isMyTurn && !drawLoading && !iFinished ? "border-primary/50 cursor-pointer shadow-[0_0_25px_rgba(0,212,255,0.2)] hover:shadow-[0_0_35px_rgba(0,212,255,0.3)] active:scale-95" : "border-white/10 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0d1117]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {drawLoading ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <span className="text-[10px] font-black text-white/10 italic tracking-tighter">COACT</span>
                    )}
                  </div>
                  {isMyTurn && !drawLoading && !iFinished && (
                    <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card tray */}
          {!isSpectator && !iFinished && (
            <>
              <div className="shrink-0 px-4 py-1.5 flex items-center justify-between border-t border-white/5 bg-black/30">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">Your Hand</span>
                  <span className="text-xs font-black text-primary">{myCards.length}</span>
                </div>
                {isMyTurn && !state.hasDrawnThisTurn && <span className="text-[10px] text-primary font-bold animate-pulse">Tap a card to play</span>}
                {isMyTurn && state.hasDrawnThisTurn && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-yellow-400 font-bold animate-pulse">Play drawn card or pass</span>
                    <button 
                      onClick={passTurn} 
                      className="bg-red-500/80 hover:bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-md border border-red-400/30 transition-all uppercase tracking-wider"
                    >
                      Pass Turn
                    </button>
                  </div>
                )}
              </div>
              <div className="shrink-0 relative border-t border-white/5 bg-[#080b11]/90 backdrop-blur-md">
                {!isMobile && myCards.length > 6 && (
                  <>
                    <button onClick={() => scrollTray(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-14 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10"><ChevronLeft className="w-4 h-4 text-white/60" /></button>
                    <button onClick={() => scrollTray(1)} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-14 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10"><ChevronRight className="w-4 h-4 text-white/60" /></button>
                  </>
                )}
                <div 
                  ref={trayRef} 
                  className="flex items-end gap-3 px-6 py-6 overflow-x-auto scroll-smooth scrollbar-hide w-screen max-w-full" 
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                >
                  {myCards.map((card) => {
                    const playable = isMyTurn && playableSet.has(card.id);
                    return (
                      <motion.button key={card.id} onClick={() => onCardTap(card)} disabled={!playable}
                        whileHover={playable ? { y: -20, scale: 1.1, zIndex: 50, x: isMobile ? 5 : 0 } : {}} 
                        whileTap={playable ? { scale: 0.95 } : {}}
                        className={`shrink-0 transition-all duration-200 relative ${!playable ? "cursor-not-allowed" : "cursor-pointer"} ${isMobile ? "hover:z-50" : ""}`}
                        style={{ zIndex: 10 }}
                      >
                        <UnoCardFace card={card} playable={playable} compact={isMobile} />
                      </motion.button>
                    );
                  })}
                  {myCards.length === 0 && <div className="text-white/20 text-xs font-bold py-8 w-full text-center">No cards</div>}
                </div>
              </div>
            </>
          )}
          {(isSpectator || iFinished) && (
            <div className="shrink-0 px-4 py-6 text-center border-t border-white/5 bg-black/30">
              <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{iFinished ? "You finished! Watching remaining players..." : "Spectating"}</span>
            </div>
          )}
        </div>

        {/* Right sidebar (desktop) */}
        {!isMobile && (
          <aside className="fixed right-0 top-1/2 -translate-y-1/2 w-56 xl:w-64 z-[40] border-l border-white/5 bg-black/40 backdrop-blur-xl p-4 flex flex-col gap-3 rounded-l-3xl shadow-2xl max-h-[70vh]">
            <h3 className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em] mb-1">Game Info</h3>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex justify-between text-[10px]"><span className="text-white/30 font-bold">Direction</span><span className="text-white/60 font-bold uppercase">{state.direction || "—"}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-white/30 font-bold">Players Left</span><span className="text-white/60 font-bold">{state.order?.length || 0}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-white/30 font-bold">Your Cards</span><span className="text-primary font-bold">{myCards.length}</span></div>
            </div>
            {isMyTurn && <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center"><p className="text-[10px] font-black text-primary uppercase tracking-wider">Your Turn!</p><p className="text-[9px] text-white/30 mt-1">Tap a card or draw</p></div>}
          </aside>
        )}
      </div>

      {/* Player won celebration */}
      <AnimatePresence>
        {playerWonName && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] px-8 py-4 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-3">
            <PartyPopper className="w-8 h-8 text-yellow-400 animate-bounce" />
            <div><p className="text-lg font-black text-yellow-400">{playerWonName} finished!</p><p className="text-xs text-white/50">Game continues for remaining players</p></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wild color picker */}
      <AnimatePresence>
        {wildPickForId && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl">
              <h3 className="text-2xl font-black text-white mb-1 uppercase">Choose Color</h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-8">Pick your strategy</p>
              <div className="grid grid-cols-2 gap-3">
                {UNO_COLORS.map((color) => (
                  <button key={color} onClick={() => { const c = myCards.find(x => x.id === wildPickForId); if (c) playCard(c, color); setWildPickForId(null); }}
                    className={`h-20 rounded-2xl bg-gradient-to-br shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10 flex items-center justify-center ${COLOR_META[color].bg}`}>
                    <Sparkles className={`w-6 h-6 ${color === "yellow" ? "text-black/30" : "text-white/30"}`} />
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setWildPickForId(null)} className="mt-6 text-white/30 font-bold uppercase text-[10px] tracking-wider hover:text-white">Cancel</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game over */}
      {state.winner && (
        <WinnerScreen 
          winnerName={state.winner || ""}
          rankings={(state.winners || []).map(w => ({ name: w }))}
          onReturnToLobby={() => window.location.href = "/"}
          isCurrentUserWinner={state.winner === me}
          gameName="UNO"
        />
      )}
    </div>
  );
}
