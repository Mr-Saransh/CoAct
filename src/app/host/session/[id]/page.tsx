"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/hooks/useSession";
import { useSocket } from "@/components/providers/SocketProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Briefcase, Gamepad2, Play, UsersRound,
  Copy, Check, StopCircle, Wifi, WifiOff, QrCode, X, Crown, Menu
} from "lucide-react";
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
import { SessionControls } from "@/components/session/SessionControls";

const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
  ssr: false,
  loading: () => <div className="w-36 h-36 bg-white/10 rounded-xl" />,
});

const ACTIVITIES = {
  office: [
    { id: "poll",  label: "Live Poll",        desc: "Ask a question, get real-time votes." },
    { id: "quiz",  label: "Quiz Battle",       desc: "Timed quiz with live leaderboard." },
    { id: "qa",    label: "Q&A Board",         desc: "Collect live audience questions." },
    { id: "fitb",  label: "Fill in the Blank", desc: "Collaborative sentence completion." },
  ],
  study: [
    { id: "board",  label: "Thinking Board", desc: "Infinite collaborative idea canvas." },
    { id: "study",  label: "Group Study",    desc: "Study together with shared notes." },
    { id: "focus",  label: "Focus Timer",    desc: "Synchronized Pomodoro sessions." },
    { id: "tasks",  label: "Task Tracker",   desc: "Assign and track group tasks." },
  ],
  games: [
    { id: "trivia",    label: "Trivia Night",    desc: "Fast-paced general knowledge." },
    { id: "wordchain", label: "Word Chain",      desc: "Chain words with the group." },
    { id: "mostlikely",label: "Most Likely To",  desc: "Vote on fun group questions." },
    { id: "uno",       label: "UNO Cards",       desc: "Real-time multiplayer UNO style game." },
    { id: "ludo",      label: "Ludo Royale",     desc: "Premium real-time board game experience." },
  ],
} as const;

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
      <div className={`fixed top-0 right-0 h-full w-80 z-[70] bg-[#0D1117] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto ${open ? "translate-x-0" : "translate-x-full"}`}>
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
            <p className="text-5xl font-mono font-black text-primary">{sessionId}</p>
          </div>
          <button onClick={copyLink} className="w-full bg-primary text-black font-black h-12 rounded-xl touch-manipulation uppercase text-sm">
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
  const { session, startActivity, updateActivity, endActivity, isConnected } = useSession(sessionId, hostName, "host");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  useEffect(() => {
    if (session && socket && session.hostId !== socket.id) {
      safeNavigate(`/session/${sessionId}?name=${encodeURIComponent(hostName)}`);
    }
  }, [session, socket, sessionId, hostName, safeNavigate]);

  const isLive = session?.status === "live" || (session?.status === "waiting" && session?.mode !== "lobby");
  const currentMode = session?.mode ?? "lobby";
  const participants = (session?.participants ?? []).filter((p) => p.role !== "host");

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#020617] text-white">
        <LoadingSpinner />
        <p className="mt-4 font-bold uppercase tracking-widest text-white/40">Syncing Host...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#020617] text-white overflow-y-auto isolate">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />

      {/* Mobile Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 left-6 z-[80] w-14 h-14 rounded-full bg-primary shadow-2xl flex items-center justify-center border-2 border-white/20 active:scale-90 transition-transform touch-manipulation"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-black" /> : <Menu className="w-6 h-6 text-black" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 shrink-0 border-r border-white/10 bg-[#0D1117] z-50 transition-transform duration-300 pointer-events-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col p-4 gap-4`}>
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-2 rounded-lg border ${isConnected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"}`}>
          {isConnected ? "CONNECTED" : "CONNECTING..."}
        </div>

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate text-sm uppercase tracking-tighter">{hostName}</p>
          </div>
        </div>

        <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black h-10 rounded-xl touch-manipulation uppercase text-[10px] tracking-widest" onClick={() => setInviteOpen(true)}>
          INVITE
        </button>

        <div className="flex-1 flex flex-col min-h-0 bg-white/5 rounded-2xl border border-white/5 p-3">
          <p className="text-[10px] font-black text-white/40 mb-3 uppercase tracking-widest">Participants ({participants.length})</p>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-xs font-bold border border-white/5">
                <span className="truncate flex-1">{p.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        </div>

        {isLive && (
          <button className="w-full bg-red-500 text-white font-black text-[10px] h-12 rounded-xl touch-manipulation uppercase tracking-widest" onClick={endActivity}>
            STOP ACTIVITY
          </button>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 lg:p-8 relative pointer-events-auto">
        <div className="max-w-6xl mx-auto">
          {isLive && socket ? (
            <div className="w-full h-full min-h-[70vh]">
               {currentMode === "board" ? <ThinkingBoard socket={socket} sessionId={sessionId} userName={hostName} session={session} isHost={true} /> :
                currentMode === "poll" ? <LivePollHost session={session} updateActivity={updateActivity} /> :
                currentMode === "quiz" || currentMode === "trivia" ? <QuizHost session={session} updateActivity={updateActivity} /> :
                currentMode === "qa" ? <QAHost session={session} updateActivity={updateActivity} /> :
                currentMode === "focus" ? <FocusTimerHost session={session} updateActivity={updateActivity} /> :
                currentMode === "tasks" ? <TaskTrackerHost session={session} updateActivity={updateActivity} /> :
                currentMode === "fitb" ? <FITBHost session={session} updateActivity={updateActivity} /> :
                currentMode === "wordchain" ? <WordChainHost session={session} updateActivity={updateActivity} /> :
                currentMode === "mostlikely" ? <MostLikelyHost session={session} updateActivity={updateActivity} /> :
                currentMode === "study" ? <GroupStudyHost session={session} updateActivity={updateActivity} /> :
                currentMode === "uno" ? <UnoHost session={session} socket={socket} /> :
                currentMode === "ludo" ? <LudoHost session={session} socket={socket} /> :
                null}
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-outfit font-black italic mb-2 tracking-tighter">Host Panel</h1>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Select Group Activity</p>
              </div>

              <Tabs defaultValue="office" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 mb-8 p-1">
                  <TabsTrigger value="office" className="px-6 py-2 font-black uppercase text-xs">OFFICE</TabsTrigger>
                  <TabsTrigger value="study" className="px-6 py-2 font-black uppercase text-xs">STUDY</TabsTrigger>
                  <TabsTrigger value="games" className="px-6 py-2 font-black uppercase text-xs">GAMES</TabsTrigger>
                </TabsList>

                {(["office", "study", "games"] as const).map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ACTIVITIES[tab].map((act) => (
                        <Card key={act.id} className="border-white/10 bg-[#121826] hover:border-primary/50 transition-all group">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold">{act.label}</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-white/40">{act.desc}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <button
                              onClick={() => {
                                const needsSetup = ["poll", "quiz", "qa", "fitb", "trivia", "wordchain", "mostlikely", "study", "uno", "ludo"];
                                startActivity(act.id as never, {}, needsSetup.includes(act.id) ? "waiting" : "live");
                              }}
                              className="w-full bg-white/5 group-hover:bg-primary group-hover:text-black font-black uppercase text-[10px] tracking-widest h-10 rounded-xl transition-all touch-manipulation"
                            >
                              START
                            </button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      </main>

      <SessionControls 
        session={session} 
        socket={socket} 
        userName={hostName} 
        isHost={true} 
        onLeave={() => { endActivity(); window.location.href = "/"; }} 
        onBack={() => { endActivity(); }} 
      />

      <InvitePanel sessionId={sessionId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

export default function HostSession() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#020617]"><LoadingSpinner /></div>}>
      <HostSessionContent />
    </Suspense>
  );
}
