"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Music, Trophy, Users, User, ArrowRight, Timer, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSocket } from '@/components/providers/SocketProvider';

interface AntakshariProps {
  session: any;
  socket: any;
  userName: string;
  isHost: boolean;
}

const PlayerIndicator = React.memo(({ p, isActive, angle, team }: { p: any; isActive: boolean; angle: number; team: string | null }) => {
  const x = 50 + 40 * Math.cos(angle);
  const y = 50 + 40 * Math.sin(angle);

  return (
    <div 
      className="absolute transition-all duration-700 ease-out will-change-transform" 
      style={{ 
        left: `${x}%`, 
        top: `${y}%`, 
        transform: `translate3d(-50%, -50%, 0) scale(${isActive ? 1.25 : 1})`,
        opacity: isActive ? 1 : 0.6
      }}
    >
      <div className="relative flex flex-col items-center gap-3">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-primary border-white shadow-[0_0_30px_rgba(0,212,255,0.6)] rotate-3' : 'bg-white/5 border-white/10'}`}>
          <span className="text-2xl font-black text-white">{p.name[0].toUpperCase()}</span>
          {isActive && <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full animate-bounce shadow-lg"><Mic className="w-3 h-3" /></div>}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{p.name}</p>
          <p className="text-xs font-bold text-primary">{p.score} pts</p>
        </div>
        {team && <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${team === 'A' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>Team {team}</div>}
      </div>
    </div>
  );
});

export default function Antakshari({ session, socket: propSocket, userName, isHost }: AntakshariProps) {
  const { socket: hookSocket, isConnected: isSocketConnected } = useSocket();
  const socket = hookSocket || propSocket;
  const [latency, setLatency] = useState<number | null>(null);

  const data = session.activityData;
  const [gameMode, setGameMode] = useState<'solo' | 'teams'>('solo');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const recognitionRef = useRef<any>(null);

  // Connectivity monitoring
  useEffect(() => {
    if (socket) {
      console.log(`[antakshari] component mounted. Connected: ${isSocketConnected}, SocketID: ${socket.id}`);
      if (typeof window !== 'undefined') (window as any)._debug_socket = socket;

      const pingInterval = setInterval(() => {
        const start = Date.now();
        socket.emit('antakshari:ping');
        socket.once('antakshari:pong', () => setLatency(Date.now() - start));
      }, 5000);

      return () => clearInterval(pingInterval);
    }
  }, [socket, isSocketConnected]);

  // Turn Timer Logic
  useEffect(() => {
    if (data?.phase === 'singing' && data?.players?.length > 0) {
      setTimeLeft(15);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (isHost) socket.emit('antakshari:fail', { sessionId: session.id });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [data?.turnIndex, data?.phase, isHost, session.id, socket]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          setTranscript(text);
          
          const currentP = data?.players?.[data?.turnIndex];
          if (currentP?.name === userName) {
            const lastChar = text.charAt(text.length - 1).toUpperCase();
            socket.emit('antakshari:submit', { 
              sessionId: session.id, 
              text: text, 
              nextLetter: lastChar 
            });
          }
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [userName, data?.turnIndex, data?.players, session.id, socket]);

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const participants = session.participants.filter((p: any) => p.isConnected && session.players.includes(p.name));
  const teams = data?.teams || { A: [], B: [], solo: [] };
  const myTeam = teams.A.includes(userName) ? 'A' : (teams.B.includes(userName) ? 'B' : (teams.solo.includes(userName) ? 'solo' : null));

  // RENDER SETUP VIEW
  if (!data || !data.players || data.players.length === 0) {
    if (isHost) {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-8 p-6">
          <div className="text-center space-y-2 relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isSocketConnected ? `Connected ${latency ? `(${latency}ms)` : ''}` : 'Disconnected'}
              </span>
            </div>
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Antakshari Arena</h2>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Organize Teams</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Card onClick={() => setGameMode('solo')} className={`p-6 cursor-pointer border-2 transition-all ${gameMode === 'solo' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <User className="w-8 h-8 mb-4 text-primary" /><h3 className="font-bold text-white">Solo Mode</h3>
            </Card>
            <Card onClick={() => setGameMode('teams')} className={`p-6 cursor-pointer border-2 transition-all ${gameMode === 'teams' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
              <Users className="w-8 h-8 mb-4 text-primary" /><h3 className="font-bold text-white">2 Teams</h3>
            </Card>
          </div>

          {gameMode === 'teams' && (
            <div className="w-full grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 w-full py-1 text-xs font-bold uppercase tracking-widest border border-blue-500/20">TEAM A</div>
                <div className="bg-white/5 rounded-xl p-3 min-h-[100px] border border-white/10 space-y-2">
                  {teams.A.map((n: string) => <div key={n} className="text-xs text-white font-bold flex justify-between items-center bg-blue-500/10 p-2 rounded-lg border border-blue-500/20"><span>{n}</span><Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'solo', targetName: n })}>×</Button></div>)}
                </div>
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400 w-full py-1 text-xs font-bold uppercase tracking-widest border border-purple-500/20">TEAM B</div>
                <div className="bg-white/5 rounded-xl p-3 min-h-[100px] border border-white/10 space-y-2">
                  {teams.B.map((n: string) => <div key={n} className="text-xs text-white font-bold flex justify-between items-center bg-purple-500/10 p-2 rounded-lg border border-purple-500/20"><span>{n}</span><Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'solo', targetName: n })}>×</Button></div>)}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="text-[10px] uppercase font-black text-white/20 text-center">Unassigned</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {participants.filter((p:any) => !teams.A.includes(p.name) && !teams.B.includes(p.name)).map((p:any) => (
                    <div key={p.name} className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      <span className="text-xs font-bold text-white/60">{p.name}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 text-blue-400" onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'A', targetName: p.name })}>A</Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 text-purple-400" onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'B', targetName: p.name })}>B</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button onClick={() => socket.emit('antakshari:start', { sessionId: session.id, gameMode })} className="w-full h-16 rounded-2xl text-xl font-black uppercase italic shadow-[0_0_30px_rgba(0,212,255,0.3)]">Launch Arena</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto space-y-8 p-6 text-center">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" /><h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Prepare to Sing!</h2>
        <div className="grid grid-cols-2 gap-4 w-full">
           <Button variant={myTeam === 'A' ? "default" : "outline"} onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'A' })} className={myTeam === 'A' ? 'bg-blue-600' : ''}>Join Team A</Button>
           <Button variant={myTeam === 'B' ? "default" : "outline"} onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'B' })} className={myTeam === 'B' ? 'bg-purple-600' : ''}>Join Team B</Button>
           <Button variant={myTeam === 'solo' ? "default" : "outline"} onClick={() => socket.emit('antakshari:join_team', { sessionId: session.id, team: 'solo' })} className="col-span-2">Play Solo</Button>
        </div>
      </div>
    );
  }

  // RENDER LIVE GAME
  const currentPlayer = data.players[data.turnIndex];
  const isMyTurn = currentPlayer?.name === userName;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 space-y-8">
      {/* Header with Letter & Timer */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.4)] animate-pulse">
            <span className="text-5xl font-black text-white">{data.currentLetter}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Sing a Song with "{data.currentLetter}"</h2>
            <div className="flex items-center gap-2 text-white/40 text-sm font-bold uppercase tracking-widest mt-1">
              <Users className="w-4 h-4" />
              <span>{data.gameMode} Mode • {data.history.length} Songs Sang</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className={`text-4xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-primary'}`}>
             {timeLeft}s
           </div>
           <div className="flex gap-1">
             {[...Array(3)].map((_, i) => (
               <div key={i} className={`w-8 h-1.5 rounded-full ${timeLeft > (i * 5) ? 'bg-primary' : 'bg-white/10'}`} />
             ))}
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center justify-center py-12 relative min-h-[400px]">
        {/* Participants Circular Layout */}
        <div className="lg:col-span-2 relative aspect-square max-h-[500px] mx-auto w-full">
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center relative">
                 <div className="absolute inset-0 bg-primary/10 rounded-full blur-[80px] animate-pulse" />
                 <Music className="w-16 h-16 text-primary/40" />
                 <AnimatePresence mode="wait">
                    <motion.div key={data.turnIndex} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }} className="absolute -top-16 text-center w-full">
                       <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-2">Currently Singing</p>
                       <p className="text-3xl font-black text-white italic uppercase tracking-tighter shadow-xl">{currentPlayer.name}</p>
                    </motion.div>
                 </AnimatePresence>
              </div>
           </div>
           
           {data.players.map((p: any, idx: number) => {
              const angle = (idx / data.players.length) * 2 * Math.PI - Math.PI / 2;
              return (
                <PlayerIndicator 
                  key={p.name} 
                  p={p} 
                  isActive={data.turnIndex === idx} 
                  angle={angle} 
                  team={p.team} 
                />
              );
           })}
        </div>

        {/* Input / History Section */}
        <div className="space-y-6 flex flex-col h-full">
           <Card className="flex-1 bg-white/5 border-white/10 rounded-3xl p-6 flex flex-col overflow-hidden backdrop-blur-md">
              <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <RefreshCw className="w-4 h-4" /> History
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                 {data.history.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                      <Music className="w-12 h-12" />
                      <p className="text-xs font-bold uppercase">No songs sang yet.<br/>The stage is yours!</p>
                   </div>
                 ) : (
                   data.history.map((h: any, i: number) => (
                     <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-primary uppercase">{h.author}</span>
                           <span className="text-[10px] font-bold text-white/20">Next: {h.letter}</span>
                        </div>
                        <p className="text-sm text-white font-medium leading-relaxed italic">"{h.text}"</p>
                     </div>
                   ))
                 )}
              </div>
           </Card>

           <div className="space-y-4">
              {isMyTurn ? (
                <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                   <div className="bg-primary/20 border-2 border-primary/40 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_40px_rgba(0,212,255,0.2)]">
                      <div className="flex justify-center">
                         <div className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${isListening ? 'bg-red-500 animate-pulse scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-primary hover:scale-105'}`} onClick={toggleListening}>
                            {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                         </div>
                      </div>
                      <div className="space-y-1">
                         <p className="text-white font-black uppercase tracking-widest italic">SING NOW!</p>
                         <p className="text-xs text-white/60 font-medium">Listening for your song...</p>
                      </div>
                   </div>
                   {transcript && (
                     <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                        <p className="text-xs text-white/40 font-black uppercase tracking-widest mb-1">Transcript</p>
                        <p className="text-sm text-white italic font-medium">"{transcript}"</p>
                     </div>
                   )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-2 opacity-50 grayscale transition-all duration-700">
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Next Player</p>
                   <p className="text-lg font-black text-white uppercase italic">Waiting for {currentPlayer.name}...</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
