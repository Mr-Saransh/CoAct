import React from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PlayerRank {
  name: string;
  score?: number | string;
  [key: string]: any;
}

interface WinnerScreenProps {
  winnerName: string;
  rankings: PlayerRank[];
  onReturnToLobby: () => void;
  isCurrentUserWinner: boolean;
  gameName?: string;
}

export function WinnerScreen({ winnerName, rankings, onReturnToLobby, isCurrentUserWinner, gameName }: WinnerScreenProps) {
  return (
    <div className="absolute inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-center p-6 overflow-hidden font-outfit select-none">
      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        {isCurrentUserWinner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, type: "spring" }}
            className="absolute top-10 w-full flex justify-center"
          >
            <PartyPopper className="w-32 h-32 text-yellow-400 opacity-20" />
          </motion.div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative z-10 w-full max-w-lg mx-auto bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl text-center"
      >
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }} 
          transition={{ 
            scale: { type: "spring", bounce: 0.6, duration: 0.6 },
            rotate: { duration: 0.6, times: [0, 0.3, 0.7, 1] }
          }}
          className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.3)] mb-6"
        >
          <Crown className="w-12 h-12 text-white" />
        </motion.div>

        <h2 className="text-sm font-black text-white/50 uppercase tracking-[0.3em] mb-2">{gameName ? `${gameName} Over` : 'Game Over'}</h2>
        
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            {isCurrentUserWinner ? "You Won!" : `${winnerName} Won!`}
          </h1>
          {isCurrentUserWinner && (
            <p className="text-primary font-bold animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Amazing performance! <Sparkles className="w-4 h-4" />
            </p>
          )}
        </div>

        <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left space-y-2 border border-white/5">
          <p className="text-xs font-black text-white/30 uppercase tracking-widest mb-3 px-2">Final Rankings</p>
          {rankings.slice(0, 5).map((player, idx) => (
            <div 
              key={player.name} 
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${idx === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : idx === 1 ? "bg-slate-300/10 border border-slate-300/20" : idx === 2 ? "bg-amber-700/10 border border-amber-700/20" : "bg-white/5 border border-transparent"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-black w-6 text-center ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-white/40"}`}>
                  #{idx + 1}
                </span>
                <span className={`font-bold ${idx === 0 ? "text-yellow-400" : "text-white"}`}>{player.name}</span>
              </div>
              {player.score !== undefined && (
                <span className="text-sm font-black text-white/60">
                  {typeof player.score === 'number' ? `${player.score} pts` : player.score}
                </span>
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={onReturnToLobby}
          className="w-full h-14 bg-white hover:bg-white/90 text-black rounded-xl font-black uppercase tracking-widest text-sm"
        >
          Return to Lobby
        </Button>
      </motion.div>
    </div>
  );
}
