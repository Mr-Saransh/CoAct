import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, Trash2, Check, BarChart3, Trophy, ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WinnerScreen } from "./WinnerScreen";

export function QuizHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const activityData = session.activityData || {
    questions: [],
    currentQuestionIndex: 0,
    state: "WAITING",
    scores: {},
    answers: {},
    timer: 30
  };

  const [questions, setQuestions] = useState<any[]>(activityData.questions?.length ? activityData.questions : [
    { q: "", options: ["", ""], correct: 0, time: 20 }
  ]);

  const handlePublish = () => {
    const validQuestions = questions.filter(q => q.q.trim() && q.options.filter((o: string) => o.trim()).length >= 2);
    if (validQuestions.length === 0) return;
    
    updateActivity({
      questions: validQuestions,
      currentQuestionIndex: 0,
      state: "QUESTION_ACTIVE",
      scores: {},
      answers: {},
      startTime: Date.now()
    }, "live");
  };

  const updateQ = (qIndex: number, val: string) => {
    const n = [...questions];
    n[qIndex].q = val;
    setQuestions(n);
  };

  const updateOpt = (qIndex: number, optIndex: number, val: string) => {
    const n = [...questions];
    n[qIndex].options[optIndex] = val;
    setQuestions(n);
  };

  const updateTime = (qIndex: number, val: number) => {
    const n = [...questions];
    n[qIndex].time = val;
    setQuestions(n);
  };

  const addOpt = (qIndex: number) => {
    const n = [...questions];
    n[qIndex].options.push("");
    setQuestions(n);
  };

  const setCorrect = (qIndex: number, optIndex: number) => {
    const n = [...questions];
    n[qIndex].correct = optIndex;
    setQuestions(n);
  };

  const addQuestion = () => {
    setQuestions([...questions, { q: "", options: ["", ""], correct: 0, time: 20 }]);
  };

  // Timer Effect for Host (to auto-lock)
  useEffect(() => {
    if (activityData.state === "QUESTION_ACTIVE") {
      const currentQ = activityData.questions[activityData.currentQuestionIndex];
      const elapsed = Math.floor((Date.now() - activityData.startTime) / 1000);
      const remaining = Math.max(0, currentQ.time - elapsed);

      if (remaining === 0) {
        showResults();
      } else {
        const timer = setTimeout(() => {
          // Trigger a re-render to check time
          updateActivity({ ...activityData });
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [activityData.state, activityData.startTime, activityData.currentQuestionIndex]);

  const showResults = () => {
    if (activityData.state !== "QUESTION_ACTIVE") return;
    
    // Calculate and update global scores
    const newScores = { ...activityData.scores };
    Object.entries(activityData.answers || {}).forEach(([user, data]: [string, any]) => {
      if (data.isCorrect) {
        if (!newScores[user]) newScores[user] = { correct: 0, totalTime: 0 };
        newScores[user].correct += 1;
        newScores[user].totalTime += (data.reactionTime || 0);
      }
    });

    updateActivity({
      ...activityData,
      state: "QUESTION_RESULT",
      scores: newScores
    });
  };

  const nextQuestion = () => {
    if (activityData.currentQuestionIndex + 1 >= activityData.questions.length) {
      updateActivity({
        ...activityData,
        state: "FINAL_RESULT"
      });
    } else {
      updateActivity({
        ...activityData,
        currentQuestionIndex: activityData.currentQuestionIndex + 1,
        state: "QUESTION_ACTIVE",
        answers: {},
        startTime: Date.now()
      });
    }
  };

  if (session.status === "waiting") {
    return (
      <div className="p-8 flex flex-col max-w-3xl mx-auto space-y-6 pb-24">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(250,204,21,0.2)]">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-5xl font-black italic tracking-tighter mb-4">Quiz Battle</h2>
          <p className="text-white/40 uppercase font-bold tracking-widest text-xs">Configure your questions and timer</p>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="border-white/10 bg-[#121826]/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-primary uppercase tracking-widest">Question {qIndex + 1}</label>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] font-black text-white/40">TIME:</span>
                    <input 
                      type="number" 
                      value={q.time} 
                      onChange={(e) => updateTime(qIndex, parseInt(e.target.value) || 10)}
                      className="bg-transparent w-8 text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-white/40">SEC</span>
                  </div>
                </div>
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="h-6 text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[10px] font-black uppercase">
                    Remove
                  </Button>
                )}
              </div>
              <Input 
                value={q.q} 
                onChange={e => updateQ(qIndex, e.target.value)} 
                placeholder="Enter question" 
                className="bg-white/5 border-white/10 text-lg h-14 rounded-xl"
              />
              
              <div className="space-y-3 mt-4">
                <label className="text-xs font-black uppercase tracking-widest text-white/40">Options</label>
                {q.options.map((opt: string, optIndex: number) => (
                  <div key={optIndex} className="flex gap-2 items-center">
                    <Button
                      variant={q.correct === optIndex ? "default" : "outline"}
                      size="icon"
                      className={`shrink-0 w-12 h-12 rounded-xl transition-all ${q.correct === optIndex ? "bg-green-500 border-green-500 text-white" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}
                      onClick={() => setCorrect(qIndex, optIndex)}
                    >
                      {q.correct === optIndex ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">{String.fromCharCode(65 + optIndex)}</span>}
                    </Button>
                    <Input 
                      value={opt} 
                      onChange={e => updateOpt(qIndex, optIndex, e.target.value)} 
                      placeholder={`Option ${optIndex + 1}`} 
                      className="bg-white/5 border-white/10 h-12 rounded-xl"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        const n = [...questions];
                        n[qIndex].options = n[qIndex].options.filter((_: any, i: number) => i !== optIndex);
                        if (n[qIndex].correct === optIndex) n[qIndex].correct = 0;
                        else if (n[qIndex].correct > optIndex) n[qIndex].correct--;
                        setQuestions(n);
                      }}
                      disabled={q.options.length <= 2}
                      className="border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 shrink-0 w-12 h-12 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addOpt(qIndex)} className="w-full h-12 border-dashed border-white/10 bg-transparent hover:bg-white/5 rounded-xl text-xs font-bold text-white/40 uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2" /> Add Option
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full border-dashed border-white/20 bg-transparent hover:bg-white/5 h-16 rounded-[1.5rem] text-white/40 font-bold uppercase tracking-[0.2em] text-xs">
          <Plus className="w-4 h-4 mr-2" /> Add New Question
        </Button>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#020617]/90 backdrop-blur-2xl border-t border-white/10 flex justify-center z-50">
          <Button onClick={handlePublish} className="w-full max-w-md bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase tracking-[0.3em] h-16 rounded-2xl text-xs shadow-[0_0_40px_rgba(250,204,21,0.3)] transition-all active:scale-95">
            <Play className="w-5 h-5 mr-2" /> Start Quiz Battle
          </Button>
        </div>
      </div>
    );
  }

  // --- Live View for Host ---
  const { currentQuestionIndex = 0, state = "WAITING", startTime = Date.now(), answers = {}, scores = {}, questions: qList = [] } = activityData;
  const currentQ = qList[currentQuestionIndex];

  if (state === "FINAL_RESULT") {
    const rankings = Object.entries(scores || {})
      .map(([name, data]: [string, any]) => ({ 
        name, 
        correct: data.correct, 
        avgTime: data.correct > 0 ? Math.round(data.totalTime / data.correct) : 0 
      }))
      .sort((a, b) => {
        if (b.correct !== a.correct) return b.correct - a.correct;
        return a.avgTime - b.avgTime; // Faster is better
      });

    return (
      <WinnerScreen 
        winnerName={rankings[0]?.name || "N/A"}
        rankings={rankings.map(r => ({ name: r.name, score: `${r.correct} Correct (${(r.avgTime / 1000).toFixed(1)}s avg)` }))}
        onReturnToLobby={() => updateActivity({ state: "WAITING", currentQuestionIndex: 0 }, "waiting")}
        isCurrentUserWinner={false}
        gameName="Quiz Battle"
      />
    );
  }

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, (currentQ?.time || 20) - elapsed);

  return (
    <div className="p-4 md:p-8 h-full flex flex-col items-center max-w-4xl mx-auto w-full relative">
      <div className="w-full flex justify-between items-center mb-12">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Question</span>
          <h2 className="text-2xl font-black italic tracking-tighter text-primary">
            {currentQuestionIndex + 1} <span className="text-white/20 text-lg not-italic font-normal">/ {qList.length}</span>
          </h2>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-colors ${remaining <= 5 ? "border-red-500 animate-pulse bg-red-500/10" : "border-white/10 bg-white/5"}`}>
            <span className={`text-2xl font-black ${remaining <= 5 ? "text-red-500" : "text-white"}`}>{remaining}</span>
          </div>
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-2">Seconds Left</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Submissions</span>
          <h2 className="text-2xl font-black text-white">
            {Object.keys(answers).length} <span className="text-white/20 text-lg font-normal">Joined</span>
          </h2>
        </div>
      </div>
      
      <h2 className="text-4xl md:text-5xl font-outfit font-black text-center mb-16 max-w-2xl leading-tight">
        {currentQ?.q}
      </h2>
      
      {state === "QUESTION_ACTIVE" ? (
        <div className="w-full grid gap-4">
          {currentQ?.options.map((opt: string, idx: number) => (
            <div key={idx} className="h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center px-6 relative group overflow-hidden">
               <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
               <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white/40 mr-4 relative z-10">{String.fromCharCode(65 + idx)}</span>
               <span className="text-lg font-bold text-white/80 relative z-10">{opt}</span>
            </div>
          ))}
          <div className="mt-8 flex justify-center">
            <Button onClick={showResults} className="h-16 px-12 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
              Lock & Show Results <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 md:p-8 backdrop-blur-xl w-full overflow-hidden">
             <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 gap-4 text-center md:text-left">
                <h3 className="text-lg md:text-xl font-black italic">Question Results</h3>
                <div className="px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-[10px] font-black uppercase tracking-widest max-w-full truncate">
                   Correct: {currentQ?.options[currentQ?.correct]}
                </div>
             </div>
             
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(answers).length === 0 ? (
                  <p className="text-center text-white/20 py-8 italic uppercase text-xs font-bold tracking-widest">No one answered in time</p>
                ) : (
                  Object.entries(answers)
                    .sort((a: any, b: any) => a[1].reactionTime - b[1].reactionTime)
                    .map(([name, data]: [string, any]) => (
                    <div key={name} className={`flex items-center justify-between p-4 rounded-2xl border ${data.isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${data.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                             {name[0].toUpperCase()}
                          </div>
                          <div>
                             <p className="font-bold text-white leading-none">{name}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-40">
                               Selected {String.fromCharCode(65 + data.answer)}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`text-sm font-black ${data.isCorrect ? "text-green-400" : "text-red-400"}`}>{(data.reactionTime / 1000).toFixed(1)}s</p>
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">Response Time</p>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
          
          <div className="flex justify-center pt-4 w-full">
            <Button onClick={nextQuestion} className="w-full md:w-auto h-auto py-5 px-6 md:px-16 bg-primary text-black font-black uppercase tracking-[0.1em] md:tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,212,255,0.3)] text-xs md:text-sm whitespace-normal text-center">
              {currentQuestionIndex + 1 >= qList.length ? "Show Final Leaderboard" : "Next Question"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


export function QuizParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const activityData = session.activityData || {};
  const { state = "WAITING", currentQuestionIndex = 0, answers = {}, scores = {}, questions = [], startTime = Date.now() } = activityData;

  const [localTimer, setLocalTimer] = useState(0);
  const [localStartTime, setLocalStartTime] = useState(Date.now());

  useEffect(() => {
    if (state === "QUESTION_ACTIVE") {
      const currentQ = questions[currentQuestionIndex];
      
      // Store local time to avoid host/client clock skew issues resulting in negative reaction times
      const now = Date.now();
      setLocalStartTime(now);
      setLocalTimer(currentQ?.time || 20);

      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - now) / 1000);
        const rem = Math.max(0, (currentQ?.time || 20) - elapsed);
        setLocalTimer(rem);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state, currentQuestionIndex]);

  if (session.status === "waiting" || state === "WAITING") {
    return (
      <div className="w-full max-w-lg mx-auto text-center p-12">
        <div className="w-24 h-24 rounded-[2.5rem] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Trophy className="w-12 h-12 text-yellow-500 animate-bounce" />
        </div>
        <h2 className="text-4xl font-black italic tracking-tighter mb-4">Quiz Incoming!</h2>
        <p className="text-white/40 uppercase font-bold tracking-[0.3em] text-[10px]">The host is preparing the battle...</p>
      </div>
    );
  }

  if (state === "FINAL_RESULT") {
    const rankings = Object.entries(scores || {})
      .map(([name, data]: [string, any]) => ({ 
        name, 
        correct: data.correct, 
        avgTime: data.correct > 0 ? Math.round(data.totalTime / data.correct) : 0 
      }))
      .sort((a, b) => {
        if (b.correct !== a.correct) return b.correct - a.correct;
        return a.avgTime - b.avgTime;
      });

    return (
      <WinnerScreen 
        winnerName={rankings[0]?.name || "N/A"}
        rankings={rankings.map(r => ({ name: r.name, score: `${r.correct} Correct (${(r.avgTime / 1000).toFixed(1)}s avg)` }))}
        onReturnToLobby={() => {}}
        isCurrentUserWinner={rankings[0]?.name === userName}
        gameName="Quiz Battle"
      />
    );
  }

  const currentQ = questions[currentQuestionIndex] || { q: "No question", options: [], correct: 0, time: 20 };
  const myAnswerData = answers?.[userName];
  const hasAnswered = myAnswerData !== undefined;

  const submitAnswer = (optIndex: number) => {
    if (hasAnswered || state !== "QUESTION_ACTIVE") return;
    // Calculate reaction time based on local start time, fallback to 0 if negative for safety
    const reactionTime = Math.max(0, Date.now() - localStartTime);
    socket.emit("quiz:answer", { sessionId: session.id, userName, answer: optIndex, reactionTime });
  };

  if (state === "QUESTION_RESULT") {
    const isCorrect = myAnswerData?.isCorrect;
    
    return (
      <div className="w-full max-w-lg mx-auto text-center p-8 animate-in zoom-in duration-500">
        <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {isCorrect ? <Check className="w-12 h-12" /> : <X className="w-12 h-12" />}
        </div>
        <h2 className="text-4xl font-black italic tracking-tighter mb-4">{isCorrect ? "STREAK!" : "OOF!"}</h2>
        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-8">
          Correct: <span className="text-white">{currentQ.options[currentQ.correct]}</span>
        </p>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Your Rank</p>
              <p className="text-2xl font-black text-white">#--</p>
           </div>
           <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Total Points</p>
              <p className="text-2xl font-black text-primary">{scores[userName]?.correct || 0}</p>
           </div>
        </div>
        
        <div className="mt-8">
           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] animate-pulse">Wait for host...</p>
        </div>
      </div>
    );
  }

  if (hasAnswered) {
    return (
      <div className="w-full max-w-lg mx-auto text-center p-12 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Check className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h2 className="text-3xl font-black italic tracking-tighter mb-4">Locked In!</h2>
        <p className="text-white/40 uppercase font-bold tracking-widest text-[10px]">Response recorded in {(myAnswerData.reactionTime / 1000).toFixed(1)}s</p>
        <div className="mt-12 flex justify-center gap-2">
           {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <div className="flex justify-between items-center mb-10">
        <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Question {currentQuestionIndex + 1}</span>
        </div>
        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${localTimer <= 5 ? "border-red-500 animate-pulse text-red-500" : "border-white/10 text-white"}`}>
          <span className="text-lg font-black">{localTimer}</span>
        </div>
      </div>
      
      <h2 className="text-3xl md:text-4xl font-outfit font-black text-center mb-12 leading-tight">
        {currentQ.q}
      </h2>
      
      <div className="grid gap-4">
        {currentQ.options.map((opt: string, idx: number) => (
          <Button 
            key={idx}
            onClick={() => submitAnswer(idx)}
            className="h-20 text-lg border-white/10 bg-[#1A1F2E] text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-2xl justify-start px-6 group shadow-lg"
          >
            <span className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-black/20 flex items-center justify-center mr-6 text-sm font-black transition-colors text-white/40 group-hover:text-black/50">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="font-bold">{opt}</span>
          </Button>
        ))}
      </div>
      
      <div className="mt-12 w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
         <motion.div 
           className="h-full bg-primary"
           initial={{ width: "100%" }}
           animate={{ width: "0%" }}
           transition={{ duration: currentQ.time, ease: "linear" }}
         />
      </div>
    </div>
  );
}
