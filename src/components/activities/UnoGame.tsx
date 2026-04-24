"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { UnoBoard } from "./UnoBoard";
import type { SessionLike, SocketLike, UnoState } from "./uno-utils";

function RoleBadge({ role }: { role: "player" | "spectator" }) {
  return (
    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${role === 'player' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
      {role}
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
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
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
