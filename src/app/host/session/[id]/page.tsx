"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/hooks/useSession";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  GraduationCap, BookOpen, Gamepad2, Scale,
  ChevronRight, HelpCircle, Zap, User, MonitorSmartphone, ShieldCheck,
  Crown, X, Settings, UsersRound, Volume2, VolumeX, StopCircle, Network, BrainCircuit, Swords, Loader2, Sparkles, Users, UserMinus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingBoard } from "@/components/activities/ThinkingBoard";
import { LivePollHost } from "@/components/activities/LivePoll";
import { QuizHost } from "@/components/activities/Quiz";
import { QAHost } from "@/components/activities/QABoard";
import { FocusTimerHost } from "@/components/activities/FocusTimer";
import { TaskTrackerHost } from "@/components/activities/TaskTracker";
import { FITBHost } from "@/components/activities/FillInTheBlank";
import { WordChainHost } from "@/components/activities/WordChain";
import { MostLikelyHost } from "@/components/activities/MostLikelyTo";
import { GroupStudyHost } from "@/components/activities/GroupStudy";
import { UnoHost } from "@/components/activities/UnoGame";
import { LudoHost } from "@/components/activities/LudoGame";
// Decision components
import { ThoughtMapHost } from "@/components/activities/ThoughtMap";
import { CourtroomHost } from "@/components/activities/CourtroomMode";
import { DuelDebateHost } from "@/components/activities/DuelDebate";
import { DecisionEngineHost } from "@/components/activities/DecisionEngine";
import { SessionControls } from "@/components/session/SessionControls";
import { SessionFloatingController } from "@/components/session/SessionFloatingController";


import RMCSGame from "@/components/activities/RMCSGame";

const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
  ssr: false,
  loading: () => <div className="w-36 h-36 bg-white/10 rounded-xl" />,
});

const ACTIVITIES = {
  classroom: [
    { id: "poll",  label: "Live Poll",        desc: "Ask a question, get real-time votes.", icon: GraduationCap, image: "/learn/poll.jpg" },
    { id: "quiz",  label: "Quiz Battle",      desc: "Timed quiz with live leaderboard.", icon: GraduationCap, image: "/learn/quiz.jpg" },
    { id: "qa",    label: "Q&A Board",        desc: "Collect live audience questions.", icon: GraduationCap, image: "/learn/qa.jpg" },
    { id: "fitb",  label: "Fill in the Blank", desc: "Collaborative sentence completion.", icon: GraduationCap, image: "/learn/fitb.jpg" },
  ],
  study: [
    { id: "board",  label: "Thinking Board", desc: "Infinite collaborative idea canvas.", icon: BookOpen, image: "/study/board.jpg" },
    { id: "study",  label: "Group Study",    desc: "Study together with shared notes.", icon: BookOpen, image: "/study/study.jpg" },
    { id: "focus",  label: "Focus Timer",    desc: "Synchronized Pomodoro sessions.", icon: BookOpen, image: "/study/focus.jpg" },
    { id: "tasks",  label: "Task Tracker",   desc: "Assign and track group tasks.", icon: BookOpen, image: "/study/tasks.jpg" },
  ],
  play: [
    { id: "trivia",    label: "Trivia Night",    desc: "Challenge your group with fast-paced general knowledge.", icon: Gamepad2, image: "/games/trivia.jpg" },
    { id: "wordchain", label: "Word Chain",      desc: "A fast-thinking vocabulary game for the whole team.", icon: Gamepad2, image: "/games/wordchain.jpg" },
    { id: "mostlikely",label: "Most Likely To",  desc: "Discover what your friends really think with fun group votes.", icon: Gamepad2, image: "/games/mostlikely.jpg" },

    { id: "rmcs",      label: "RMCS Royale",     desc: "Raja Mantri Chor Sipahi - The classic social deduction game.", icon: Gamepad2, image: "/games/rmcs.jpg" },
    { id: "uno",       label: "UNO Cards",       desc: "The classic card game experience, now fully real-time.", icon: Gamepad2, image: "/games/uno.jpg" },
    { id: "ludo",      label: "Ludo Royale",     desc: "A premium, high-fidelity board game for up to 4 players.", icon: Gamepad2, image: "/games/ludo.jpg" },
  ],
  decide: [
    { id: "thoughtmap", label: "Thought Map",     desc: "Visualize ideas, connect points and build understanding.", icon: Network, image: "/decide/thoughtmap.jpg" },
    { id: "courtroom",  label: "Courtroom Mode",  desc: "Present arguments, listen, and let the jury decide together.", icon: Scale, image: "/decide/courtroom.jpg" },
    { id: "duel",       label: "Duel Debate",     desc: "Two teams. One topic. Debate, respond and win the audience.", icon: Swords, image: "/decide/duel.jpg" },
    { id: "decision",   label: "Decision Engine", desc: "List options, vote, rank and finalize the best decision.", icon: BrainCircuit, image: "/decide/decision.jpg" },
  ]
} as const;

