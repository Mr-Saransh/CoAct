import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, Trash2, Check, BarChart3 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { motion, AnimatePresence } from "framer-motion";

export function LivePollHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  
  const [question, setQuestion] = useState(activityData.question || "");
  const [options, setOptions] = useState<string[]>(activityData.options || ["", ""]);

  const handlePublish = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    const finalOptions = options.filter(o => o.trim());
    const initialVotes = finalOptions.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {});
    
    updateActivity({
      question: question.trim(),
      options: finalOptions,
      votes: initialVotes,
      totalVotes: 0,
      votedUsers: []
    }, "live");
  };

  const updateOption = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const addOption = () => setOptions([...options, ""]);
  
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  if (isEditing) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-outfit font-bold mb-2">Create Live Poll</h2>
        <p className="text-muted-foreground mb-8">Set up your question and options before publishing.</p>
        
        <Card className="w-full border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input 
                value={question} 
                onChange={e => setQuestion(e.target.value)} 
                placeholder="What would you like to ask?" 
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Options</label>
              <AnimatePresence>
                {options.map((opt, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input 
                      value={opt} 
                      onChange={e => updateOption(i, e.target.value)} 
                      placeholder={`Option ${i + 1}`} 
                      className="bg-white/5 border-white/10"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeOption(i)}
                      disabled={options.length <= 2}
                      className="border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <Button 
                variant="outline" 
                onClick={addOption} 
                className="w-full border-white/10 border-dashed bg-transparent hover:bg-white/5 text-muted-foreground"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            </div>
            
            <Button 
              onClick={handlePublish} 
              className="w-full bg-primary text-primary-foreground"
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            >
              <BarChart3 className="w-4 h-4 mr-2" /> Publish Poll
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Live Results View
  const { votes = {}, totalVotes = 0 } = activityData;
  const sortedOptions = activityData.options || [];

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Poll Active
      </div>
      
      <h2 className="text-3xl md:text-4xl font-outfit font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        {activityData.question}
      </h2>
      
      <div className="w-full space-y-4">
        {sortedOptions.map((opt: string) => {
          const voteCount = votes[opt] || 0;
          const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
          
          return (
            <div key={opt} className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4">
              {/* Progress bar background */}
              <motion.div 
                className="absolute inset-0 bg-primary/20 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: percentage / 100 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              
              <div className="relative flex justify-between items-center z-10">
                <span className="font-medium text-lg">{opt}</span>
                <div className="text-right">
                  <span className="font-bold text-xl">{percentage}%</span>
                  <span className="text-xs text-muted-foreground block">{voteCount} votes</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="mt-8 text-muted-foreground text-sm font-mono">
        Total Votes: {totalVotes || 0}
      </p>
    </div>
  );
}

export function LivePollParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  
  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Poll incoming...</h2>
        <p className="text-muted-foreground">The host is preparing the question.</p>
      </div>
    );
  }

  const hasVoted = activityData.votedUsers?.includes(userName);
  
  const submitVote = (option: string) => {
    if (hasVoted) return;
    socket.emit("poll:vote", { sessionId: session.id, userName, option });
  };

  if (hasVoted) {
    // Show results
    const { votes = {}, totalVotes = 0, options = [] } = activityData;
    return (
      <div className="w-full max-w-lg mx-auto">
        <h2 className="text-2xl font-outfit font-bold text-center mb-8">{activityData.question}</h2>
        <div className="space-y-3">
          {options.map((opt: string) => {
            const voteCount = votes[opt] || 0;
            const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
            
            return (
              <div key={opt} className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4">
                <motion.div 
                  className="absolute inset-0 bg-primary/20 origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: percentage / 100 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <div className="relative flex justify-between items-center z-10">
                  <span className="font-medium">{opt}</span>
                  <span className="font-bold">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-6 text-sm text-green-400 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Vote recorded
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl md:text-3xl font-outfit font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        {activityData.question}
      </h2>
      
      <div className="grid gap-3">
        {(activityData.options || []).map((opt: string) => (
          <Button 
            key={opt}
            onClick={() => submitVote(opt)}
            variant="outline"
            className="h-14 text-lg border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 hover:text-white justify-start px-6"
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
