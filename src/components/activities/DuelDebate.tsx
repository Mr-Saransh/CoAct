"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, Users, Mic, MicOff, Clock, BarChart3 } from "lucide-react";

interface DuelState {
  topic: string;
  teamA: string;
  teamB: string;
  stage: 'setup' | 'opening' | 'argument' | 'rebuttal' | 'final' | 'finished';
  activeSpeaker: 'A' | 'B' | null;
  timerEnd: number | null;
  biasVotes: { [socketId: string]: 'A' | 'B' };
}

const STAGES = ['opening', 'argument', 'rebuttal', 'final', 'finished'] as const;

export function DuelDebateHost({ session, socket, updateActivity }: { session: any; socket: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const state: DuelState = {
    topic: session.activityData?.topic ?? "",
    teamA: session.activityData?.teamA ?? "Affirmative",
    teamB: session.activityData?.teamB ?? "Negative",
    stage: session.activityData?.stage ?? 'setup',
    activeSpeaker: session.activityData?.activeSpeaker ?? null,
    timerEnd: session.activityData?.timerEnd ?? null,
    biasVotes: session.activityData?.biasVotes ?? {}
  };

  const [topic, setTopic] = useState(state.topic);
  const [teamA, setTeamA] = useState(state.teamA);
  const [teamB, setTeamB] = useState(state.teamB);
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

  const setSpeaker = (speaker: 'A' | 'B' | null, seconds: number) => {
    updateActivity({
      ...state,
      activeSpeaker: speaker,
      timerEnd: seconds > 0 ? Date.now() + seconds * 1000 : null
    }, "live");
  };

  const nextStage = () => {
    const currentIndex = STAGES.indexOf(state.stage as any);
    if (currentIndex < STAGES.length - 1) {
      updateActivity({ ...state, stage: STAGES[currentIndex + 1], activeSpeaker: null, timerEnd: null }, "live");
    }
  };

  const calcBias = () => {
    const total = Object.keys(state.biasVotes || {}).length;
    if (total === 0) return { a: 50, b: 50 };
    const aVotes = Object.values(state.biasVotes).filter(v => v === 'A').length;
    return { a: Math.round((aVotes/total)*100), b: Math.round(((total-aVotes)/total)*100) };
  };
  const bias = calcBias();

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center w-full">
        <Swords className="w-12 h-12 text-white mb-6" />
        <h2 className="text-4xl font-bold mb-2 text-white">Duel Debate</h2>
        <p className="text-white/60 mb-8">Set up the competitive debate.</p>

        <Card className="w-full bg-[#0A0D14] border-white/10 rounded-2xl overflow-hidden p-8 space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/80">Debate Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., AI will replace software engineers by 2030"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-blue-400">Team A Name</label>
              <input
                type="text"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-orange-400">Team B Name</label>
              <input
                type="text"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={() => {
            if (!topic.trim() || !teamA.trim() || !teamB.trim()) return;
            updateActivity({ ...state, topic, teamA, teamB, stage: "opening" }, "live");
          }}
          disabled={!topic.trim() || !teamA.trim() || !teamB.trim()}
          className="w-full max-w-sm bg-white text-black font-bold h-12 rounded-xl mt-8 hover:bg-white/90"
        >
          Start Match
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto py-8">
      <div className="w-full text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{state.topic}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium uppercase tracking-wider">
          Stage: {state.stage}
        </div>
      </div>

      {state.timerEnd && (
        <div className={`text-5xl font-mono font-bold mb-8 ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {Math.floor(timeLeft / 60)}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 w-full mb-8">
        {/* Team A */}
        <div className={`bg-[#0A0D14] border rounded-2xl p-8 flex flex-col items-center text-center relative transition-all ${state.activeSpeaker === 'A' ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-105' : 'border-white/10 opacity-70'}`}>
          <h3 className="text-2xl font-bold mb-2">{state.teamA}</h3>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">Team A</p>

          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mb-8 relative ${state.activeSpeaker === 'A' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/10 grayscale'}`}>
            {state.activeSpeaker === 'A' ? <Mic className="w-8 h-8 text-blue-400 animate-pulse" /> : <MicOff className="w-8 h-8 text-white/20" />}
          </div>

          <div className="w-full space-y-3 mt-auto">
            <Button onClick={() => setSpeaker('A', 120)} className="w-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Assign Mic (2m)</Button>
          </div>
        </div>

        {/* Team B */}
        <div className={`bg-[#0A0D14] border rounded-2xl p-8 flex flex-col items-center text-center relative transition-all ${state.activeSpeaker === 'B' ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] scale-105' : 'border-white/10 opacity-70'}`}>
          <h3 className="text-2xl font-bold mb-2">{state.teamB}</h3>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">Team B</p>

          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mb-8 relative ${state.activeSpeaker === 'B' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10 grayscale'}`}>
            {state.activeSpeaker === 'B' ? <Mic className="w-8 h-8 text-orange-400 animate-pulse" /> : <MicOff className="w-8 h-8 text-white/20" />}
          </div>

          <div className="w-full space-y-3 mt-auto">
            <Button onClick={() => setSpeaker('B', 120)} className="w-full bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Assign Mic (2m)</Button>
          </div>
        </div>
      </div>

      <div className="w-full mb-8 bg-[#0A0D14] border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-white/60 mb-4">Live Audience Bias</p>
        <div className="flex h-6 rounded-full overflow-hidden w-full max-w-3xl mx-auto bg-white/5">
          <div style={{ width: `${bias.a}%`, transition: 'width 0.5s ease-in-out' }} className="bg-blue-500 h-full flex items-center px-2 text-[10px] font-bold text-white">{bias.a}%</div>
          <div style={{ width: `${bias.b}%`, transition: 'width 0.5s ease-in-out' }} className="bg-orange-500 h-full flex items-center justify-end px-2 text-[10px] font-bold text-white">{bias.b}%</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full flex items-center justify-between">
        <Button onClick={() => setSpeaker(null, 0)} variant="outline" className="border-white/20 text-white hover:bg-white/10">Mute Both</Button>
        {state.stage !== 'finished' && <Button onClick={nextStage} className="bg-white text-black hover:bg-white/90">Advance to Next Stage</Button>}
      </div>
    </div>
  );
}

export function DuelDebateParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const state: DuelState = {
    topic: session.activityData?.topic ?? "",
    teamA: session.activityData?.teamA ?? "Affirmative",
    teamB: session.activityData?.teamB ?? "Negative",
    stage: session.activityData?.stage ?? 'setup',
    activeSpeaker: session.activityData?.activeSpeaker ?? null,
    timerEnd: session.activityData?.timerEnd ?? null,
    biasVotes: session.activityData?.biasVotes ?? {}
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

  if (isEditing || !state.stage) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center p-6">
        <div>
          <Swords className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Match</h2>
          <p className="text-white/40">Waiting for host to configure teams.</p>
        </div>
      </div>
    );
  }

  const castVote = (team: 'A' | 'B') => {
    socket.emit("session:updateActivity", { sessionId: session.id, activityData: { ...state, biasVotes: { ...(state.biasVotes || {}), [socket.id]: team } } });
  };

  const myVote = state.biasVotes ? state.biasVotes[socket.id] : null;

  return (
    <div className="w-full max-w-md mx-auto py-8 px-4 flex flex-col h-full text-center">
      <h2 className="text-xl font-bold text-white mb-2">{state.topic}</h2>
      <p className="text-sm text-white/50 uppercase tracking-widest mb-8">Stage: {state.stage}</p>

      {state.activeSpeaker ? (
        <div className={`border rounded-2xl p-6 mb-8 ${state.activeSpeaker === 'A' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <Mic className={`w-8 h-8 mx-auto mb-4 animate-pulse ${state.activeSpeaker === 'A' ? 'text-blue-400' : 'text-orange-400'}`} />
          <p className="text-sm text-white/60 mb-1">Active Speaker</p>
          <h3 className="text-2xl font-bold text-white mb-4">{state.activeSpeaker === 'A' ? state.teamA : state.teamB}</h3>
          {state.timerEnd && (
            <div className={`text-3xl font-mono font-bold ${timeLeft < 10 ? 'text-red-400' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl p-6 mb-8 bg-[#0A0D14] opacity-50">
          <MicOff className="w-8 h-8 mx-auto mb-4 text-white/40" />
          <p className="text-sm font-bold text-white/60">Mics are muted</p>
        </div>
      )}

      <div className="mt-auto bg-[#0A0D14] border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4">Live Audience Vote</h3>
        <p className="text-xs text-white/40 mb-6">You can change your vote at any time based on the arguments.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => castVote('A')} 
            className={`h-16 rounded-xl font-bold ${myVote === 'A' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
          >
            {state.teamA}
          </Button>
          <Button 
            onClick={() => castVote('B')} 
            className={`h-16 rounded-xl font-bold ${myVote === 'B' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'}`}
          >
            {state.teamB}
          </Button>
        </div>
      </div>
    </div>
  );
}
