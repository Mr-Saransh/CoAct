import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, MessageCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function QAHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  const { prompt: activePrompt = "", responses: allResponses = [] } = activityData;

  const [prompt, setPrompt] = useState(activityData.prompt || "");

  const handlePublish = () => {
    if (!prompt.trim()) return;
    updateActivity({
      prompt: prompt.trim(),
      responses: []
    }, "live");
  };

  const toggleVisibility = (id: string) => {
    const newResponses = allResponses.map((r: any) => 
      r.id === id ? { ...r, visible: !r.visible } : r
    );
    updateActivity({ ...activityData, responses: newResponses });
  };

  const deleteResponse = (id: string) => {
    const newResponses = allResponses.filter((r: any) => r.id !== id);
    updateActivity({ ...activityData, responses: newResponses });
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-outfit font-bold">Q&A Board</h2>
          <p className="text-muted-foreground">Ask the audience a question or collect their questions.</p>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Discussion Prompt</label>
              <Input 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="E.g., What are your main questions about today's topic?" 
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <Button onClick={handlePublish} disabled={!prompt.trim()} className="w-full bg-primary text-primary-foreground">
              <Play className="w-4 h-4 mr-2" /> Start Q&A
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Live View - using variables from top level
  const { prompt: livePrompt = "" } = activityData;

  return (
    <div className="p-8 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Q&A
        </div>
        <h2 className="text-3xl md:text-5xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
          {activityData.prompt}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
        <AnimatePresence>
          {allResponses.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-20">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Waiting for responses...</p>
            </div>
          ) : (
            allResponses.map((r: any) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                className={`bg-white/5 border p-5 rounded-2xl flex flex-col justify-between shadow-xl ${r.visible ? "border-primary/50" : "border-white/10 opacity-60"}`}
              >
                <div>
                  <p className="text-lg font-medium text-white mb-4">{r.text}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-muted-foreground bg-black/40 px-2 py-1 rounded-md">{r.author}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleVisibility(r.id)}>
                      {r.visible ? "Hide" : "Show"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => deleteResponse(r.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function QAParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  const { prompt: activePrompt = "" } = activityData;
  const [myResponse, setMyResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Q&A incoming...</h2>
        <p className="text-muted-foreground">The host is preparing the discussion.</p>
      </div>
    );
  }

  const submitResponse = () => {
    if (!myResponse.trim() || submitted) return;
    socket.emit("qa:submit", { sessionId: session.id, userName, text: myResponse.trim() });
    setSubmitted(true);
    setMyResponse("");
    // allow multiple responses
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl md:text-3xl font-outfit font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        {activePrompt}
      </h2>
      
      <div className="space-y-4">
        <textarea
          value={myResponse}
          onChange={e => setMyResponse(e.target.value)}
          placeholder="Type your response here..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
        />
        <Button 
          onClick={submitResponse} 
          disabled={!myResponse.trim() || submitted}
          className="w-full h-12 bg-primary text-primary-foreground text-lg"
        >
          {submitted ? "Sent!" : "Submit Response"}
        </Button>
      </div>
    </div>
  );
}
