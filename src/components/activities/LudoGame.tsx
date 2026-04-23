"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Users, Dice1 as DiceIcon, Crown, MessageSquare, Trophy, ChevronRight, Share2, Info } from "lucide-react";

// --- Types & Constants ---
type LudoColor = "red" | "blue" | "yellow" | "green";

interface LudoPlayer {
  name: string;
  color: LudoColor;
  tokens: number[]; // -1: yard, 0-51: track, 52-56: home lane
}

interface LudoState {
  status: "setup" | "live" | "finished";
  players: LudoPlayer[];
  turn: string; // playerName
  diceValue: number | null;
  phase: "roll" | "move";
  winner: string | null;
}

interface SessionLike {
  id: string;
  hostName: string;
  players: string[];
  spectators: string[];
  activityData: any;
  participants: Array<{ name: string; isConnected: boolean }>;
  maxPlayers: number;
}

interface SocketLike {
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string) => void;
}

const COLORS: LudoColor[] = ["red", "blue", "yellow", "green"];

const COLOR_CONFIG: Record<LudoColor, { 
  bg: string; 
  text: string; 
  token: string; 
  shadow: string; 
  border: string;
  gradient: string;
}> = {
  red: { 
    bg: "bg-rose-500", 
    text: "text-rose-500", 
    token: "bg-gradient-to-br from-rose-400 to-rose-600", 
    shadow: "shadow-rose-500/50",
    border: "border-rose-500/30",
    gradient: "from-rose-500/20 to-rose-500/5"
  },
  blue: { 
    bg: "bg-blue-500", 
    text: "text-blue-500", 
    token: "bg-gradient-to-br from-blue-400 to-blue-600", 
    shadow: "shadow-blue-500/50",
    border: "border-blue-500/30",
    gradient: "from-blue-500/20 to-blue-500/5"
  },
  yellow: { 
    bg: "bg-amber-400", 
    text: "text-amber-400", 
    token: "bg-gradient-to-br from-amber-300 to-amber-500", 
    shadow: "shadow-amber-500/50",
    border: "border-amber-500/30",
    gradient: "from-amber-500/20 to-amber-500/5"
  },
  green: { 
    bg: "bg-emerald-500", 
    text: "text-emerald-500", 
    token: "bg-gradient-to-br from-emerald-400 to-emerald-600", 
    shadow: "shadow-emerald-500/50",
    border: "border-emerald-500/30",
    gradient: "from-emerald-500/20 to-emerald-500/5"
  },
};

const TRACK: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_LANE: Record<LudoColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const YARD: Record<LudoColor, [number, number][]> = {
  red: [[2.325, 2.325], [2.325, 3.675], [3.675, 2.325], [3.675, 3.675]],
  blue: [[2.325, 11.325], [2.325, 12.675], [3.675, 11.325], [3.675, 12.675]],
  yellow: [[11.325, 11.325], [11.325, 12.675], [12.675, 11.325], [12.675, 12.675]],
  green: [[11.325, 2.325], [11.325, 3.675], [12.675, 2.325], [12.675, 3.675]],
};

const START_INDEX: Record<LudoColor, number> = { red: 0, blue: 13, yellow: 26, green: 39 };
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

function gridToPercent([r, c]: [number, number]) {
  return { left: `${(c / 15) * 100}%`, top: `${(r / 15) * 100}%` };
}

function progressToCell(color: LudoColor, progress: number, tokenIndex: number): [number, number] {
  if (progress < 0) return YARD[color][tokenIndex];
  if (progress <= 50) {
    const idx = (START_INDEX[color] + progress) % 52;
    return [TRACK[idx][0] + 0.5, TRACK[idx][1] + 0.5];
  }
  const [r, c] = HOME_LANE[color][Math.min(5, progress - 51)];
  return [r + 0.5, c + 0.5];
}

function validMoves(player: LudoPlayer, diceValue: number | null) {
  if (!diceValue) return [];
  const out: number[] = [];
  player.tokens.forEach((p, idx) => {
    if (p < 0 && diceValue === 6) out.push(idx);
    else if (p >= 0 && p + diceValue <= 56) out.push(idx);
  });
  return out;
}

