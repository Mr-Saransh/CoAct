"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserSearch, Crown, Scroll, Trophy, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RMCSProps {
  session: any;
  socket: any;
  userName: string;
  isHost: boolean;
}

export default function RMCSGame({ session, socket, userName, isHost }: RMCSProps) {
  const data = session.activityData;
  const participantCount = session.participants.filter((p: any) => p.isConnected && session.players.includes(p.name)).length;

  if (!data || !data.players) {
    if (isHost) {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto space-y-8 p-6">
          <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_50px_rgba(0,212,255,0.2)]">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">RMCS Setup</h2>
            <p className="text-white/40 text-sm font-medium">This classic game requires exactly 4 players. Roles will be assigned secretly.</p>
            <p className={`text-xs font-bold uppercase ${participantCount === 4 ? 'text-green-500' : 'text-red-500'}`}>
              Current Players: {participantCount} / 4
            </p>
          </div>
          <Button 
            disabled={participantCount !== 4}
            onClick={() => socket.emit('rmcs:start', { sessionId: session.id })}
            className="w-full h-16 rounded-2xl text-xl font-black uppercase italic tracking-tight shadow-[0_0_30px_rgba(0,212,255,0.4)]"
          >
            Start Activity
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-white/40 font-bold uppercase tracking-widest animate-pulse">Waiting for host to start...</p>
        </div>
      </div>
    );
  }

  const myPlayer = data.players.find((p: any) => p.name === userName);
  const isSipahi = myPlayer?.role === 'Sipahi';
  const isGuessing = data.phase === 'guessing';
  const isReveal = data.phase === 'reveal';
  const isAssignment = data.phase === 'assignment';

  const handleGuess = (targetName: string) => {
    socket.emit('rmcs:guess', { sessionId: session.id, guessName: targetName });
  };

  const handleNextRound = () => {
    socket.emit('rmcs:next_round', { sessionId: session.id });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Raja': return <Crown className="w-12 h-12 text-yellow-500" />;
      case 'Mantri': return <Scroll className="w-12 h-12 text-blue-400" />;
      case 'Chor': return <AlertCircle className="w-12 h-12 text-red-500" />;
      case 'Sipahi': return <Shield className="w-12 h-12 text-emerald-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Round Info */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-black text-primary">{data.round}</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">Round {data.round} of {data.totalRounds}</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{data.phase} Phase</p>
          </div>
        </div>
        <div className="flex gap-2">
          {data.players.map((p: any) => (
            <div key={p.name} className="w-2 h-2 rounded-full bg-primary/20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Private Role Section */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Your Secret Role</p>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={myPlayer?.role}
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                className="w-48 h-64 bg-white/5 rounded-3xl border border-white/20 flex flex-col items-center justify-center space-y-4 shadow-xl"
              >
                {getRoleIcon(myPlayer?.role)}
                <h3 className="text-3xl font-black text-white italic">{myPlayer?.role}</h3>
              </motion.div>
            </AnimatePresence>

            <div className="space-y-2">
              <p className="text-sm text-white/60 font-medium">
                {myPlayer?.role === 'Raja' && "You are the King! Relax and watch the investigation."}
                {myPlayer?.role === 'Mantri' && "You are the Minister. Your wisdom is legendary."}
                {myPlayer?.role === 'Chor' && "You are the Thief! Stay calm and hope you aren't caught."}
                {myPlayer?.role === 'Sipahi' && "You are the Soldier! Identify the thief to win points."}
              </p>
            </div>
          </motion.div>

          {isSipahi && isAssignment && (
            <Button 
              className="w-full h-16 rounded-2xl text-lg font-black uppercase italic tracking-tighter"
              onClick={() => socket.emit('rmcs:phase_guess', { sessionId: session.id })}
              disabled={!isHost}
            >
              Start Investigation
            </Button>
          )}
        </div>

        {/* Action / Reveal Section */}
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10 rounded-3xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <UserSearch className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Investigation Board</h4>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {isAssignment && (
                <div className="text-center space-y-4">
                  <Users className="w-12 h-12 text-white/10 mx-auto" />
                  <p className="text-white/40 font-medium">Wait for everyone to see their roles...</p>
                  {isHost && (
                    <Button onClick={() => socket.emit('rmcs:update_phase', { sessionId: session.id, phase: 'guessing' })}>
                      Start Guessing
                    </Button>
                  )}
                </div>
              )}

              {isGuessing && (
                <div className="space-y-4">
                  {isSipahi ? (
                    <>
                      <p className="text-center text-primary font-bold animate-pulse mb-6">Soldier! Who is the Thief?</p>
                      <div className="grid grid-cols-1 gap-3">
                        {data.players.filter((p: any) => p.name !== userName).map((p: any) => (
                          <Button 
                            key={p.name}
                            variant="outline"
                            className="h-14 rounded-xl border-white/10 bg-white/5 text-white hover:bg-primary/20 hover:border-primary/40 text-lg font-bold"
                            onClick={() => handleGuess(p.name)}
                          >
                            Is it {p.name}?
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
                      <p className="text-white font-bold">{data.players.find((p: any) => p.role === 'Sipahi')?.name} is investigating...</p>
                    </div>
                  )}
                </div>
              )}

              {isReveal && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className={`text-4xl font-black italic uppercase ${data.lastGuess?.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {data.lastGuess?.isCorrect ? 'Caught!' : 'Thief Escaped!'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {data.players.map((p: any) => (
                      <div key={p.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                        <p className="text-[10px] font-black text-white/40 uppercase mb-1">{p.name}</p>
                        <p className="text-lg font-black text-white">{p.role}</p>
                        <div className="inline-flex items-center rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs font-bold mt-1">
                          +{p.currentRoundScore}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isHost && (
                    <Button onClick={handleNextRound} className="w-full h-14 rounded-xl text-lg font-bold">
                      {data.round >= data.totalRounds ? "View Final Results" : "Next Round"}
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Leaderboard Overlay / Bottom Section */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h4 className="text-sm font-black text-white uppercase tracking-widest">Total Standings</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
            <div key={p.name} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-sm font-bold text-white truncate mr-2">{p.name}</span>
              <span className="text-lg font-black text-primary">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
