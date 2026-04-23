"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, Clock, Gavel, Users, AlertCircle, CheckCircle2, Crown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/providers/SocketProvider";

interface CourtroomRoles {
  judge: string | null;
  prosecution: string[];
  defense: string[];
}

interface CourtroomState {
  caseTitle: string;
  stage: 'setup' | 'roles' | 'arguments' | 'rebuttal' | 'voting' | 'verdict';
  assignedRoles: CourtroomRoles;
  activeSpeaker: 'prosecution' | 'defense' | 'judge' | null;
  timerEnd: number | null;
  votes: { [userName: string]: 'prosecution' | 'defense' };
}

export function CourtroomHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const state: CourtroomState = {
    caseTitle: session.activityData?.caseTitle ?? "",
    stage: session.activityData?.stage ?? 'setup',
    assignedRoles: session.activityData?.assignedRoles ?? { judge: null, prosecution: [], defense: [] },
    activeSpeaker: session.activityData?.activeSpeaker ?? null,
    timerEnd: session.activityData?.timerEnd ?? null,
    votes: session.activityData?.votes ?? {}
  };

  const [localTitle, setLocalTitle] = useState(state.caseTitle);
  const [timeLeft, setTimeLeft] = useState(0);

  // Get socket from provider for atomic events
  const { socket } = useSocket();

  useEffect(() => {
    if (!state.timerEnd) {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((state.timerEnd! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.timerEnd]);

  const setSpeaker = (speaker: 'prosecution' | 'defense' | 'judge' | null, seconds: number) => {
    updateActivity({
      ...state,
      activeSpeaker: speaker,
      timerEnd: seconds > 0 ? Date.now() + seconds * 1000 : null
    }, "live");
  };

  const advanceStage = (newStage: CourtroomState['stage']) => {
    updateActivity({ ...state, stage: newStage, activeSpeaker: null, timerEnd: null }, "live");
  };

  const participants = session.participants?.filter((p: any) => p.role !== 'host' && p.isConnected) || [];

  const assignRole = (targetName: string, role: 'judge' | 'prosecution' | 'defense' | 'remove') => {
    if (role === 'remove') {
      // Remove from all roles by assigning 'remove' - server handles cleanup
      // Actually we need to handle this client-side for now
      const newRoles = { ...state.assignedRoles };
      if (newRoles.judge === targetName) newRoles.judge = null;
      newRoles.prosecution = (newRoles.prosecution || []).filter(n => n !== targetName);
      newRoles.defense = (newRoles.defense || []).filter(n => n !== targetName);
      updateActivity({ ...state, assignedRoles: newRoles }, "live");
      return;
    }
    socket?.emit("courtroom:assign_role", { sessionId: session.id, targetName, role });
  };

  const getRole = (name: string): string | null => {
    if (state.assignedRoles.judge === name) return 'judge';
    if ((state.assignedRoles.prosecution || []).includes(name)) return 'prosecution';
    if ((state.assignedRoles.defense || []).includes(name)) return 'defense';
    return null;
  };

  const prosecutionMembers = participants.filter((p: any) => getRole(p.name) === 'prosecution');
  const defenseMembers = participants.filter((p: any) => getRole(p.name) === 'defense');
  const judgeName = state.assignedRoles.judge;
  const juryMembers = participants.filter((p: any) => !getRole(p.name));

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
        <Scale className="w-12 h-12 text-white mb-6" />
        <h2 className="text-4xl font-bold mb-2 text-white">Courtroom Setup</h2>
        <p className="text-white/60 mb-8">Define the case and assign roles.</p>

        <Card className="w-full bg-[#0A0D14] border-white/10 rounded-2xl overflow-hidden p-8 mb-8 text-left">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/80">Case Title / Topic</label>
              <input 
                type="text" 
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="e.g., Remote Work vs Office" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-colors" 
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={() => {
            if (!localTitle.trim()) return;
            updateActivity({ ...state, caseTitle: localTitle, stage: 'roles', assignedRoles: { judge: null, prosecution: [], defense: [] } }, "live");
          }}
          disabled={!localTitle.trim()}
          className="w-full max-w-sm bg-white text-black font-bold h-12 rounded-xl hover:bg-white/90"
        >
          Next: Assign Roles
        </Button>
      </div>
    );
  }

  // Role Assignment Phase
  if (state.stage === 'roles') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Assign Court Roles</h2>
          <p className="text-white/50 text-sm">Assign prosecution, defense, and optionally a judge. Unassigned become jury.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
          {/* Judge */}
          <div className="bg-[#0A0D14] border border-white/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Gavel className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Judge</h3>
            </div>
            {judgeName ? (
              <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm text-white font-medium">{judgeName}</span>
                </div>
                <button onClick={() => assignRole(judgeName, 'remove')} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-3">No judge assigned</p>
            )}
          </div>

          {/* Prosecution */}
          <div className="bg-[#0A0D14] border border-amber-500/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4">Prosecution</h3>
            <div className="space-y-2">
              {prosecutionMembers.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between bg-amber-500/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-white font-medium">{p.name}</span>
                  <button onClick={() => assignRole(p.name, 'remove')} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
              {prosecutionMembers.length === 0 && <p className="text-xs text-white/30 text-center py-3">No members</p>}
            </div>
          </div>

          {/* Defense */}
          <div className="bg-[#0A0D14] border border-blue-500/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Defense</h3>
            <div className="space-y-2">
              {defenseMembers.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between bg-blue-500/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-white font-medium">{p.name}</span>
                  <button onClick={() => assignRole(p.name, 'remove')} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
              {defenseMembers.length === 0 && <p className="text-xs text-white/30 text-center py-3">No members</p>}
            </div>
          </div>

          {/* Unassigned / Jury */}
          <div className="bg-[#0A0D14] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Unassigned → Jury</h3>
            <div className="space-y-2">
              {juryMembers.map((p: any) => (
                <div key={p.name} className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-sm text-white font-medium mb-2">{p.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => assignRole(p.name, 'judge')} className="text-[9px] px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20 font-bold">Judge</button>
                    <button onClick={() => assignRole(p.name, 'prosecution')} className="text-[9px] px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-bold">Prosecution</button>
                    <button onClick={() => assignRole(p.name, 'defense')} className="text-[9px] px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold">Defense</button>
                  </div>
                </div>
              ))}
              {juryMembers.length === 0 && <p className="text-xs text-white/30 text-center py-3">All assigned</p>}
            </div>
          </div>
        </div>

        <Button onClick={() => advanceStage('arguments')} className="bg-white text-black hover:bg-white/90 font-bold h-12 px-8 rounded-xl">
          Begin Court Session →
        </Button>
      </div>
    );
  }

  const renderTimer = () => {
    if (!state.timerEnd) return null;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div className={`text-4xl font-mono font-bold mb-6 ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 max-w-5xl mx-auto">
      <div className="text-center mb-10 w-full">
        <h2 className="text-3xl font-bold text-white mb-2">{state.caseTitle}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium uppercase tracking-wider">
          Stage: {state.stage}
        </div>
      </div>

      {renderTimer()}

      <div className="grid grid-cols-2 gap-8 w-full mb-10">
        <div className={`bg-[#0A0D14] border rounded-2xl p-6 text-center transition-all ${state.activeSpeaker === 'prosecution' ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-105' : 'border-white/10 opacity-70'}`}>
          <h3 className="font-bold text-sm text-amber-500/80 mb-2 uppercase tracking-widest">Prosecution</h3>
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {prosecutionMembers.map((p: any) => (
              <span key={p.name} className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300">{p.name}</span>
            ))}
          </div>
          <div className="space-y-3">
            <Button size="sm" onClick={() => setSpeaker('prosecution', 120)} className="w-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Give Floor (2m)</Button>
          </div>
        </div>

        <div className={`bg-[#0A0D14] border rounded-2xl p-6 text-center transition-all ${state.activeSpeaker === 'defense' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-105' : 'border-white/10 opacity-70'}`}>
          <h3 className="font-bold text-sm text-blue-400/80 mb-2 uppercase tracking-widest">Defense</h3>
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {defenseMembers.map((p: any) => (
              <span key={p.name} className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300">{p.name}</span>
            ))}
          </div>
          <div className="space-y-3">
            <Button size="sm" onClick={() => setSpeaker('defense', 120)} className="w-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Give Floor (2m)</Button>
          </div>
        </div>
      </div>

      {/* Host Controls */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full flex items-center justify-between">
        <Button onClick={() => setSpeaker(null, 0)} variant="outline" className="border-white/20 text-white hover:bg-white/10">Clear Floor</Button>
        <div className="flex gap-3">
          {state.stage === 'arguments' && <Button onClick={() => advanceStage('rebuttal')} className="bg-white text-black hover:bg-white/90">Move to Rebuttal</Button>}
          {state.stage === 'rebuttal' && <Button onClick={() => advanceStage('voting')} className="bg-white text-black hover:bg-white/90">Start Jury Voting</Button>}
          {state.stage === 'voting' && <Button onClick={() => advanceStage('verdict')} className="bg-white text-black hover:bg-white/90">Reveal Verdict</Button>}
        </div>
      </div>

      {state.stage === 'verdict' && (
        <div className="mt-8 w-full bg-[#0A0D14] border border-white/10 rounded-2xl p-8 text-center animate-in fade-in slide-in-from-bottom-4">
          <Gavel className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-6">Final Verdict</h3>
          <div className="flex h-8 rounded-full overflow-hidden w-full max-w-2xl mx-auto bg-white/5">
            {(() => {
              const total = Object.keys(state.votes).length;
              if (total === 0) return <div className="w-full flex items-center justify-center text-xs text-white/40">No votes cast</div>;
              const pros = Object.values(state.votes).filter(v => v === 'prosecution').length;
              const def = total - pros;
              return (
                <>
                  <div style={{ width: `${(pros/total)*100}%` }} className="bg-amber-500 h-full flex items-center justify-center text-xs font-bold text-black">{pros > 0 && `${Math.round((pros/total)*100)}%`}</div>
                  <div style={{ width: `${(def/total)*100}%` }} className="bg-blue-500 h-full flex items-center justify-center text-xs font-bold text-black">{def > 0 && `${Math.round((def/total)*100)}%`}</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export function CourtroomParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const state: CourtroomState = {
    caseTitle: session.activityData?.caseTitle ?? "",
    stage: session.activityData?.stage ?? 'setup',
    assignedRoles: session.activityData?.assignedRoles ?? { judge: null, prosecution: [], defense: [] },
    activeSpeaker: session.activityData?.activeSpeaker ?? null,
    timerEnd: session.activityData?.timerEnd ?? null,
    votes: session.activityData?.votes ?? {}
  };
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!state.timerEnd) {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((state.timerEnd! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.timerEnd]);

  if (isEditing || !state.stage || state.stage === 'setup') {
    return (
      <div className="w-full h-full flex items-center justify-center text-center p-6">
        <div>
          <Scale className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Court is Assembling</h2>
          <p className="text-white/40">Waiting for the judge to begin...</p>
        </div>
      </div>
    );
  }

  const getMyRole = (): string | null => {
    if (state.assignedRoles.judge === userName) return 'judge';
    if ((state.assignedRoles.prosecution || []).includes(userName)) return 'prosecution';
    if ((state.assignedRoles.defense || []).includes(userName)) return 'defense';
    return null;
  };

  const myRole = getMyRole();
  const isJury = !myRole;

  // Role assignment phase
  if (state.stage === 'roles') {
    return (
      <div className="w-full max-w-md mx-auto py-8 px-4 flex flex-col h-full text-center">
        <Scale className="w-10 h-10 text-white/40 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{state.caseTitle}</h2>
        <p className="text-sm text-white/50 uppercase tracking-widest mb-8">Role Assignment</p>

        <div className="bg-[#0A0D14] border border-white/10 rounded-2xl p-6 mb-4">
          <p className="text-sm text-white/50 mb-2">Your Role</p>
          <div className={`text-lg font-bold ${
            myRole === 'judge' ? 'text-white' :
            myRole === 'prosecution' ? 'text-amber-400' :
            myRole === 'defense' ? 'text-blue-400' :
            'text-white/40'
          }`}>
            {myRole === 'judge' ? 'Judge' :
             myRole === 'prosecution' ? 'Prosecution' :
             myRole === 'defense' ? 'Defense' :
             'Jury Member (default)'}
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Waiting for host</span>
          </div>
        </div>
      </div>
    );
  }

  const handleVote = (side: 'prosecution' | 'defense') => {
    socket.emit("courtroom:vote", { sessionId: session.id, userName, side });
  };

  const hasVoted = state.votes && !!state.votes[userName];
  const myVote = state.votes ? state.votes[userName] : null;

  return (
    <div className="w-full max-w-md mx-auto py-8 px-4 flex flex-col h-full">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">{state.caseTitle}</h2>
        <div className="flex items-center justify-center gap-3">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white/70 uppercase tracking-widest">{state.stage}</span>
          {myRole && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
              myRole === 'judge' ? 'bg-white/20 text-white' :
              myRole === 'prosecution' ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {myRole}
            </span>
          )}
        </div>
      </div>

      {state.timerEnd && (
        <div className="bg-[#0A0D14] border border-white/10 rounded-2xl p-6 text-center mb-8">
          <p className="text-sm text-white/50 mb-2 uppercase tracking-widest">Active Speaker</p>
          <h3 className={`text-xl font-bold mb-4 ${state.activeSpeaker === 'prosecution' ? 'text-amber-500' : 'text-blue-400'}`}>
            {state.activeSpeaker === 'prosecution' ? 'Prosecution' : 'Defense'}
          </h3>
          <div className={`text-3xl font-mono font-bold ${timeLeft < 10 ? 'text-red-400' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      )}

      {state.stage === 'voting' && isJury && (
        <div className="mt-auto bg-[#0A0D14] border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white text-center mb-6">Jury, cast your verdict:</h3>
          <div className="space-y-3">
            <Button 
              onClick={() => handleVote('prosecution')} 
              className={`w-full h-14 rounded-xl font-bold text-lg ${myVote === 'prosecution' ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'} ${hasVoted && myVote !== 'prosecution' ? 'opacity-30' : ''}`}
            >
              Favor Prosecution
            </Button>
            <Button 
              onClick={() => handleVote('defense')} 
              className={`w-full h-14 rounded-xl font-bold text-lg ${myVote === 'defense' ? 'bg-blue-500 text-black' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} ${hasVoted && myVote !== 'defense' ? 'opacity-30' : ''}`}
            >
              Favor Defense
            </Button>
          </div>
          {hasVoted && <p className="text-center text-sm text-white/50 mt-4 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Verdict recorded</p>}
        </div>
      )}

      {state.stage === 'verdict' && (
        <div className="mt-auto bg-[#0A0D14] border border-white/10 rounded-2xl p-6 text-center">
          <Gavel className="w-10 h-10 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">The Verdict is In</h3>
          <p className="text-white/60 text-sm">Look at the main screen for the final decision.</p>
        </div>
      )}
    </div>
  );
}