// --- Components ---

function AnimatedToken({
  color,
  progress,
  tokenIndex,
  active,
  selectable,
  onClick
}: {
  color: LudoColor;
  progress: number;
  tokenIndex: number;
  active: boolean;
  selectable: boolean;
  onClick?: () => void;
}) {
  const tokenRef = useRef<HTMLButtonElement>(null);
  const prevProgress = useRef(progress);
  
  useEffect(() => {
    if (!tokenRef.current) return;
    
    const pos = gridToPercent(progressToCell(color, progress, tokenIndex));
    tokenRef.current.style.left = pos.left;
    tokenRef.current.style.top = pos.top;

    if (progress !== prevProgress.current) {
      const from = prevProgress.current;
      const to = progress;
      const keyframes: Keyframe[] = [];
      const path: Array<{left: string, top: string}> = [];

      if (from === -1) {
        path.push(gridToPercent(YARD[color][tokenIndex]));
        path.push(gridToPercent(progressToCell(color, 0, tokenIndex)));
      } else if (to < from) {
        path.push(gridToPercent(progressToCell(color, from, tokenIndex)));
        path.push(gridToPercent(progressToCell(color, to, tokenIndex)));
      } else {
        for (let p = from; p <= to; p++) {
          path.push(gridToPercent(progressToCell(color, p, tokenIndex)));
        }
      }

      path.forEach((p, i) => {
        keyframes.push({
          left: p.left,
          top: p.top,
          transform: 'translate(-50%, -50%) scale(1)',
          zIndex: '30',
          offset: (i / (path.length - 1 || 1))
        });
        
        if (i < path.length - 1) {
          const next = path[i+1];
          const midL = (parseFloat(p.left) + parseFloat(next.left)) / 2;
          const midT = (parseFloat(p.top) + parseFloat(next.top)) / 2;
          keyframes.push({
            left: `${midL}%`,
            top: `${midT}%`,
            transform: 'translate(-50%, -85%) scale(1.4)',
            zIndex: '40',
            offset: ((i + 0.5) / (path.length - 1))
          });
        }
      });

      tokenRef.current.animate(keyframes, {
        duration: Math.max(300, path.length * 150),
        easing: 'ease-in-out'
      }).onfinish = () => {
        if (tokenRef.current) {
          tokenRef.current.style.left = path[path.length - 1].left;
          tokenRef.current.style.top = path[path.length - 1].top;
        }
      };
      prevProgress.current = progress;
    }
  }, [progress, color, tokenIndex]);

  const config = COLOR_CONFIG[color];

  return (
    <button
      ref={tokenRef}
      type="button"
      onClick={onClick}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[5.8%] h-[5.8%] z-30 rounded-full border-2 border-white/90 ${config.token} shadow-[0_4px_10px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${selectable ? "cursor-pointer ring-[6px] ring-white/40 scale-110 shadow-[0_0_20px_white]" : "pointer-events-none"}`}
    >
      {active && (
        <div className="absolute inset-[-8px] rounded-full border-2 border-white animate-ping opacity-40" />
      )}
      {/* 3D Glassy cap */}
      <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      <div className="w-[45%] h-[45%] rounded-full bg-white/20 blur-[0.5px]" />
    </button>
  );
}

function DiceFace({ value }: { value: number }) {
  const dotConfigs: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 20], [25, 50], [25, 80], [75, 20], [75, 50], [75, 80]]
  };
  const dots = dotConfigs[value] || [];
  return (
    <div className="relative w-8 h-8 md:w-10 md:h-10">
      {dots.map(([x, y], i) => (
        <div 
          key={i}
          className="absolute w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-900 rounded-full shadow-sm animate-in fade-in zoom-in duration-300"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );
}

function Dice({
  value,
  rolling,
  disabled,
  onRoll,
}: {
  value: number | null;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
}) {
  const [displayValue, setDisplayValue] = useState(value || 1);

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      return () => clearInterval(interval);
    } else if (value) {
      setDisplayValue(value);
    }
  }, [rolling, value]);

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled}
      className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 border-white/30 bg-gradient-to-br from-white to-zinc-200 text-slate-900 shadow-xl transition-all active:scale-95 ${rolling ? "animate-bounce" : ""} ${disabled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_50%)]" />
      <div className="relative w-full h-full grid place-items-center">
        <DiceFace value={displayValue} />
      </div>
    </button>
  );
}

function RoleBadge({ role }: { role: "player" | "spectator" }) {
  return (
    <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${role === 'player' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'}`}>
      {role}
    </div>
  );
}

