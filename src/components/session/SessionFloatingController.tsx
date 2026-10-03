"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, X, ArrowLeft, Mic, MicOff, MessageSquare, 
  Shield, Pin, LogOut, GraduationCap, BookOpen, 
  Scale, Gamepad2, Crown, User, Radio, Sparkles
} from "lucide-react";

interface SessionFloatingControllerProps {
  isHost?: boolean;
  onExitActivity?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  onToggleMic?: () => void;
  onOpenChat?: () => void;
  onOpenModeration?: () => void;
  onTogglePin?: () => void;
  isMicMuted?: boolean;
  isPinned?: boolean;
  voiceState?: "connected" | "connecting" | "reconnecting" | "disconnected";
  hasUnreadMessages?: boolean;
  onNavigateSection?: (section: 'classroom' | 'study' | 'decide' | 'play') => void;
  currentSection?: string;
}

export const SessionFloatingController = React.memo(({
  isHost = false,
  onExitActivity,
  onEndSession,
  onLeaveSession,
  onToggleMic,
  onOpenChat,
  onOpenModeration,
  onTogglePin,
  isMicMuted = false,
  isPinned = false,
  voiceState = "connected",
  hasUnreadMessages = false,
  onNavigateSection,
  currentSection,
}: SessionFloatingControllerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pokeTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 12000); // 12s auto-dismiss on inactivity
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      pokeTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, pokeTimer]);

  const handleInteraction = () => {
    pokeTimer();
  };

  // Helper to map current active mode or category to human-readable info
  const getCurrentAreaInfo = (secId?: string) => {
    if (!secId) return { name: "Interactive Space", category: "Session", icon: Sparkles, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    const lower = secId.toLowerCase();
    if (lower === "lobby") {
      return { name: "Session Lobby", category: "Waiting Room", icon: User, color: "text-slate-300 bg-slate-800/80 border-slate-700" };
    }
    if (lower === "classroom" || lower === "poll" || lower === "quiz" || lower === "trivia" || lower === "qa" || lower === "focus" || lower === "tasks") {
      const specific = lower === "poll" ? "Live Poll" : lower === "quiz" ? "Live Quiz" : lower === "qa" ? "Q&A Board" : lower === "focus" ? "Focus Timer" : lower === "tasks" ? "Task Tracker" : "Classroom Hub";
      return { name: specific, category: "Classroom", icon: GraduationCap, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    }
    if (lower === "study" || lower === "board") {
      const specific = lower === "board" ? "Thinking Board" : "Group Document Studio";
      return { name: specific, category: "Study", icon: BookOpen, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (lower === "decide" || lower === "thoughtmap" || lower === "courtroom" || lower === "duel" || lower === "decision") {
      const specific = lower === "thoughtmap" ? "Thought Map" : lower === "courtroom" ? "Courtroom Debate" : lower === "duel" ? "Duel Debate" : lower === "decision" ? "Decision Engine" : "Decide Space";
      return { name: specific, category: "Decide", icon: Scale, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (lower === "play" || lower === "uno" || lower === "ludo" || lower === "wordchain" || lower === "fitb" || lower === "mostlikely") {
      const specific = lower === "uno" ? "Uno Cards" : lower === "ludo" ? "Ludo Arena" : lower === "wordchain" ? "Word Chain" : lower === "fitb" ? "Fill in Blank" : "Social Games";
      return { name: specific, category: "Play", icon: Gamepad2, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }
    return { name: secId.charAt(0).toUpperCase() + secId.slice(1), category: "Activity", icon: Sparkles, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  };

  const currentArea = getCurrentAreaInfo(currentSection);
  const CurrentAreaIcon = currentArea.icon;

  const hostSections: { id: 'classroom' | 'study' | 'decide' | 'play'; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'classroom', label: 'Classroom', icon: GraduationCap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', desc: 'Polls & Quizzes' },
    { id: 'study', label: 'Study', icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', desc: 'Document & Board' },
    { id: 'decide', label: 'Decide', icon: Scale, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Thought Map & Debate' },
    { id: 'play', label: 'Play', icon: Gamepad2, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', desc: 'Social Games' },
  ];

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={{ top: -600, bottom: 0, left: -600, right: 0 }}
      initial={{ x: 0, y: 0 }}
      className="fixed z-[1000] touch-none right-3 sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+4.25rem)] sm:bottom-6"
      onDragStart={handleInteraction}
      onDrag={handleInteraction}
    >
      <div className="relative flex flex-col items-end">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* REQUIREMENT 18, 19, 24: CLEAN FLOATING NAVIGATION CONTROL [ ≡ Navigation ] WITH UNREAD DOT */
            <motion.button
              key="collapsed-nav"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="h-10 sm:h-11 px-3.5 sm:px-4 bg-slate-950/95 hover:bg-slate-900 text-white border border-cyan-500/50 hover:border-cyan-400 rounded-full flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer font-medium text-xs sm:text-sm tracking-wide ring-1 ring-cyan-500/30 group"
              aria-label="Open Navigation"
              title="Open Navigation"
            >
              {/* Navigation Icon (Menu ≡ bars) */}
              <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                Navigation
                {/* REQUIREMENT 24: UNREAD MESSAGE INDICATOR (Navigation •) */}
                {hasUnreadMessages && (
                  <span 
                    className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse" 
                    title="New unread message"
                  />
                )}
              </span>
            </motion.button>
          ) : (
            /* REQUIREMENT 22, 23: NAVIGATION PANEL / MOBILE BOTTOM SHEET */
            <motion.div
              key="expanded-nav"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-80 sm:w-84 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-7rem)] overflow-y-auto custom-scrollbar bg-slate-950/98 backdrop-blur-3xl border border-slate-700/80 rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col gap-3 text-white ring-1 ring-white/10"
              onPointerDown={handleInteraction}
            >
              {/* Header: Title + Role Badge + Close */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {isHost ? "Session Navigation" : "Navigation"}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isHost 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  }`}>
                    {isHost ? "Host" : "Participant"}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Close Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* REQUIREMENT 20, 22: CURRENT ACTIVE SESSION AREA (Prominently displayed) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentArea.color} shrink-0`}>
                  <CurrentAreaIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active Area
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {currentArea.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {isHost ? "You are controlling this area" : "Synchronized with Host"}
                  </div>
                </div>
              </div>

              {/* REQUIREMENT 20, 21: HOST VS PARTICIPANT CONTENT */}
              {isHost ? (
                /* HOST CONTROLS: Switch Active Interaction Area */
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                    Switch Active Area
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {hostSections.map((sec) => {
                      const Icon = sec.icon;
                      const isCurrent = currentSection?.toLowerCase() === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateSection) {
                              onNavigateSection(sec.id);
                            } else if (onExitActivity) {
                              onExitActivity();
                            }
                            setIsOpen(false);
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                            isCurrent 
                              ? `${sec.color} ring-1 ring-cyan-400 shadow-md` 
                              : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${sec.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{sec.label}</div>
                            <div className="text-[9px] text-slate-500 truncate">{sec.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* PARTICIPANT: DO NOT show choice of Classroom/Study/Decide/Play. Informational note only. */
                <div className="px-1 py-0.5 text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                  <span>Activity transitions are synchronized by your host</span>
                </div>
              )}

              {/* REQUIREMENT 22: AVAILABLE CONTROLS ROW */}
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                  Controls
                </div>

                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  {/* Host Lobby Return */}
                  {isHost && onExitActivity && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExitActivity();
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
                      title="Return to Activity Selection"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Lobby</span>
                    </button>
                  )}

                  {/* Voice Status Pill */}
                  <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 select-none">
                    {isMicMuted ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-slate-400">Mic Muted</span>
                      </>
                    ) : voiceState === "connecting" ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-300">Connecting</span>
                      </>
                    ) : voiceState === "reconnecting" ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-300">Reconnecting</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                        <span className="text-emerald-400 font-semibold">Voice Live</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Mic Toggle Button */}
                    {onToggleMic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMic();
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isMicMuted 
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                            : 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800'
                        }`}
                        title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Chat Toggle Button */}
                    {onOpenChat && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat();
                        }}
                        className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title="Open Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {hasUnreadMessages && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse" />
                        )}
                      </button>
                    )}

                    {/* Host Moderation Button */}
                    {isHost && onOpenModeration && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModeration();
                        }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title="Moderation Controls"
                      >
                        <Shield className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {/* Pin / Fullscreen Toggle */}
                    {onTogglePin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin();
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isPinned 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isPinned ? "Exit Fullscreen" : "Fullscreen"}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    )}

                    {/* End / Leave Session Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isHost) {
                          onEndSession?.();
                        } else {
                          onLeaveSession?.();
                        }
                      }}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/40 transition-colors cursor-pointer"
                      title={isHost ? "End Session" : "Leave Session"}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

SessionFloatingController.displayName = "SessionFloatingController";
