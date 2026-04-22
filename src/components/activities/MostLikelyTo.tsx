import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MostLikelyHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const participants = session.participants.filter((p: any) => p.role !== "host").map((p: any) => p.name);
  
  const activityData = session.activityData || {
    prompt: "Who is most likely to survive a zombie apocalypse?",
    votes: {}, // { "VoterName": "TargetName" }
    resultsShown: false
  };

  const [prompt, setPrompt] = useState(activityData.prompt || "");

  const handleStart = () => {
    if (!prompt.trim()) return;
    updateActivity({
      prompt: prompt.trim(),
      votes: {},
      resultsShown: false,
      participants: session.players // snapshot of selected players
    }, "live");
  };

  const showResults = () => {
    updateActivity({ ...activityData, resultsShown: true });
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-2xl mx-auto space-y-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-outfit font-bold">Most Likely To</h2>
        <p className="text-muted-foreground">Ask a fun question and let everyone vote on who fits it best.</p>
        
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl mt-8">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Question Prompt</label>
              <Input 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="E.g., Who is most likely to become a billionaire?" 
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button onClick={handleStart} disabled={!prompt.trim() || participants.length < 2} className="w-full bg-primary text-primary-foreground h-12 text-lg mt-4">
              <Play className="w-5 h-5 mr-2" /> Start Round
            </Button>
            {participants.length < 2 && (
              <p className="text-sm text-red-400 mt-2">Need at least two participants to play.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { votes = {}, resultsShown = false, prompt: activePrompt = "" } = activityData;
  const voteCounts: Record<string, number> = {};
  Object.values(votes || {}).forEach((target: any) => {
    voteCounts[target] = (voteCounts[target] || 0) + 1;
  });

  const sortedTargets = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
  const totalVotes = Object.keys(votes || {}).length;

  return (
    <div className="p-8 h-full flex flex-col max-w-3xl mx-auto w-full text-center">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Voting
        </div>
        <h2 className="text-3xl md:text-5xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
          {activePrompt}
        </h2>
        <p className="text-muted-foreground mt-4">{totalVotes} votes in</p>
      </div>

      <div className="flex-1 w-full space-y-4 mt-8">
        {!resultsShown ? (
          <div className="py-20">
            <Button onClick={showResults} size="lg" className="bg-white text-black hover:bg-white/90 text-lg h-14 px-8">
              Reveal Results
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {sortedTargets.length === 0 ? (
              <p className="text-muted-foreground py-10">No votes cast.</p>
            ) : (
              sortedTargets.map(([name, count]: [string, number], index) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-between ${index === 0 ? "border-yellow-500/50 bg-yellow-500/10" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    {index === 0 && <span className="text-2xl">👑</span>}
                    <span className={`text-xl font-bold ${index === 0 ? "text-yellow-400" : "text-white"}`}>{name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-sm text-muted-foreground ml-2">votes</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/10">
        <Button onClick={() => updateActivity({ ...activityData }, "waiting")} variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10">
          New Round
        </Button>
      </div>
    </div>
  );
}

export function MostLikelyParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  
  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Getting ready...</h2>
        <p className="text-muted-foreground">The host is choosing a prompt.</p>
      </div>
    );
  }

  const { prompt: activePrompt = "", votes = {}, participants = [], resultsShown = false } = activityData;
  const isSpectator = session.spectators.includes(userName);
  const hasVoted = votes?.[userName] !== undefined;

  const submitVote = (target: string) => {
    if (hasVoted || isSpectator) return;
    socket.emit("mostlikely:vote", { sessionId: session.id, userName, target });
  };

  if (resultsShown) {
    const voteCounts: Record<string, number> = {};
    Object.values(votes || {}).forEach((t: any) => {
      voteCounts[t] = (voteCounts[t] || 0) + 1;
    });
    const winner = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-outfit font-bold mb-8 leading-tight">{activePrompt}</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <p className="text-muted-foreground mb-4 uppercase tracking-widest text-sm font-medium">Winner</p>
          {winner ? (
            <>
              <div className="text-6xl mb-4">👑</div>
              <p className="text-4xl font-bold text-yellow-400">{winner}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No one voted!</p>
          )}
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Vote cast!</h2>
        <p className="text-muted-foreground">Waiting for the host to reveal results.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <h2 className="text-2xl md:text-3xl font-outfit font-bold mb-8 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        {activePrompt}
      </h2>
      
      <div className="grid gap-3">
        {participants?.map((p: string) => (
          <Button 
            key={p}
            onClick={() => submitVote(p)}
            variant="outline"
            className="h-16 text-lg border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 hover:text-white"
          >
            {p}
          </Button>
        ))}
      </div>
    </div>
  );
}
