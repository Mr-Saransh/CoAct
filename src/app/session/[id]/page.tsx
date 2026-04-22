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
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative bg-[#020617] isolate">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b]/20 via-[#020617] to-[#020617]" />

      <div className="w-full max-w-md z-10 relative">
        <Card className="border-white/5 bg-[#121826]/80 backdrop-blur-xl shadow-2xl overflow-hidden text-white relative z-20 rounded-[2rem]">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,212,255,0.3)]">
              <span className="text-3xl font-black text-black">{userName[0].toUpperCase()}</span>
            </div>

            <h2 className="text-3xl font-outfit font-black mb-2 italic">You're In!</h2>
            <p className="text-white/40 text-xs mb-8 font-bold uppercase tracking-widest">
              Waiting for host <strong className="text-white">{session.hostName || "Host"}</strong> to start
            </p>

            {others.length > 0 && (
              <div className="text-left mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 text-center">Others in Lobby ({others.length})</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {others.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-bold shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Live Connection</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
        </Card>
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

    return (
      <div className="w-full max-w-2xl text-center p-8 bg-[#121826] rounded-3xl border border-white/10 relative z-20">
        <LoadingSpinner />
        <p className="text-white text-lg font-bold mt-4">Syncing...</p>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#020617] flex flex-col relative text-white isolate overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />
      
      <header className="h-16 md:h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-[#0A0D14]/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div className="relative w-28 h-8 md:w-40 md:h-12">
            <Image 
              src="/logo.png" 
              alt="CoAct Logo" 
              fill
              className="object-contain mix-blend-screen"
              priority
            />
          </div>
        </div>
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {session.mode}
        </div>
      </header>

      <div className={`flex-1 w-full flex items-center justify-center relative z-10 ${session.mode === 'board' ? '' : 'pt-16 pb-20 px-4'}`}>
        {renderActivity()}
      </div>

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#020617] text-white isolate">
        <LoadingSpinner />
        <p className="text-white/40 text-sm font-bold uppercase mt-4">Connecting...</p>
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