function FloatingReactions({ sessionId, socket }: { sessionId: string; socket: SocketLike }) {
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; userName: string; x: number; y: number }>>([]);

  useEffect(() => {
    const handler = ({ userName, emoji }: { userName: string; emoji: string }) => {
      const id = Math.random().toString(36).substr(2, 9);
      const x = 20 + Math.random() * 60;
      const y = 80;
      setReactions(prev => [...prev, { id, emoji, userName, x, y }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 4000);
    };
    socket.on("session:reaction", handler);
    return () => socket.off("session:reaction");
  }, [socket]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute flex flex-col items-center gap-1 animate-float-up"
          style={{ left: `${r.x}%`, bottom: '0%' }}
        >
          <div className="px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 text-[8px] font-black text-white uppercase tracking-tighter">
            {r.userName}
          </div>
          <span className="text-4xl md:text-5xl filter drop-shadow-lg">{r.emoji}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 1; transform: translateY(-50px) scale(1.2); }
          100% { transform: translateY(-800px) scale(1); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function Yard({ color, className }: { color: LudoColor; className?: string }) {
  const config = COLOR_CONFIG[color];
  return (
    <div className={`absolute w-[40%] h-[40%] ${config.bg} p-[4%] flex items-center justify-center ${className} shadow-[inset_0_0_40px_rgba(0,0,0,0.2)]`}>
      <div className="w-full h-full bg-white/90 rounded-[10%] shadow-xl border-[clamp(4px,1.5vw,12px)] border-black/5 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,black_1px,transparent_1px)] bg-[length:10px_10px]" />
        <div className="grid grid-cols-2 grid-rows-2 gap-[15%] w-[70%] h-[70%] relative z-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`rounded-full ${config.bg} opacity-20 shadow-inner border-2 border-black/10`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LudoTile({ r, c, players }: { r: number; c: number; players: LudoPlayer[] }) {
  // Identify if this is a track tile
  const trackIndex = TRACK.findIndex(([tr, tc]) => tr === r && tc === c);
  const isSafe = trackIndex !== -1 && SAFE_SQUARES.includes(trackIndex);
  
  // Identify home lanes
  let homeLaneColor: LudoColor | null = null;
  Object.entries(HOME_LANE).forEach(([color, cells]) => {
    if (cells.some(([hr, hc]) => hr === r && hc === c)) homeLaneColor = color as LudoColor;
  });

  // Identify starts
  let startColor: LudoColor | null = null;
  Object.entries(START_INDEX).forEach(([color, idx]) => {
    if (TRACK[idx][0] === r && TRACK[idx][1] === c) startColor = color as LudoColor;
  });

  const isHome = r >= 6 && r <= 8 && c >= 6 && c <= 8;
  const isYard = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c > 8) || (r > 8 && c < 6);

  if (isYard || isHome) return null;

  let bgColor = "bg-white";
  let opacity = "opacity-100";
  let icon = null;

  if (homeLaneColor) {
    bgColor = COLOR_CONFIG[homeLaneColor as LudoColor].bg;
  } else if (startColor) {
    bgColor = COLOR_CONFIG[startColor as LudoColor].bg;
    icon = <ChevronRight className="w-full h-full text-white/30 p-1 rotate-[-45deg]" />;
  } else if (isSafe) {
    bgColor = "bg-slate-200";
    icon = <Crown className="w-full h-full text-slate-400/50 p-1" />;
  }

  return (
    <div 
      className={`absolute w-[6.66%] h-[6.66%] border-[0.5px] border-black/10 flex items-center justify-center transition-all ${bgColor} ${opacity}`}
      style={{ top: `${(r / 15) * 100}%`, left: `${(c / 15) * 100}%` }}
    >
      {icon}
      <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.05)] pointer-events-none" />
    </div>
  );
}

