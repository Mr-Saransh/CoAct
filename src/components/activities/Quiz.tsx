import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, Trash2, Check, BarChart3, Trophy, ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function QuizHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {
    questions: [],
    currentQuestionIndex: 0,
    state: "editing", // editing, question, results, leaderboard
    scores: {},
    answers: {} // current question answers
  };

  const [questions, setQuestions] = useState<any[]>(activityData.questions?.length ? activityData.questions : [
    { q: "", options: ["", ""], correct: 0 }
  ]);

  const handlePublish = () => {
    // Validate
    const validQuestions = questions.filter(q => q.q.trim() && q.options.filter((o: string) => o.trim()).length >= 2);
    if (validQuestions.length === 0) return;
    
    updateActivity({
      questions: validQuestions,
      currentQuestionIndex: 0,
      state: "question",
      scores: {},
      answers: {}
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
    setQuestions([...questions, { q: "", options: ["", ""], correct: 0 }]);
  };

  if (isEditing) {
    return (
      <div className="p-8 flex flex-col max-w-3xl mx-auto space-y-6 pb-24">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-outfit font-bold">Quiz Editor</h2>
          <p className="text-muted-foreground">Create your questions and mark the correct answers.</p>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-primary">Question {qIndex + 1}</label>
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="h-6 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    Remove
                  </Button>
                )}
              </div>
              <Input 
                value={q.q} 
                onChange={e => updateQ(qIndex, e.target.value)} 
                placeholder="Enter question" 
                className="bg-white/5 border-white/10 text-lg"
              />
              
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-muted-foreground">Options (select correct answer)</label>
                {q.options.map((opt: string, optIndex: number) => (
                  <div key={optIndex} className="flex gap-2 items-center">
                    <Button
                      variant={q.correct === optIndex ? "default" : "outline"}
                      size="icon"
                      className={q.correct === optIndex ? "bg-green-500 hover:bg-green-600 text-white shrink-0" : "border-white/10 shrink-0 bg-white/5"}
                      onClick={() => setCorrect(qIndex, optIndex)}
                    >
                      <Check className={`w-4 h-4 ${q.correct === optIndex ? "opacity-100" : "opacity-0"}`} />
                    </Button>
                    <Input 
                      value={opt} 
                      onChange={e => updateOpt(qIndex, optIndex, e.target.value)} 
                      placeholder={`Option ${optIndex + 1}`} 
                      className="bg-white/5 border-white/10"
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
                      className="border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOpt(qIndex)} className="mt-2 border-dashed border-white/10 bg-transparent hover:bg-white/5">
                  <Plus className="w-3 h-3 mr-2" /> Add Option
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full border-dashed border-white/20 bg-transparent hover:bg-white/5 h-12 text-muted-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add New Question
        </Button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex justify-center z-10">
          <Button onClick={handlePublish} className="w-full max-w-md bg-primary text-primary-foreground h-12 text-lg">
            <Play className="w-5 h-5 mr-2" /> Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Live View
  const { currentQuestionIndex: activeQuestionIndex = 0, state: activeState = "question", scores: activeScores = {}, answers: activeAnswers = {}, questions: activeQuestions = [] } = activityData;
  const currentQ = activeQuestions[activeQuestionIndex] || { q: "No question found", options: [], correct: 0 };
  
  const totalAnswers = Object.keys(activeAnswers || {}).length;

  const showResults = () => {
    // Calculate points
    const newScores = { ...activeScores };
    Object.entries(activeAnswers || {}).forEach(([user, optIdx]) => {
      if (optIdx === currentQ.correct) {
        newScores[user] = (newScores[user] || 0) + 100; // 100 points per correct answer
      }
    });

    updateActivity({
      ...activityData,
      state: "results",
      scores: newScores
    });
  };

  const nextQuestion = () => {
    if (activeQuestionIndex + 1 >= activeQuestions.length) {
      // Go to leaderboard
      updateActivity({
        ...activityData,
        state: "leaderboard"
      });
    } else {
      updateActivity({
        ...activityData,
        currentQuestionIndex: activeQuestionIndex + 1,
        state: "question",
        answers: {} // reset answers for next question
      });
    }
  };

  if (activeState === "leaderboard") {
    const sortedScores = Object.entries(activeScores || {}).sort((a: any, b: any) => b[1] - a[1]);
    
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
        <Trophy className="w-16 h-16 text-yellow-400 mb-6" />
        <h2 className="text-4xl font-outfit font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Final Leaderboard</h2>
        
        <div className="w-full space-y-3">
          {sortedScores.length === 0 ? (
            <p className="text-center text-muted-foreground">No scores recorded.</p>
          ) : (
            sortedScores.map(([user, score], idx) => (
              <div key={user} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold w-6 text-center text-muted-foreground">#{idx + 1}</span>
                  <span className="text-lg font-medium">{user}</span>
                </div>
                <span className="text-xl font-bold text-primary">{score as number} pts</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
      <div className="w-full flex justify-between items-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-xs font-medium px-3 py-1 rounded-full">
          Question {activeQuestionIndex + 1} / {activeQuestions.length}
        </div>
        <div className="text-muted-foreground font-mono">
          {totalAnswers} answers
        </div>
      </div>
      
      <h2 className="text-3xl md:text-4xl font-outfit font-bold text-center mb-10 w-full">
        {currentQ.q}
      </h2>
      
      <div className="w-full grid gap-4">
        {currentQ.options.map((opt: string, idx: number) => {
          const isCorrect = idx === currentQ.correct;
          const votesForOpt = Object.values(activeAnswers || {}).filter(v => v === idx).length;
          const percentage = totalAnswers === 0 ? 0 : Math.round((votesForOpt / totalAnswers) * 100);
          
          return (
            <div key={idx} className={`relative overflow-hidden rounded-xl border p-4 ${activeState === "results" ? (isCorrect ? "border-green-500/50 bg-green-500/10" : "border-white/10 bg-white/5") : "border-white/10 bg-white/5"}`}>
              {activeState === "results" && (
                <motion.div 
                  className={`absolute inset-0 origin-left ${isCorrect ? "bg-green-500/20" : "bg-white/10"}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: percentage / 100 }}
                  transition={{ duration: 0.5 }}
                />
              )}
              <div className="relative flex justify-between items-center z-10">
                <span className="font-medium text-lg">{opt}</span>
                {activeState === "results" && (
                  <div className="text-right flex items-center gap-3">
                    {isCorrect && <Check className="w-5 h-5 text-green-400" />}
                    <span className="font-bold">{percentage}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-10 w-full flex justify-end">
        {activeState === "question" ? (
          <Button onClick={showResults} size="lg" className="bg-white text-black hover:bg-white/90">
            Show Results <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={nextQuestion} size="lg" className="bg-primary text-primary-foreground">
            {activeQuestionIndex + 1 >= activeQuestions.length ? "Show Leaderboard" : "Next Question"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function QuizParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const isEditing = session.status === "waiting";
  const activityData = session.activityData || {};
  
  if (isEditing) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Quiz incoming...</h2>
        <p className="text-muted-foreground">The host is preparing the questions.</p>
      </div>
    );
  }

  const { state = "question", currentQuestionIndex = 0, answers = {}, scores = {}, questions = [] } = activityData;
  
  if (state === "leaderboard") {
    const myScore = scores[userName] || 0;
    const sortedScores = Object.entries(scores || {}).sort((a: any, b: any) => b[1] - a[1]);
    const myRank = sortedScores.findIndex(s => s[0] === userName) + 1;

    return (
      <div className="w-full max-w-md mx-auto text-center">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
        <h2 className="text-3xl font-outfit font-bold mb-2">Quiz Finished!</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-8">
          <p className="text-muted-foreground mb-1">Your Score</p>
          <p className="text-5xl font-bold text-primary mb-6">{myScore}</p>
          <p className="text-muted-foreground mb-1">Your Rank</p>
          <p className="text-3xl font-bold">{myRank > 0 ? `#${myRank}` : "Unranked"}</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex] || { q: "No question", options: [], correct: 0 };
  const myAnswer = answers?.[userName];
  const hasAnswered = myAnswer !== undefined;

  const submitAnswer = (optIndex: number) => {
    if (hasAnswered || state !== "question") return;
    socket.emit("quiz:answer", { sessionId: session.id, userName, answer: optIndex });
  };

  if (state === "results") {
    const isCorrect = myAnswer === currentQ.correct;
    
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {isCorrect ? <Check className="w-10 h-10" /> : <X className="w-10 h-10" />}
        </div>
        <h2 className="text-3xl font-outfit font-bold mb-2">{isCorrect ? "Correct!" : "Incorrect"}</h2>
        <p className="text-muted-foreground mb-8">
          The correct answer was: <strong className="text-white">{currentQ.options[currentQ.correct]}</strong>
        </p>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 inline-block">
          <p className="text-sm text-muted-foreground">Your Score</p>
          <p className="text-2xl font-bold text-primary">{scores[userName] || 0}</p>
        </div>
      </div>
    );
  }

  if (hasAnswered) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-outfit font-bold mb-2">Answer submitted!</h2>
        <p className="text-muted-foreground">Waiting for the host to show results...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full mb-6">
        Question {currentQuestionIndex + 1}
      </div>
      
      <h2 className="text-2xl md:text-3xl font-outfit font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        {currentQ.q}
      </h2>
      
      <div className="grid gap-3">
        {currentQ.options.map((opt: string, idx: number) => (
          <Button 
            key={idx}
            onClick={() => submitAnswer(idx)}
            variant="outline"
            className="h-16 text-lg border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 hover:text-white justify-start px-6"
          >
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-4 text-sm font-bold">
              {String.fromCharCode(65 + idx)}
            </span>
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
