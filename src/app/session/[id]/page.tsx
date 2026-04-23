"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useSocket } from "@/components/providers/SocketProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WifiOff, ArrowRight, Users, MessageCircle, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ThinkingBoard } from "@/components/activities/ThinkingBoard";
import { LivePollParticipant } from "@/components/activities/LivePoll";
import { QuizParticipant } from "@/components/activities/Quiz";
import { QAParticipant } from "@/components/activities/QABoard";
import { FocusTimerParticipant } from "@/components/activities/FocusTimer";
import { TaskTrackerParticipant } from "@/components/activities/TaskTracker";
import { FITBParticipant } from "@/components/activities/FillInTheBlank";
import { WordChainParticipant } from "@/components/activities/WordChain";
import { MostLikelyParticipant } from "@/components/activities/MostLikelyTo";
import { GroupStudyParticipant } from "@/components/activities/GroupStudy";
import { UnoParticipant } from "@/components/activities/UnoGame";
import { LudoParticipant } from "@/components/activities/LudoGame";
import { SessionControls } from "@/components/session/SessionControls";

// New DECIDE components
import { ThoughtMapParticipant } from "@/components/activities/ThoughtMap";
import { CourtroomParticipant } from "@/components/activities/CourtroomMode";
import { DuelDebateParticipant } from "@/components/activities/DuelDebate";
import { DecisionEngineParticipant } from "@/components/activities/DecisionEngine";

import Antakshari from "@/components/activities/Antakshari";
import RMCSGame from "@/components/activities/RMCSGame";


function LoadingSpinner() {
  return (
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
  );
}

