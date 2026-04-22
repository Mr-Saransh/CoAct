import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Link2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function WordChainHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const participants = session.participants.filter((p: any) => p.role !== "host").map((p: any) => p.name);
  
  const activityData = session.activityData || {
    participantOrder: [],
    currentTurnIndex: 0,
    words: [] // { word: "apple", author: "Alice" }
  };

  const handleStart = () => {
    updateActivity({
      participantOrder: session.players, // Use selected players
      currentTurnIndex: 0,
      words: []
    }, "live");
  };

  const nextTurn = () => {
    const nextIdx = (activityData.currentTurnIndex + 1) % activityData.participantOrder.length;
    updateActivity({
      ...activityData,
      currentTurnIndex: nextIdx
    });
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-2xl mx-auto space-y-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 mx-auto mb-4">
          <Link2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-outfit font-bold">Word Chain</h2>
        <p className="text-muted-foreground">Each player must say a word that starts with the last letter of the previous word.</p>
        
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl mt-8">
          <CardContent className="pt-6">
            <p className="mb-6 font-medium text-lg">Players: {participants.length}</p>
            <Button onClick={handleStart} disabled={participants.length === 0} className="w-full bg-primary text-primary-foreground h-12 text-lg">
              <Play className="w-5 h-5 mr-2" /> Start Game
            </Button>
            {participants.length === 0 && (
              <p className="text-sm text-red-400 mt-4">Need at least one participant to play.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { participantOrder = [], currentTurnIndex = 0, words = [] } = activityData;
  const currentTurn = participantOrder[currentTurnIndex];

  return (
    <div className="p-8 h-full flex flex-col max-w-3xl mx-auto w-full text-center relative">
      <div className="mb-10">
        <h2 className="text-3xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet mb-2">Word Chain</h2>
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
          Waiting for <strong className="text-white">{currentTurn}</strong>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-2 flex flex-col items-center">
        <AnimatePresence>
          {words.length === 0 ? (
            <p className="text-muted-foreground mt-20">No words yet. {currentTurn} goes first!</p>
          ) : (
            words.map((w: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 px-6 py-3 rounded-full flex items-center gap-4 text-lg"
              >
                <span className="font-bold text-white">{w.word}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{w.author}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-center gap-4">
        <Button onClick={nextTurn} variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10">
          Skip Turn
        </Button>
        <Button onClick={handleStart} variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/40 border-none">
          <RotateCcw className="w-4 h-4 mr-2" /> Reset
        </Button>
      </div>
    </div>
  );
}

export function WordChainParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  const [word, setWord] = useState("");
  
  const isSpectator = session.spectators.includes(userName);

  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Link2 className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">{isSpectator ? "Spectating Word Chain" : "Word Chain"}</h2>
        <p className="text-muted-foreground">{isSpectator ? "Waiting for the game to begin." : "Waiting for host to start the game."}</p>
      </div>
    );
  }

  const { participantOrder = [], currentTurnIndex = 0, words = [] } = activityData;
  const currentTurn = participantOrder[currentTurnIndex];
  const isMyTurn = currentTurn === userName;
  const lastWord = words.length > 0 ? words[words.length - 1].word : null;
  const lastLetter = lastWord ? lastWord[lastWord.length - 1].toLowerCase() : null;

  const submitWord = () => {
    if (!isMyTurn || !word.trim()) return;
    
    // Validate first letter if there is a previous word
    if (lastLetter && word.trim()[0].toLowerCase() !== lastLetter) {
      alert(`Word must start with '${lastLetter.toUpperCase()}'!`);
      return;
    }

    socket.emit("wordchain:submit", { sessionId: session.id, userName, word: word.trim() });
    setWord("");
  };

  return (
    <div className="w-full max-w-lg mx-auto text-center flex flex-col h-[70vh]">
      <h2 className="text-2xl font-outfit font-bold mb-8">Word Chain</h2>

      <div className="flex-1 flex flex-col items-center justify-center">
        {lastWord ? (
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">Last word:</p>
            <p className="text-5xl font-bold text-white">{lastWord}</p>
            <p className="mt-4 text-primary font-medium">Starts with {lastLetter?.toUpperCase()}</p>
          </div>
        ) : (
          <div className="mb-10">
            <p className="text-muted-foreground">You can start with any word!</p>
          </div>
        )}

        {isMyTurn ? (
          <div className="w-full max-w-xs mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Your Turn!
            </div>
            <Input 
              value={word} 
              onChange={e => setWord(e.target.value)} 
              placeholder="Enter a word..." 
              className="h-14 text-center text-lg bg-white/5 border-white/10"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitWord()}
            />
            <Button onClick={submitWord} className="w-full h-12 bg-primary text-primary-foreground text-lg">
              Submit
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-xs mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-muted-foreground text-sm font-medium px-4 py-2 rounded-full">
              Waiting for <strong>{currentTurn}</strong>...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
