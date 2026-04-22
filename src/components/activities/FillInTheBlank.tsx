import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, CheckCircle2, XCircle, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FITBHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {
    prompt: "The capital of France is [blank].",
    correctAnswer: "Paris",
    responses: {} // { userName: "answer" }
  };

  const [prompt, setPrompt] = useState(activityData.prompt || "");
  const [correctAnswer, setCorrectAnswer] = useState(activityData.correctAnswer || "");

  const handlePublish = () => {
    if (!prompt.includes("[blank]") || !correctAnswer.trim()) return;
    updateActivity({
      prompt: prompt.trim(),
      correctAnswer: correctAnswer.trim(),
      responses: {}
    }, "live");
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-outfit font-bold">Fill in the Blank</h2>
          <p className="text-muted-foreground">Type a sentence and use <code className="text-primary">[blank]</code> where the missing word goes.</p>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sentence</label>
              <Input 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="E.g., The first person to walk on the moon was [blank]." 
                className="bg-white/5 border-white/10"
              />
              {!prompt.includes("[blank]") && prompt.length > 0 && (
                <p className="text-xs text-red-400">Please include "[blank]" in your sentence.</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Correct Answer</label>
              <Input 
                value={correctAnswer} 
                onChange={e => setCorrectAnswer(e.target.value)} 
                placeholder="Neil Armstrong" 
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <Button 
              onClick={handlePublish} 
              disabled={!prompt.includes("[blank]") || !correctAnswer.trim()} 
              className="w-full bg-primary text-primary-foreground mt-4"
            >
              <Play className="w-4 h-4 mr-2" /> Publish Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { responses = {}, prompt: activePrompt = "", correctAnswer: activeCorrect = "" } = activityData;
  const parts = activePrompt.split("[blank]");

  return (
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Awaiting Answers
        </div>
        <h2 className="text-3xl md:text-5xl font-outfit font-bold leading-tight">
          {parts[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">_____</span>{parts[1]}
        </h2>
        <p className="text-muted-foreground mt-4">Correct Answer: <strong className="text-white">{activeCorrect}</strong></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {Object.entries(responses || {}).length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-20">
              <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Waiting for participants to answer...</p>
            </div>
          ) : (
            Object.entries(responses || {}).map(([user, answer]: [string, any]) => {
              const isCorrect = answer.toLowerCase() === activeCorrect.toLowerCase();
              return (
                <motion.div
                  key={user}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white/5 border p-4 rounded-xl shadow-lg flex flex-col ${isCorrect ? "border-green-500/50" : "border-red-500/50"}`}
                >
                  <p className="text-lg font-medium text-white mb-2">{answer}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
                    <span className="text-xs text-muted-foreground">{user}</span>
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function FITBParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  const [myAnswer, setMyAnswer] = useState("");
  
  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Edit3 className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Challenge incoming...</h2>
        <p className="text-muted-foreground">The host is preparing the sentence.</p>
      </div>
    );
  }

  const { responses = {}, prompt: activePrompt = "", correctAnswer: activeCorrect = "" } = activityData;
  const hasAnswered = responses?.[userName] !== undefined;
  const parts = activePrompt.split("[blank]");

  const submitAnswer = () => {
    if (!myAnswer.trim() || hasAnswered) return;
    socket.emit("fitb:answer", { sessionId: session.id, userName, answer: myAnswer.trim() });
  };

  if (hasAnswered) {
    const answer = responses[userName];
    const isCorrect = answer.toLowerCase() === activeCorrect.toLowerCase();
    
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {isCorrect ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>
        <h2 className="text-3xl font-outfit font-bold mb-2">{isCorrect ? "Correct!" : "Not quite"}</h2>
        <p className="text-xl mb-6">
          {parts[0]}<strong className={isCorrect ? "text-green-400" : "text-red-400"}>{answer}</strong>{parts[1]}
        </p>
        {!isCorrect && (
          <p className="text-muted-foreground">
            The correct answer was: <strong className="text-white">{activeCorrect}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <h2 className="text-2xl md:text-3xl font-outfit font-bold mb-8 leading-tight">
        {parts[0]}<span className="text-primary border-b-2 border-primary mx-1 px-4 py-1 bg-white/5 rounded-t-md inline-block min-w-20">{myAnswer}</span>{parts[1]}
      </h2>
      
      <div className="space-y-4 max-w-sm mx-auto">
        <Input
          value={myAnswer}
          onChange={e => setMyAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="h-14 text-center text-lg bg-white/5 border-white/10"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && submitAnswer()}
        />
        <Button 
          onClick={submitAnswer} 
          disabled={!myAnswer.trim()}
          className="w-full h-12 bg-primary text-primary-foreground text-lg"
        >
          Submit Answer
        </Button>
      </div>
    </div>
  );
}