const CATEGORY_INFO = {
  classroom: { title: "Classroom", desc: "Engage your audience with live polls, quizzes, Q&A and more.", icon: GraduationCap, color: "blue" },
  study: { title: "Study", desc: "Collaborate, assign tasks and track study progress together.", icon: BookOpen, color: "green" },
  play: { title: "Play", desc: "Make learning fun with quizzes, games and challenges.", icon: Gamepad2, color: "purple" },
  decide: { title: "Decide", desc: "Structured tools to discuss, debate and reach fair decisions.", icon: Scale, color: "orange" }
};

function LoadingSpinner() {
  return (
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
  );
}

function InvitePanel({ sessionId, open, onClose }: { sessionId: string; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/session/${sessionId}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[60] bg-black/80 pointer-events-auto" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 z-[70] bg-[#0A0D14] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-outfit font-bold text-lg text-white">Invite</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="bg-white p-3 rounded-2xl shadow-xl">
            {joinUrl && <QRCodeSVG value={joinUrl} size={180} level="H" />}
          </div>
          <div className="text-center">
            <p className="text-5xl font-mono font-black text-[#4F46E5]">{sessionId}</p>
          </div>
          <button onClick={copyLink} className="w-full bg-[#4F46E5] text-white font-black h-12 rounded-xl touch-manipulation uppercase text-sm hover:bg-[#4338CA] transition-colors">
            {copied ? "COPIED!" : "COPY LINK"}
          </button>
        </div>
      </div>
    </>
  );
}

function HostSessionContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const sessionId = id as string;
  const hostName = searchParams.get("name") || "Host";

  const { socket } = useSocket();
  const { session, userId, startActivity, updateActivity, endActivity, isConnected } = useSession(sessionId, hostName, "host");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof ACTIVITIES>("classroom");
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState<"chat" | "mod" | null>(null);

  const handleToggleMic = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    socket?.emit("voice:toggle", { sessionId, userName: hostName, micOn: !newState });
  }, [isMuted, socket, sessionId, hostName]);



  const setCategory = (cat: keyof typeof ACTIVITIES) => {
    setActiveCategory(cat);
  };

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

  useEffect(() => {
    if (session && userId && session.hostId !== userId) {
      safeNavigate(`/session/${sessionId}?name=${encodeURIComponent(hostName)}`);
    }
  }, [session, userId, sessionId, hostName, safeNavigate]);

  useEffect(() => {
    if (!session || !userId) return;
    const me = session.participants.find(p => p.userId === userId);
    if (me && me.micOn === isMuted) {
      setIsMuted(!me.micOn);
    }
  }, [session?.participants, userId]);

  const handleExitActivity = useCallback(() => endActivity(), [endActivity]);
  const handleEndSession = useCallback(() => { socket?.emit("session:end", { sessionId }); window.location.href = "/"; }, [socket, sessionId]);
  const handleOpenChat = useCallback(() => setActivePanel(prev => prev === "chat" ? null : "chat"), []);
  const handleOpenModeration = useCallback(() => setActivePanel(prev => prev === "mod" ? null : "mod"), []);

  const handleTogglePin = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);




  const isLive = session?.mode !== "lobby" && (session?.status === "live" || session?.status === "waiting");
  const currentMode = session?.mode ?? "lobby";
  const participants = session?.participants ?? [];
  const joinedCount = participants.length;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <LoadingSpinner />
        <p className="mt-4 font-bold uppercase tracking-widest text-white/40">Syncing Host...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-white overflow-hidden isolate font-sans">

      
      {/* Premium Header */}
      {!(currentMode === 'board' || currentMode === 'thoughtmap') && (
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0 bg-[#0A0D14]/40 premium-blur z-[100] relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative w-24 h-8 md:w-36 md:h-10 transition-transform duration-500 hover:scale-105">
              <Image 
                src="/logo.png" 
                alt="CoAct Logo" 
                fill
                sizes="(max-width: 768px) 144px, 160px"
                className="object-contain"
                priority
              />
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 md:gap-3 bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10 group cursor-default">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] group-hover:text-primary transition-colors hidden md:block">Session ID</span>
              <span className="font-mono text-xs md:text-sm font-black text-primary uppercase tracking-widest">{sessionId}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-4 md:gap-8">
              <div 
                className="relative"
              >
                <div
                  onClick={() => setShowParticipants(!showParticipants)}
                  className={`flex flex-col items-end transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer ${showParticipants ? 'text-primary' : ''}`}
                >
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] group-hover:text-primary/70 transition-colors hidden md:block">Participants</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-sm font-black text-white group-hover:text-primary transition-colors">{joinedCount} Online</span>
                  </div>
                </div>

                {/* Navbar Participant Popover */}
                <AnimatePresence>
                  {showParticipants && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-4 w-64 md:w-72 bg-[#0A0D14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[200] overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Manage Participants</span>
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-black text-black">
                            {hostName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-white">You (Host)</span>
                        </div>
                        {participants.filter(p => p.role !== 'host').map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1A1F2E] flex items-center justify-center text-xs font-bold text-white/70 relative border border-white/5">
                                {p.name.charAt(0).toUpperCase()}
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0A0D14] ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                              </div>
                              <span className={`text-xs font-medium ${p.isConnected ? 'text-white/80' : 'text-white/30'}`}>{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Kick ${p.name}?`)) socket?.emit("mod:kick", { sessionId, targetUserId: p.userId });
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {participants.length <= 1 && (
                          <div className="py-8 text-center">
                            <p className="text-xs text-white/20 font-medium tracking-wide">Waiting for others to join...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-sm font-black text-black shadow-lg shadow-primary/10 transition-transform hover:rotate-6">
                {hostName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Sticky Sidebar Trigger */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: showSidebar ? -100 : 0, opacity: 1 }}
        onClick={() => setShowSidebar(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] bg-white/5 border border-white/10 hover:border-primary/50 text-primary w-10 h-24 rounded-r-[2rem] flex flex-col items-center justify-center gap-2 shadow-2xl backdrop-blur-xl transition-all group overflow-hidden"
      >
        <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
        <UsersRound className="w-4 h-4 group-hover:scale-110 transition-transform relative z-10" />
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
      </motion.button>

      <div className="flex-1 flex min-h-0 relative">
        {/* Collapsible Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebar(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] lg:hidden"
              />
              
               <motion.aside 
                initial={{ x: -400 }}
                animate={{ x: 0 }}
                exit={{ x: -400 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-[150] w-[360px] max-w-[90vw] bg-[#0A0D14]/95 backdrop-blur-3xl border-r border-white/10 p-6 flex flex-col gap-6 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Session Dashboard</span>
                    <button onClick={() => setShowSidebar(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 w-fit">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">ID:</span>
                    <span className="text-sm font-mono font-black text-white tracking-widest uppercase">{sessionId}</span>
                  </div>
                </div>

                {/* Session QR Section */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center group hover:border-primary/30 transition-colors">
                  <div className="bg-white p-3 rounded-xl inline-block mb-4 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <QRCodeSVG value={`${window.location.origin}/session/${sessionId}`} size={120} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Invite Participants</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Scan QR or share ID</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/session/${sessionId}`);
                      alert("Link copied!");
                    }}
                    className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-black hover:border-primary transition-all"
                  >
                    Copy Invite Link
                  </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Crown className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Host Active</h3>
                    <p className="text-xs text-white/40">{hostName}</p>
                  </div>
                </div>

                <div className="flex-1" />
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 shrink-0 pb-10">
                    <button 
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-[0_4px_20px_rgba(239,68,68,0.1)]" 
                      onClick={() => { endActivity(); window.location.href = "/"; }}
                    >
                      <StopCircle className="w-4 h-4" />
                      <span className="text-sm font-black uppercase tracking-wider">End Session</span>
                    </button>
                    <div className="flex items-center justify-between gap-2">
                      <button 
                        onClick={() => alert("Settings Panel Coming Soon!")}
                        className="flex-1 py-3 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all group"
                      >
                        <Settings className="w-5 h-5 text-white/40 group-hover:text-white group-hover:rotate-45 transition-all" />
                      </button>
                      <button 
                        onClick={() => {
                          const list = document.querySelector('.overflow-y-auto');
                          list?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 py-3 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all group"
                      >
                        <UsersRound className="w-5 h-5 text-white/40 group-hover:text-white transition-all" />
                      </button>
                      <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`flex-1 py-3 rounded-xl border border-white/10 flex items-center justify-center transition-all group ${isMuted ? 'bg-red-500/10 border-red-500/30' : 'hover:bg-white/5'}`}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-white/40 group-hover:text-white transition-all" />}
                      </button>
                    </div>
                  </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 relative flex flex-col min-h-0 ${isLive ? "" : "overflow-y-auto"}`}>
          {isLive && socket ? (
            <div className={`w-full h-full flex-1 relative ${
              currentMode === "board" || currentMode === "thoughtmap" || currentMode === "uno" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"
            }`}>
              {currentMode === "board" ? <ThinkingBoard socket={socket} sessionId={sessionId} userName={hostName} session={session} isHost={true} /> :
              currentMode === "poll" ? <LivePollHost session={session} updateActivity={updateActivity} /> :
              currentMode === "quiz" || currentMode === "trivia" ? <QuizHost session={session} updateActivity={updateActivity} /> :
              currentMode === "qa" ? <QAHost session={session} updateActivity={updateActivity} /> :
              currentMode === "focus" ? <FocusTimerHost session={session} updateActivity={updateActivity} /> :
              currentMode === "tasks" ? <TaskTrackerHost session={session} updateActivity={updateActivity} /> :
              currentMode === "fitb" ? <FITBHost session={session} updateActivity={updateActivity} /> :
              currentMode === "wordchain" ? <WordChainHost session={session} socket={socket} userName={hostName} updateActivity={updateActivity} /> :
              currentMode === "mostlikely" ? <MostLikelyHost session={session} updateActivity={updateActivity} /> :
              currentMode === "study" ? <GroupStudyHost session={session} updateActivity={updateActivity} /> :
              currentMode === "uno" ? <UnoHost session={session} socket={socket} userName={hostName} /> :
              currentMode === "ludo" ? <LudoHost session={session} socket={socket} /> :
              currentMode === "thoughtmap" ? <ThoughtMapHost session={session} updateActivity={updateActivity} /> :
              currentMode === "courtroom" ? <CourtroomHost session={session} updateActivity={updateActivity} /> :
              currentMode === "duel" ? <DuelDebateHost session={session} socket={socket} updateActivity={updateActivity} /> :
              currentMode === "decision" ? <DecisionEngineHost session={session} updateActivity={updateActivity} /> :

              currentMode === "rmcs" ? <RMCSGame session={session} socket={socket} userName={hostName} isHost={true} /> :
              null}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto w-full flex flex-col h-full px-4 py-8">
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">What do you want to run?</h1>
                <p className="text-sm md:text-base text-white/60">Choose a mode to start your interactive session</p>
              </div>

              {/* Category Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {(Object.entries(CATEGORY_INFO) as [keyof typeof ACTIVITIES, typeof CATEGORY_INFO['classroom']][]).map(([key, info]) => {
                  const isActive = activeCategory === key;
                  const IconComponent = info.icon;
                  
                  const themes = {
                    blue: { border: "border-blue-500/50", glow: "shadow-[0_0_40px_rgba(59,130,246,0.15)]", text: "text-blue-400", bg: "bg-blue-500/10", active: "border-blue-500" },
                    green: { border: "border-green-500/50", glow: "shadow-[0_0_40px_rgba(34,197,94,0.15)]", text: "text-green-400", bg: "bg-green-500/10", active: "border-green-500" },
                    purple: { border: "border-purple-500/50", glow: "shadow-[0_0_40px_rgba(168,85,247,0.15)]", text: "text-purple-400", bg: "bg-purple-500/10", active: "border-purple-500" },
                    orange: { border: "border-orange-500/50", glow: "shadow-[0_0_40px_rgba(249,115,22,0.15)]", text: "text-orange-400", bg: "bg-orange-500/10", active: "border-orange-500" },
                  };

                  const theme = themes[info.color as keyof typeof themes];

                  return (
                    <motion.div 
                      key={key} 
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveCategory(key)} 
                      className={`relative rounded-[24px] md:rounded-[32px] p-4 md:p-6 cursor-pointer border transition-all duration-500 h-auto md:h-[220px] flex flex-row md:flex-col items-center md:items-start justify-start md:justify-between overflow-hidden group gap-4 md:gap-0
                        ${isActive 
                          ? `${theme.active} ${theme.glow} bg-white/[0.05] scale-[1.02]` 
                          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                        } backdrop-blur-3xl`}
                    >
                      {/* Glass Highlight */}
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 w-full">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center md:mb-5 transition-all duration-300 shrink-0 ${isActive ? theme.bg : "bg-white/5"} group-hover:scale-110`}>
                          <IconComponent className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? theme.text : "text-white/40"}`} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-bold text-white md:mb-2 tracking-tight">
                            {info.title}
                          </h3>
                          <p className="hidden md:block text-sm text-white/50 leading-relaxed line-clamp-2 font-medium">{info.desc}</p>
                        </div>
                      </div>

                      <div className="hidden md:flex relative z-10 items-center justify-between pt-4 mt-auto border-t border-white/5 w-full">
                        <span className={`text-sm font-bold tracking-wide transition-colors ${isActive ? "text-white" : "text-white/40"}`}>Explore</span>
                        <ChevronRight className={`w-4 h-4 transition-all ${isActive ? "text-white translate-x-0" : "text-white/20 -translate-x-2"}`} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected Category Area */}
              <div className={`border rounded-[32px] md:rounded-[40px] p-4 md:p-8 mb-8 flex-1 transition-all duration-500 glass-card
                ${activeCategory === 'classroom' ? 'border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.1)]' : 
                  activeCategory === 'study' ? 'border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)]' : 
                  activeCategory === 'play' ? 'border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.1)]' : 
                  'border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)]'} bg-white/[0.02] backdrop-blur-3xl`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500
                      ${activeCategory === 'classroom' ? 'bg-blue-500/20 text-blue-400' : 
                        activeCategory === 'study' ? 'bg-green-500/20 text-green-400' : 
                        activeCategory === 'play' ? 'bg-purple-500/20 text-purple-400' : 
                        'bg-orange-500/20 text-orange-400'}`}
                    >
                      {(() => {
                        const Icon = CATEGORY_INFO[activeCategory].icon;
                        return <Icon className="w-10 h-10" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {CATEGORY_INFO[activeCategory].title}
                      </h2>
                      <p className="text-sm md:text-lg text-white/50 font-medium">{CATEGORY_INFO[activeCategory].desc}</p>
                    </div>
                  </div>
                  <button className="w-fit flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20 transition-all font-bold tracking-wide text-sm md:text-base">
                    <HelpCircle className="w-4 h-4 md:w-5 md:h-5" /> How it works
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeCategory}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                  >
                    {ACTIVITIES[activeCategory].map(act => {
                      const ActIcon = act.icon;
                      const hasImage = !!(act as any).image;

                      return (
                        <motion.div 
                          key={act.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`group cursor-pointer transition-all duration-300 hover:-translate-y-2`} 
                          onClick={() => {
                            const needsSetup = ["poll", "quiz", "qa", "fitb", "trivia", "wordchain", "mostlikely", "study", "uno", "ludo", "thoughtmap", "courtroom", "duel", "decision", "rmcs"];
                            startActivity(act.id as never, {}, needsSetup.includes(act.id) ? "waiting" : "live");
                          }}
                        >
                          {hasImage ? (
                            <div className="flex flex-col gap-5">
                              <div className={`aspect-square rounded-[32px] overflow-hidden border border-white/10 relative transition-all duration-500 shadow-2xl bg-black/20 group-hover:border-${CATEGORY_INFO[activeCategory].color}-500/50 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]`}>
                                <img 
                                  src={(act as any).image} 
                                  alt={act.label} 
                                  className="absolute inset-0 w-full h-full object-contain p-2 transition-all duration-700 group-hover:scale-105 saturate-[1.1]" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={`absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl
                                  ${activeCategory === 'classroom' ? 'bg-blue-500 text-white' : 
                                    activeCategory === 'study' ? 'bg-green-500 text-white' : 
                                    activeCategory === 'play' ? 'bg-purple-500 text-white' : 
                                    'bg-orange-500 text-white'}`}
                                >
                                  <ChevronRight className="w-7 h-7" />
                                </div>
                              </div>
                              <div className="px-3">
                                <h3 className={`font-outfit font-black text-2xl text-white transition-colors tracking-tight
                                  ${activeCategory === 'classroom' ? 'group-hover:text-blue-400' : 
                                    activeCategory === 'study' ? 'group-hover:text-green-400' : 
                                    activeCategory === 'play' ? 'group-hover:text-purple-400' : 
                                    'group-hover:text-orange-400'}`}
                                >
                                  {act.label}
                                </h3>
                                <p className="text-sm text-white/50 mt-2 leading-relaxed font-medium line-clamp-2">{act.desc}</p>
                              </div>
                            </div>
                          ) : (
                            <div className={`h-full rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 flex flex-col transition-all duration-500 hover:border-white/20
                              ${activeCategory === 'classroom' ? 'hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 
                                activeCategory === 'study' ? 'hover:shadow-[0_0_40px_rgba(34,197,94,0.1)]' : 
                                activeCategory === 'play' ? 'hover:shadow-[0_0_40px_rgba(168,85,247,0.1)]' : 
                                'hover:shadow-[0_0_40px_rgba(249,115,22,0.1)]'}`}
                            >
                              <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-500
                                  ${activeCategory === 'classroom' ? 'bg-blue-500/20 text-blue-400' : 
                                    activeCategory === 'study' ? 'bg-green-500/20 text-green-400' : 
                                    activeCategory === 'play' ? 'bg-purple-500/20 text-purple-400' : 
                                    'bg-orange-500/20 text-orange-400'}`}
                                >
                                  <ActIcon className="w-7 h-7" />
                                </div>
                              </div>
                              <h3 className="font-black text-2xl text-white mb-3 tracking-tight">{act.label}</h3>
                              <p className="text-sm text-white/50 flex-1 leading-relaxed font-medium">{act.desc}</p>
                              
                              <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/5">
                                <span className="text-sm font-black text-white/70 group-hover:text-white transition-colors tracking-wider uppercase">Launch Activity</span>
                                <ChevronRight className={`w-5 h-5 transition-all
                                  ${activeCategory === 'classroom' ? 'text-blue-400' : 
                                    activeCategory === 'study' ? 'text-green-400' : 
                                    activeCategory === 'play' ? 'text-purple-400' : 
                                    'text-orange-400'}`} 
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 px-4 py-6 border-t border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Real-time</h4>
                    <p className="text-xs text-white/40">Instant updates and live participation</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No Login</h4>
                    <p className="text-xs text-white/40">Just enter your name and join instantly</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <MonitorSmartphone className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Cross-Platform</h4>
                    <p className="text-xs text-white/40">Works on any device, anywhere</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Secure & Private</h4>
                    <p className="text-xs text-white/40">Your sessions are safe and private</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      {session && socket && (
        <SessionControls 
          session={session} 
          socket={socket} 
          userName={hostName} 
          isHost={true} 
          onLeave={() => window.location.href = "/"}
          onBack={handleExitActivity}
          showBar={false}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
        />
      )}

      <InvitePanel sessionId={sessionId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <SessionFloatingController 
        isHost={true}
        onExitActivity={handleExitActivity}
        onEndSession={handleEndSession}
        onToggleMic={handleToggleMic}
        isMicMuted={isMuted}
        onOpenChat={handleOpenChat}
        onOpenModeration={handleOpenModeration}
        onTogglePin={handleTogglePin}
        isPinned={isFullscreen}
      />


    </div>
  );
}

export default function HostSession() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505]"><LoadingSpinner /></div>}>
      <HostSessionContent />
    </Suspense>
  );
}


