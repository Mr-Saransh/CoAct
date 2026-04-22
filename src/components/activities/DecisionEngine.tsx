"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, Plus, CheckCircle2, ListChecks, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  text: string;
  author: string;
}

interface DecisionState {
  question: string;
  stage: 'setup' | 'gathering' | 'voting' | 'result';
  options: Option[];
  votes: { [socketId: string]: string }; // optionId
}

export function DecisionEngineHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const state: DecisionState = {
    question: session.activityData?.question ?? "",
    stage: session.activityData?.stage ?? 'setup',
    options: session.activityData?.options ?? [],
    votes: session.activityData?.votes ?? {}
  };

  const [question, setQuestion] = useState(state.question);

  const nextStage = (newStage: DecisionState['stage']) => {
    updateActivity({ ...state, stage: newStage }, "live");
  };

  const convertToTask = (optionText: string) => {
    alert(`Task Created: "${optionText}"\nThis will appear in the Study Task Tracker!`);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center w-full">
        <BrainCircuit className="w-12 h-12 text-white mb-6" />
        <h2 className="text-4xl font-bold mb-2 text-white">Decision Engine</h2>
        <p className="text-white/60 mb-8">Structure the group's decision process.</p>
        
        <Card className="w-full bg-[#0A0D14] border-white/10 rounded-2xl overflow-hidden p-8 mb-8 text-left">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/80">The Core Question</label>
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What framework should we use?" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </Card>

        <Button 
          onClick={() => {
            if (!question.trim()) return;
            updateActivity({ ...state, question, stage: "gathering" }, "live");
          }} 
          disabled={!question.trim()}
          className="w-full max-w-sm bg-white hover:bg-white/90 text-black font-bold h-12 rounded-xl"
        >
          Start Gathering Options
        </Button>
      </div>
    );
  }

  const getRankedOptions = () => {
    const counts: Record<string, number> = {};
    Object.values(state.votes).forEach(optId => {
      counts[optId] = (counts[optId] || 0) + 1;
    });
    return [...state.options].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).map(opt => ({
      ...opt,
      votes: counts[opt.id] || 0
    }));
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col py-8 px-4">
      <div className="text-center mb-10 w-full">
        <h2 className="text-3xl font-bold text-white mb-2">{state.question}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium uppercase tracking-wider">
          Stage: {state.stage}
        </div>
      </div>

      {state.stage === 'gathering' && (
        <div className="flex-1 w-full text-center">
          <p className="text-white/60 mb-8">Participants are submitting options from their devices.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {state.options.map(opt => (
              <div key={opt.id} className="bg-[#0A0D14] border border-white/10 p-4 rounded-xl text-left">
                <p className="text-white font-bold">{opt.text}</p>
                <p className="text-xs text-white/40 mt-1">Submitted by {opt.author}</p>
              </div>
            ))}
            {state.options.length === 0 && (
              <div className="sm:col-span-2 py-12 border-2 border-dashed border-white/10 rounded-xl text-white/30">
                Waiting for options...
              </div>
            )}
          </div>
        </div>
      )}

      {state.stage === 'voting' && (
        <div className="flex-1 w-full">
          <p className="text-center text-white/60 mb-8">Participants are voting on the best option.</p>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            {state.options.map(opt => (
              <div key={opt.id} className="bg-[#0A0D14] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                <span className="text-white font-bold">{opt.text}</span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold text-white/60">
                  {Object.values(state.votes).filter(v => v === opt.id).length} votes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.stage === 'result' && (
        <div className="flex-1 w-full max-w-2xl mx-auto">
          <div className="space-y-4">
            {getRankedOptions().map((opt, idx) => (
              <div key={opt.id} className={`flex items-center justify-between p-6 rounded-2xl border ${idx === 0 ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[#0A0D14] border-white/10'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-blue-500 text-black' : 'bg-white/10 text-white'}`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className={`font-bold ${idx === 0 ? 'text-blue-400 text-lg' : 'text-white'}`}>{opt.text}</h3>
                    <p className="text-sm text-white/40">{opt.votes} votes</p>
                  </div>
                </div>
                {idx === 0 && (
                  <Button onClick={() => convertToTask(opt.text)} className="bg-blue-500 text-black hover:bg-blue-600 font-bold rounded-xl">
                    Convert to Task <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 w-full flex justify-end gap-4 mt-auto">
        {state.stage === 'gathering' && (
          <Button onClick={() => nextStage('voting')} disabled={state.options.length < 2} className="bg-white text-black hover:bg-white/90 rounded-xl font-bold">
            Start Voting Phase
          </Button>
        )}
        {state.stage === 'voting' && (
          <Button onClick={() => nextStage('result')} className="bg-blue-500 text-black hover:bg-blue-600 rounded-xl font-bold">
            Show Results
          </Button>
        )}
      </div>
    </div>
  );
}

export function DecisionEngineParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const state: DecisionState = {
    question: session.activityData?.question ?? "",
    stage: session.activityData?.stage ?? 'setup',
    options: session.activityData?.options ?? [],
    votes: session.activityData?.votes ?? {}
  };
  const [suggestion, setSuggestion] = useState("");

  if (isEditing || !state.stage) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center p-6">
        <div>
          <BrainCircuit className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Engine Booting...</h2>
          <p className="text-white/40">The host is preparing the decision framework.</p>
        </div>
      </div>
    );
  }

  const submitOption = () => {
    if (!suggestion.trim()) return;
    const newOpt: Option = {
      id: Math.random().toString(36).substr(2, 9),
      text: suggestion,
      author: userName
    };
    socket.emit("session:updateActivity", { sessionId: session.id, activityData: { ...state, options: [...state.options, newOpt] } });
    setSuggestion("");
  };

  const castVote = (optId: string) => {
    socket.emit("session:updateActivity", { sessionId: session.id, activityData: { ...state, votes: { ...(state.votes || {}), [socket.id]: optId } } });
  };

  const myVote = state.votes ? state.votes[socket.id] : null;

  return (
    <div className="w-full max-w-md mx-auto text-center py-8 px-4 flex flex-col h-full">
      <h2 className="text-xl font-bold text-white mb-2">{state.question}</h2>
      <p className="text-sm text-white/50 uppercase tracking-widest mb-8">Stage: {state.stage}</p>

      {state.stage === 'gathering' && (
        <div className="bg-[#0A0D14] border border-white/10 rounded-2xl p-6 mt-auto">
          <BrainCircuit className="w-8 h-8 text-white/20 mx-auto mb-4" />
          <h3 className="font-bold text-white mb-4">Submit an Option</h3>
          <input 
            type="text" 
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Your suggestion..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-white mb-4 outline-none focus:border-white/30"
          />
          <Button 
            onClick={submitOption}
            disabled={!suggestion.trim()}
            className="w-full bg-white hover:bg-white/90 text-black font-bold h-12 rounded-xl"
          >
            Submit
          </Button>
        </div>
      )}

      {state.stage === 'voting' && (
        <div className="mt-auto text-left space-y-3">
          <p className="text-sm text-white/60 mb-4 text-center">Tap to cast your vote</p>
          {state.options.map(opt => (
            <Button 
              key={opt.id}
              onClick={() => castVote(opt.id)}
              className={`w-full h-14 justify-between px-6 rounded-xl font-bold ${myVote === opt.id ? 'bg-blue-500 text-black' : 'bg-[#0A0D14] border border-white/10 text-white hover:bg-white/5'}`}
            >
              <span>{opt.text}</span>
              {myVote === opt.id && <CheckCircle2 className="w-5 h-5" />}
            </Button>
          ))}
        </div>
      )}

      {state.stage === 'result' && (
        <div className="mt-auto bg-[#0A0D14] border border-white/10 rounded-2xl p-8 text-center">
          <Trophy className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Decision Reached</h3>
          <p className="text-white/60 text-sm">Look at the main screen for the final ranked results.</p>
        </div>
      )}
    </div>
  );
}
