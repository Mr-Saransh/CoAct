import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Link2, RotateCcw, CheckCircle2, AlertCircle, Loader2, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const validateWord = async (word: string) => {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    return res.ok;
  } catch (err) {
    console.error("Dictionary API error:", err);
    return true; // Fallback to true if API is down
  }
};

function ChainHistory({ words }: { words: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col overflow-hidden h-[300px] md:h-full">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Chain History</h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence initial={false}>
          {words.length === 0 ? (
            <p className="text-muted-foreground mt-10 text-center">No words yet.</p>
          ) : (
            words.map((w: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-4 py-2 rounded-xl flex items-center justify-between border ${idx === words.length - 1 ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5"}`}
              >
                <span className={`font-bold ${idx === words.length - 1 ? "text-primary text-lg" : "text-white"}`}>{w.word}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{w.author}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GameTimer({ endsAt, duration }: { endsAt: number; duration: number }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, endsAt - now);
      setTimeLeft(Math.ceil(diff / 1000));
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [endsAt]);

  const totalSeconds = (duration || 15000) / 1000;
  const percentage = totalSeconds > 0 ? Math.min(100, (timeLeft / totalSeconds) * 100) : 0;
  const isWarning = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="w-full max-w-xs mx-auto mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Timer className={`w-4 h-4 ${isWarning ? "text-red-500 animate-pulse" : ""}`} />
          <span className="text-xs font-bold uppercase tracking-widest">Time Remaining</span>
        </div>
        <span className={`text-xl font-black font-mono ${isWarning ? "text-red-500" : "text-white"}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div 
          initial={false}
          animate={{ 
            width: `${percentage}%`,
            backgroundColor: isWarning ? "#ef4444" : "#00D4FF"
          }}
          className="h-full shadow-[0_0_10px_rgba(0,212,255,0.5)]"
        />
      </div>
    </div>
  );
}

export function WordChainHost({ session, socket, userName }: { session: any; socket: any; userName: string; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const allPlayers = session.players || [];
  
  const activityData = session.activityData || {
    participantOrder: [],
    currentTurnIndex: 0,
    words: [] 
  };

  const [word, setWord] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleStart = () => {
    socket.emit("wordchain:start", { sessionId: session.id });
  };

  const handleReset = () => {
    socket.emit("wordchain:reset", { sessionId: session.id });
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-2xl mx-auto space-y-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 mx-auto mb-4">
          <Link2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-outfit font-bold">Word Chain</h2>
        <p className="text-muted-foreground">A fast-paced vocabulary game. You have 15 seconds to answer or you lose!</p>
        
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl mt-8">
          <CardContent className="pt-6">
            <p className="mb-6 font-medium text-lg">Players: {allPlayers.length}</p>
            <Button onClick={handleStart} disabled={allPlayers.length < 1} className="w-full bg-primary text-primary-foreground h-12 text-lg">
              <Play className="w-5 h-5 mr-2" /> Start Game
            </Button>
            {allPlayers.length === 0 && (
              <p className="text-sm text-red-400 mt-4">Need at least one player to begin.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { participantOrder = [], currentTurnIndex = 0, words = [], turnEndsAt, turnDurationMs } = activityData;
  const currentTurn = participantOrder[currentTurnIndex];
  const isMyTurn = currentTurn === userName;
  const lastWord = words.length > 0 ? words[words.length - 1].word : null;
  const lastLetter = lastWord ? lastWord[lastWord.length - 1].toLowerCase() : null;

  const submitWord = async () => {
    if (!isMyTurn || !word.trim() || isValidating) return;
    
    const trimmed = word.trim().toLowerCase();
    if (lastLetter && trimmed[0] !== lastLetter) {
      alert(`Word must start with '${lastLetter.toUpperCase()}'!`);
      return;
    }

    setIsValidating(true);
    const isValid = await validateWord(trimmed);
    setIsValidating(false);

    if (!isValid) {
      alert(`"${trimmed}" is not a valid English word!`);
      return;
    }

    socket.emit("wordchain:submit", { sessionId: session.id, userName, word: trimmed });
    setWord("");
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-5xl mx-auto w-full text-center relative">
      <div className="mb-6">
        <h2 className="text-3xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet mb-2">Word Chain</h2>
        <div className={`inline-flex items-center gap-2 border text-sm font-medium px-4 py-1.5 rounded-full ${isMyTurn ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-primary/20 border-primary/30 text-primary"}`}>
          {isMyTurn ? (
            <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Your Turn (Admin)</>
          ) : (
            <>Waiting for <strong className="text-white">{currentTurn}</strong></>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
        <ChainHistory words={words} />

        <div className="flex flex-col justify-center gap-6">
          <GameTimer endsAt={turnEndsAt} duration={turnDurationMs || 15000} />

          {lastWord && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">Current Target</p>
              <p className="text-4xl font-black text-white">{lastWord}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-muted-foreground">Next word starts with:</span>
                <span className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xl border border-primary/30">
                  {lastLetter?.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {isMyTurn && (
            <Card className="border-primary/30 bg-primary/5 backdrop-blur-xl shadow-2xl">
              <CardContent className="pt-6 space-y-4">
                <Input 
                  value={word} 
                  onChange={e => setWord(e.target.value)} 
                  placeholder="Enter a valid word..." 
                  className="h-14 text-center text-xl bg-white/5 border-white/20 focus:border-primary"
                  autoFocus
                  disabled={isValidating}
                  onKeyDown={e => e.key === 'Enter' && submitWord()}
                />
                <Button 
                  onClick={submitWord} 
                  disabled={isValidating || !word.trim()}
                  className="w-full h-12 bg-primary text-primary-foreground text-lg shadow-[0_0_20px_rgba(0,212,255,0.2)]"
                >
                  {isValidating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking...</> : "Submit Word"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-auto">
            <Button onClick={handleReset} variant="destructive" className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 h-12">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WordChainParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  const [word, setWord] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  
  const isSpectator = session.spectators.includes(userName);

  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Link2 className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">{isSpectator ? "Spectating Word Chain" : "Word Chain"}</h2>
        <p className="text-muted-foreground">{isSpectator ? "Waiting for the game to begin. Each player has 15s!" : "Waiting for host to start the game."}</p>
      </div>
    );
  }

  const { participantOrder = [], currentTurnIndex = 0, words = [], turnEndsAt, turnDurationMs } = activityData;
  const currentTurn = participantOrder[currentTurnIndex];
  const isMyTurn = currentTurn === userName;
  const lastWord = words.length > 0 ? words[words.length - 1].word : null;
  const lastLetter = lastWord ? lastWord[lastWord.length - 1].toLowerCase() : null;

  const submitWord = async () => {
    if (!isMyTurn || !word.trim() || isValidating) return;
    
    const trimmed = word.trim().toLowerCase();
    if (lastLetter && trimmed[0] !== lastLetter) {
      alert(`Word must start with '${lastLetter.toUpperCase()}'!`);
      return;
    }

    setIsValidating(true);
    const isValid = await validateWord(trimmed);
    setIsValidating(false);

    if (!isValid) {
      alert(`"${trimmed}" is not a valid English word!`);
      return;
    }

    socket.emit("wordchain:submit", { sessionId: session.id, userName, word: trimmed });
    setWord("");
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[80vh] md:h-[70vh]">
      <h2 className="text-3xl font-outfit font-bold mb-8 text-primary text-center">Word Chain</h2>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
        <ChainHistory words={words} />

        <div className="flex flex-col items-center justify-center">
          <GameTimer endsAt={turnEndsAt} duration={turnDurationMs || 15000} />

          {lastWord ? (
            <div className="mb-8 p-8 rounded-3xl bg-white/5 border border-white/10 w-full text-center">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">Last word:</p>
              <p className="text-5xl font-black text-white">{lastWord}</p>
              <p className="mt-4 text-primary font-bold text-lg">Starts with {lastLetter?.toUpperCase()}</p>
            </div>
          ) : (
            <div className="mb-8 text-center">
              <p className="text-xl text-muted-foreground">You are the first! Start with any word.</p>
            </div>
          )}

          {isMyTurn ? (
            <div className="w-full max-w-md mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-2 mx-auto">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Your Turn!
              </div>
              <Input 
                value={word} 
                onChange={e => setWord(e.target.value)} 
                placeholder="Enter a valid word..." 
                className="h-16 text-center text-2xl bg-white/5 border-white/20 focus:border-primary rounded-2xl"
                autoFocus
                disabled={isValidating}
                onKeyDown={e => e.key === 'Enter' && submitWord()}
              />
              <Button 
                onClick={submitWord} 
                disabled={isValidating || !word.trim()}
                className="w-full h-14 bg-primary text-primary-foreground text-xl font-bold rounded-2xl shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              >
                {isValidating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Validating...</> : "Submit Word"}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-xs mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-muted-foreground text-sm font-medium px-6 py-3 rounded-full">
                Waiting for <strong>{currentTurn}</strong>...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
