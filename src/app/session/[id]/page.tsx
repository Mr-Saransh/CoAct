"use client";

import { Suspense, useState, useEffect, useCallback, useRef, memo } from "react";
import Image from "next/image";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/hooks/useSession";
import { useSocket } from "@/components/providers/SocketProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WifiOff, ArrowRight, Users, MessageCircle, Mic, ShieldOff, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionControls } from "@/components/session/SessionControls";
import { SessionFloatingController } from "@/components/session/SessionFloatingController";

function LoadingSpinner() {
  return (
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
  );
}

// Lazy-loaded Activity components to eliminate monolithic bundle and boost navigation speed
const ThinkingBoard = dynamic(() => import("@/components/activities/ThinkingBoard").then(m => m.ThinkingBoard), { ssr: false, loading: () => <LoadingSpinner /> });
const LivePollParticipant = dynamic(() => import("@/components/activities/LivePoll").then(m => m.LivePollParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const QuizParticipant = dynamic(() => import("@/components/activities/Quiz").then(m => m.QuizParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const QAParticipant = dynamic(() => import("@/components/activities/QABoard").then(m => m.QAParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const FocusTimerParticipant = dynamic(() => import("@/components/activities/FocusTimer").then(m => m.FocusTimerParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const TaskTrackerParticipant = dynamic(() => import("@/components/activities/TaskTracker").then(m => m.TaskTrackerParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const FITBParticipant = dynamic(() => import("@/components/activities/FillInTheBlank").then(m => m.FITBParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const WordChainParticipant = dynamic(() => import("@/components/activities/WordChain").then(m => m.WordChainParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const MostLikelyParticipant = dynamic(() => import("@/components/activities/MostLikelyTo").then(m => m.MostLikelyParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const GroupStudyParticipant = dynamic(() => import("@/components/activities/GroupStudy").then(m => m.GroupStudyParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const UnoParticipant = dynamic(() => import("@/components/activities/UnoGame").then(m => m.UnoParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const LudoParticipant = dynamic(() => import("@/components/activities/LudoGame").then(m => m.LudoParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const ThoughtMapParticipant = dynamic(() => import("@/components/activities/ThoughtMap").then(m => m.ThoughtMapParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const CourtroomParticipant = dynamic(() => import("@/components/activities/CourtroomMode").then(m => m.CourtroomParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const DuelDebateParticipant = dynamic(() => import("@/components/activities/DuelDebate").then(m => m.DuelDebateParticipant), { ssr: false, loading: () => <LoadingSpinner /> });
const DecisionEngineParticipant = dynamic(() => import("@/components/activities/DecisionEngine").then(m => m.DecisionEngineParticipant), { ssr: false, loading: () => <LoadingSpinner /> });

function NameEntry({ sessionId, onJoin, error }: { sessionId: string; onJoin: (name: string) => void; error?: string | null }) {
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

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center leading-relaxed"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                placeholder="Your Name"
                className="bg-white/5 border-white/10 h-14 text-lg text-white focus:ring-primary focus:border-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
              <button 
                type="submit" 
                className="w-full h-14 bg-primary text-black rounded-xl font-black text-lg shadow-lg touch-manipulation active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 disabled:grayscale" 
                disabled={!name.trim() || !!error?.toLowerCase().includes("banned")}
              >
                {error?.toLowerCase().includes("banned") ? "BANNED" : "JOIN NOW"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Lobby = memo(function Lobby({ session, userName }: { 
  session: NonNullable<ReturnType<typeof useSession>["session"]>; 
  userName: string;
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
            <div className={`w-full h-full flex-1 relative ${
              session.mode === "board" || session.mode === "thoughtmap" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"
            }`}>
              {/* Subtle Animated Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
              
              <div className="relative z-10 p-12 text-center">
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
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
});

const ActivityView = memo(function ActivityView({ session, userName, socket }: {
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
    <div className="h-[100dvh] bg-[#020617] flex flex-col relative text-white isolate overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />
      
      {!(session.mode === 'board' || session.mode === 'thoughtmap' || session.mode === 'study') && (
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
      )}

      <main className={`flex-1 w-full relative z-10 min-h-0 flex flex-col ${
        session.mode === 'board' || session.mode === 'thoughtmap' || session.mode === 'uno' || session.mode === 'study' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={session.mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`w-full h-full flex flex-col items-center justify-center ${
              session.mode === 'board' || session.mode === 'thoughtmap' || session.mode === 'uno' ? '' : 'p-4 md:p-8'
            }`}
          >
            {renderActivity()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
});

function SessionContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const sessionId = id as string;
  const nameFromUrl = searchParams.get("name");

  const [userName, setUserName] = useState(nameFromUrl || "");
  const { socket, isConnected } = useSocket();
  const { session, error, isKicked, userId } = useSession(sessionId, userName, "participant");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "mod" | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [voiceState, setVoiceState] = useState<"connected" | "connecting" | "reconnecting" | "disconnected">("connected");
  const lastSeenMsgCountRef = useRef(0);

  const handleVoiceStateChange = useCallback((state: "connected" | "connecting" | "reconnecting" | "disconnected") => {
    setVoiceState(state);
  }, []);

  // Track chat messages and update unread dot on Menu button
  useEffect(() => {
    if (!session) return;
    const msgs = session.chatMessages || [];
    if (activePanel === "chat") {
      lastSeenMsgCountRef.current = msgs.length;
      setHasUnreadChat(false);
    } else {
      if (msgs.length > lastSeenMsgCountRef.current) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.sender !== userName) {
          setHasUnreadChat(true);
        }
      }
    }
  }, [session?.chatMessages, activePanel, userName]);

  // Instant realtime event for incoming chat message
  useEffect(() => {
    if (!socket) return;
    const onDirectChatMsg = (newMsg: any) => {
      if (activePanel !== "chat" && newMsg.sender !== userName) {
        setHasUnreadChat(true);
      }
    };
    socket.on("chat:message", onDirectChatMsg);
    return () => {
      socket.off("chat:message", onDirectChatMsg);
    };
  }, [socket, activePanel, userName]);

  useEffect(() => {
    if (!session) return;
    const me = session.participants.find(p => p.name === userName);
    if (me && me.micOn !== undefined) {
      setIsMuted(!me.micOn);
    }
  }, [session?.participants, userName]);

  const handleToggleMic = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    socket?.emit("voice:toggle", { sessionId, userName, micOn: !newState });
  }, [isMuted, socket, sessionId, userName]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleOpenChat = useCallback(() => {
    setActivePanel(prev => prev === "chat" ? null : "chat");
    setHasUnreadChat(false);
  }, []);

  const router = useRouter();

  const handleLeaveSession = useCallback(() => {
    try {
      router.push("/");
    } catch {
      window.location.href = "/";
    }
  }, [router]);

  const safeNavigate = useCallback((target: string) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      router.replace(target);
    } catch {
      window.location.assign(target);
    }
  }, [isRedirecting, router]);

  useEffect(() => {
    if (session && userId && session.hostId === userId) {
      safeNavigate(`/host/session/${sessionId}?name=${encodeURIComponent(userName)}`);
    }
  }, [session, userId, sessionId, userName, safeNavigate]);

  // Show NameEntry if no name is set OR if the user is kicked/banned
  if (!userName || isKicked) {
    return <NameEntry sessionId={sessionId} onJoin={setUserName} error={error} />;
  }

  if (!isConnected || !session) {
    return (
      <div className="min-h-[100dvh] bg-[#020617] p-6 flex flex-col items-center justify-center space-y-6 text-white text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h2 className="text-xl font-bold tracking-tight">Joining session...</h2>
          <p className="text-xs text-white/50 font-medium">Connecting to workspace <span className="text-cyan-400 font-mono font-bold tracking-wider">{sessionId}</span></p>
        </div>
      </div>
    );
  }

  if (error) {
    let friendlyTitle = "Unable to Join";
    let friendlyMessage = error;
    const lower = error.toLowerCase();
    if (lower.includes("not found")) {
      friendlyTitle = "Session Not Found";
      friendlyMessage = "That session doesn't exist or has already ended.";
    } else if (lower.includes("banned")) {
      friendlyTitle = "Access Denied";
      friendlyMessage = "You don't have permission to join this session.";
    } else if (lower.includes("ended")) {
      friendlyTitle = "Session Ended";
      friendlyMessage = "This interactive session has concluded.";
    }

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#020617] p-6 text-white text-center isolate">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold mb-2 tracking-tight">{friendlyTitle}</h2>
        <p className="text-white/50 text-sm max-w-sm mb-6 font-medium leading-relaxed">{friendlyMessage}</p>
        <button onClick={() => window.location.href = "/"} className="px-6 h-11 bg-primary text-black font-bold uppercase tracking-wider text-xs rounded-xl touch-manipulation hover:bg-primary/90 transition-all cursor-pointer">Return Home</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#020617] text-white">
      {session.mode === "lobby" ? (
        <Lobby session={session} userName={userName} />
      ) : (
        <ActivityView session={session} userName={userName} socket={socket} />
      )}

      {session && socket && (
        <SessionControls 
          session={session} 
          socket={socket} 
          userName={userName} 
          isHost={false} 
          onLeave={handleLeaveSession} 
          onBack={() => {}} 
          showBar={false}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isMicMuted={isMuted}
          onToggleMic={handleToggleMic}
          onVoiceStateChange={handleVoiceStateChange}
        />
      )}

      <SessionFloatingController 
        isHost={false}
        onLeaveSession={handleLeaveSession}
        onToggleMic={handleToggleMic}
        isMicMuted={isMuted}
        voiceState={voiceState}
        hasUnreadMessages={hasUnreadChat}
        onOpenChat={handleOpenChat}
        onTogglePin={handleToggleFullscreen}
        isPinned={isFullscreen}
      />
    </div>
  );


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