export function LudoHost({ session, socket }: { session: SessionLike; socket: SocketLike }) {
  const activePlayers = session.players || [];
  const canStart = activePlayers.length >= 2 && activePlayers.length <= 4;
  const state = (session.activityData || {}) as Partial<LudoState>;

  if ((state.status || "setup") !== "live") {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="border-white/10 bg-[#0D1117] shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-blue-500 to-green-500" />
          <CardHeader>
            <CardTitle className="text-3xl font-outfit font-black text-white tracking-tight">Ludo Royale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lobby Participants</h4>
                <div className="text-[10px] font-bold text-primary uppercase">Slots: {activePlayers.length}/4</div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {session.participants.map((p, i) => {
                  const isPlayer = session.players.includes(p.name);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_CONFIG[COLORS[i % 4]].bg} shadow-lg shadow-black/20`}>
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{p.name} {p.name === session.hostName && "👑"}</span>
                        <RoleBadge role={isPlayer ? "player" : "spectator"} />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`h-8 text-[10px] uppercase font-black transition-all ${isPlayer ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                          disabled={!isPlayer && session.players.length >= session.maxPlayers}
                          onClick={() => socket.emit("session:toggle_role", { sessionId: session.id, targetName: p.name })}
                        >
                          {isPlayer ? "Demote" : "Promote"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button 
              className="w-full h-14 bg-white text-black font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-30" 
              disabled={!canStart}
              onClick={() => socket.emit("ludo:start", { sessionId: session.id })}
            >
              Start Game <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            {!canStart && <p className="text-center text-[10px] text-amber-400/80 font-black uppercase tracking-widest">Select 2-4 players to start</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <LudoBoard session={session} socket={socket} />;
}

export function LudoParticipant({ session, socket, userName }: { session: SessionLike; socket: SocketLike; userName: string }) {
  const state = (session.activityData || {}) as Partial<LudoState>;
  if ((state.status || "setup") !== "live") {
    return (
      <div className="w-full max-w-md mx-auto text-center p-12 space-y-4 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl mb-8 border-4 border-white/20">
          <DiceIcon className="w-12 h-12 text-white animate-bounce" />
        </div>
        <h2 className="text-4xl font-outfit font-black text-white tracking-tight">Game Starting!</h2>
        <p className="text-muted-foreground font-medium">The host is preparing the board. Get ready for battle!</p>
        <div className="pt-8 flex justify-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    );
  }
  return <LudoBoard session={session} socket={socket} userName={userName} />;
}

function LudoHomeCenter() {
  return (
    <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] z-10 shadow-[0_0_30px_rgba(0,0,0,0.3)] bg-[#1E293B]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 0 0 L 50 50 L 0 100 Z" fill="#f43f5e" /> {/* Red */}
        <path d="M 0 0 L 100 0 L 50 50 Z" fill="#3b82f6" /> {/* Blue */}
        <path d="M 100 0 L 100 100 L 50 50 Z" fill="#fbbf24" /> {/* Yellow */}
        <path d="M 0 100 L 100 100 L 50 50 Z" fill="#10b981" /> {/* Green */}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[40%] h-[40%] bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-2xl flex items-center justify-center">
           <Trophy className="w-[60%] h-[60%] text-white shadow-lg" />
        </div>
      </div>
    </div>
  );
}

function LudoBoard({ session, socket, userName }: { session: SessionLike; socket: SocketLike; userName?: string }) {
  const state = (session.activityData || {}) as LudoState;
  const me = userName || session.hostName;
  const mePlayer = state.players.find((p) => p.name === me);
  const isMyTurn = state.turn === me && state.status === "live" && !state.winner;
  const isSpectator = session.spectators.includes(me);
  const canRoll = isMyTurn && state.phase === "roll" && !isSpectator;
  const movable = useMemo(() => (mePlayer && !isSpectator ? validMoves(mePlayer, state.diceValue) : []), [mePlayer, state.diceValue, isSpectator]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (!canRoll || isSpectator) return;
    setRolling(true);
    setTimeout(() => setRolling(false), 700);
    socket.emit("ludo:roll_dice", { sessionId: session.id });
  };

  const moveToken = (tokenIndex: number) => {
    if (!isMyTurn || state.phase !== "move" || isSpectator) return;
    socket.emit("ludo:move_token", { sessionId: session.id, tokenIndex });
  };

  const sendReaction = (emoji: string) => {
    socket.emit("session:reaction", { sessionId: session.id, userName: me, emoji });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 py-4 flex flex-col items-center relative animate-in fade-in duration-700 font-outfit">
      <FloatingReactions sessionId={session.id} socket={socket} />
      
      {isSpectator && (
        <div className="fixed top-6 right-6 z-[70]">
           <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/90 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Spectating Live</span>
           </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 md:gap-3">
         {['🔥', '😂', '😲', '👏', '💔'].map(emoji => (
           <button
             key={emoji}
             onClick={() => sendReaction(emoji)}
             className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-xl md:text-2xl shadow-2xl hover:scale-125 transition-transform active:scale-90"
           >
             {emoji}
           </button>
         ))}
      </div>

      <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        {state.players.map((p) => {
          const isTurn = p.name === state.turn;
          return (
            <div
              key={p.name}
              className={`relative overflow-hidden rounded-xl md:rounded-2xl border-2 p-2 md:p-4 transition-all duration-500 ${isTurn ? "border-white bg-white/10 shadow-lg scale-105" : "border-white/5 bg-black/40"}`}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl ${COLOR_CONFIG[p.color].bg} flex items-center justify-center shadow-xl border-2 border-white/20`}>
                  <User className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs md:text-base font-black text-white truncate uppercase tracking-tight">{p.name}</span>
                  <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">{isTurn ? "ROLLING" : "WAIT"}</span>
                </div>
              </div>
              {isTurn && (
                <div className="absolute bottom-0 left-0 h-0.5 md:h-1 bg-white w-full overflow-hidden">
                  <div className="absolute inset-0 bg-white/50 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="relative w-full max-w-[min(94vw,640px)] aspect-square bg-slate-900 rounded-3xl p-[1%] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[8px] border-[#1E293B] overflow-hidden ring-[12px] ring-black/10">
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15">
          {Array.from({ length: 15 }).map((_, r) => 
            Array.from({ length: 15 }).map((_, c) => (
              <LudoTile key={`${r}-${c}`} r={r} c={c} players={state.players} />
            ))
          )}
        </div>

        <Yard color="red" className="left-0 top-0 rounded-br-3xl" />
        <Yard color="blue" className="right-0 top-0 rounded-bl-3xl" />
        <Yard color="yellow" className="right-0 bottom-0 rounded-tl-3xl" />
        <Yard color="green" className="left-0 bottom-0 rounded-tr-3xl" />
        
        <LudoHomeCenter />

        {state.players.map((p) => (
          p.tokens.map((val, tIdx) => (
            <AnimatedToken
              key={`${p.name}-t-${tIdx}`}
              color={p.color}
              progress={val}
              tokenIndex={tIdx}
              active={p.name === state.turn && state.phase === "move" && state.diceValue === 6 && val === -1}
              selectable={movable.includes(tIdx) && p.name === me}
              onClick={() => moveToken(tIdx)}
            />
          ))
        ))}
      </div>

      <div className="mt-12 mb-24 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
              {isMyTurn ? "YOUR TURN TO ROLL" : `${state.turn.toUpperCase()}'S TURN`}
            </p>
          </div>
          <Dice value={state.diceValue} rolling={rolling} disabled={!canRoll} onRoll={roll} />
        </div>
      </div>

      {state.winner && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="w-full max-w-sm text-center space-y-6">
              <div className="w-32 h-32 bg-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.4)] animate-bounce">
                 <Trophy className="w-16 h-16 text-black" />
              </div>
              <h2 className="text-5xl font-outfit font-black text-white tracking-tighter italic">VICTORY!</h2>
              <p className="text-2xl font-bold text-white/80 uppercase tracking-widest">{state.winner} has won</p>
              <Button onClick={() => window.location.href = "/"} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                 Return Home
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