function NameEntry({ sessionId, onJoin }: { sessionId: string; onJoin: (name: string) => void }) {
  const [name, setName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("coact_user_name");
    if (savedName) setName(savedName);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("coact_user_name", name.trim());
      onJoin(name.trim());
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative bg-[#020617] isolate">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />

      <div className="w-full max-w-sm z-10 relative">
        <Card className="border-white/10 bg-[#121826] shadow-2xl overflow-hidden relative z-20 border-t-4 border-t-primary rounded-2xl">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-outfit font-bold text-white">Join Session</h2>
              <p className="text-white/40 text-sm mt-1 uppercase font-black">
                ID: {sessionId}
              </p>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                placeholder="Your Name"
                className="bg-white/5 border-white/10 h-14 text-lg text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
              <button type="submit" className="w-full h-14 bg-primary text-black rounded-xl font-black text-lg shadow-lg touch-manipulation active:scale-95 transition-transform" disabled={!name.trim()}>
                JOIN NOW
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Lobby({ session, userName, socket }: { 
  session: NonNullable<ReturnType<typeof useSession>["session"]>; 
  userName: string;
  socket: any;
}) {
  const others = session.participants.filter((p) => p.id !== undefined && p.name !== userName && p.role !== "host");

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 relative bg-[#020617] overflow-hidden isolate">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-lg z-10 relative">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          <Card className="border-white/5 bg-[#121826]/40 backdrop-blur-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden text-white relative z-20 rounded-[3rem] ring-1 ring-white/10">
            <CardContent className="p-12 text-center relative overflow-hidden">
              {/* Subtle Animated Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
              
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 transform group-hover:rotate-0 transition-transform duration-500">
                  <span className="text-4xl font-black text-black">{userName[0].toUpperCase()}</span>
                </div>

                <h2 className="text-4xl font-outfit font-black mb-3 tracking-tight">You're In!</h2>
                <p className="text-white/40 text-[10px] mb-10 font-black uppercase tracking-[0.3em]">
                  Waiting for <span className="text-primary">{session.hostName || "Host"}</span> to launch
                </p>

                {others.length > 0 && (
                  <div className="text-left mb-10 bg-white/[0.03] p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 text-center">Colleagues in Lobby ({others.length})</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {others.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold shadow-sm hover:bg-white/10 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]" />
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-white/5 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Securely Connected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <SessionControls session={session} socket={socket} userName={userName} isHost={false} onLeave={() => window.location.href = "/"} onBack={() => {}} />
    </div>
  );
}

function ActivityView({ session, userName, socket }: {
  session: NonNullable<ReturnType<typeof useSession>["session"]>;
  userName: string;
  socket: any;
}) {
  const renderActivity = () => {
    const mode = session.mode;
    if (mode === "board") return <ThinkingBoard socket={socket} sessionId={session.id} userName={userName} session={session} isHost={false} />;
    if (mode === "poll") return <LivePollParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "quiz" || mode === "trivia") return <QuizParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "qa") return <QAParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "tasks") return <TaskTrackerParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "focus") return <FocusTimerParticipant session={session} />;
    if (mode === "fitb") return <FITBParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "wordchain") return <WordChainParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "mostlikely") return <MostLikelyParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "study") return <GroupStudyParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "uno") return <UnoParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "ludo") return <LudoParticipant session={session} socket={socket} userName={userName} />;
    
    // DECIDE section
    if (mode === "thoughtmap") return <ThoughtMapParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "courtroom") return <CourtroomParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "duel") return <DuelDebateParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "decision") return <DecisionEngineParticipant session={session} socket={socket} userName={userName} />;
    if (mode === "antakshari") return <Antakshari session={session} socket={socket} userName={userName} isHost={false} />;
    if (mode === "rmcs") return <RMCSGame session={session} socket={socket} userName={userName} isHost={false} />;

    return (
      <div className="w-full max-w-2xl text-center p-8 bg-[#121826] rounded-3xl border border-white/10 relative z-20">
        <LoadingSpinner />
        <p className="text-white text-lg font-bold mt-4">Syncing...</p>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] bg-[#020617] flex flex-col relative text-white isolate overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />
      
      <header className="h-16 md:h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-[#0A0D14]/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div className="relative w-28 h-8 md:w-40 md:h-12">
            <Image 
              src="/logo.png" 
              alt="CoAct Logo" 
              fill
              sizes="(max-width: 768px) 112px, 160px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {session.mode}
        </div>
      </header>

      <main className="flex-1 w-full relative z-10 min-h-0 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={session.mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`w-full h-full flex flex-col items-center justify-center ${
              session.mode === 'board' || session.mode === 'thoughtmap' ? '' : 'p-4 md:p-8'
            }`}
          >
            {renderActivity()}
          </motion.div>
        </AnimatePresence>
      </main>

      <SessionControls session={session} socket={socket} userName={userName} isHost={false} onLeave={() => window.location.href = "/"} onBack={() => {}} />
    </div>
  );
}

function SessionContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const sessionId = id as string;
  const nameFromUrl = searchParams.get("name");

  const [userName, setUserName] = useState(nameFromUrl || "");
  const { socket, isConnected } = useSocket();
  const { session, error, isKicked } = useSession(sessionId, userName, "participant");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const safeNavigate = useCallback((target: string) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      window.location.assign(target);
      setTimeout(() => {
        if (window.location.pathname + window.location.search !== target) {
          window.location.href = target;
        }
      }, 150);
    } catch {
      window.location.href = target;
    }
  }, [isRedirecting]);

  if (isKicked) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-[#020617] p-4 text-white isolate">
        <h2 className="text-3xl font-bold italic">Session Ended</h2>
        <button onClick={() => window.location.href = "/"} className="px-8 h-12 bg-primary text-black font-black uppercase rounded-xl touch-manipulation">Back Home</button>
      </div>
    );
  }

  useEffect(() => {
    if (session && socket && session.hostId === socket.id) {
      safeNavigate(`/host/session/${sessionId}?name=${encodeURIComponent(userName)}`);
    }
  }, [session, socket, sessionId, userName, safeNavigate]);

  if (!userName) return <NameEntry sessionId={sessionId} onJoin={setUserName} />;

  if (!isConnected || !session) {
    return (
      <div className="min-h-[100dvh] bg-[#020617] p-8 flex flex-col items-center justify-center space-y-6">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2 w-full max-w-xs">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#020617] p-4 text-white text-center isolate">
        <h2 className="text-2xl font-bold mb-2 uppercase italic tracking-tighter">Connection Lost</h2>
        <p className="text-white/40 text-sm mb-4 font-medium">{error}</p>
        <button onClick={() => window.location.href = "/"} className="px-8 h-12 bg-primary text-black font-black uppercase rounded-xl touch-manipulation">Exit</button>
      </div>
    );
  }

  if (session.mode === "lobby") {
    return <Lobby session={session} userName={userName} socket={socket} />;
  }

  return <ActivityView session={session} userName={userName} socket={socket} />;
}

export default function ParticipantSession() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#020617]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}


