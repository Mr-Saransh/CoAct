"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, X, ArrowLeft, Mic, MicOff, MessageSquare, 
  Shield, Pin, LogOut, GraduationCap, BookOpen, 
  Scale, Gamepad2, ChevronRight
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
      }, 10000); // 10s auto-dismiss on inactivity
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

  const sections: { id: 'classroom' | 'study' | 'decide' | 'play'; label: string; icon: any; color: string; desc: string }[] = [
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
      className="fixed z-[1000] touch-none right-4 sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+1.25rem)] sm:bottom-6"
      onDragStart={handleInteraction}
      onDrag={handleInteraction}
    >
      <div className="relative flex flex-col items-end">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* OBVIOUS NAVIGATION CONTROL (Section 36, 37, 38, 41) */
            <motion.button
              key="collapsed-nav"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="h-10 sm:h-11 px-3.5 sm:px-4 bg-slate-900/95 hover:bg-slate-800 text-white border border-cyan-500/40 hover:border-cyan-400 rounded-full flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer font-medium text-xs sm:text-sm tracking-wide ring-1 ring-cyan-500/20 group"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                Menu
                {hasUnreadMessages && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse" />
                )}
              </span>
            </motion.button>
          ) : (
            /* COMPACT NAVIGATION PANEL (Section 39, 40) */
            <motion.div
              key="expanded-nav"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-72 sm:w-80 bg-slate-950/98 backdrop-blur-3xl border border-slate-700/80 rounded-2xl p-3 shadow-[0_16px_48px_rgba(0,0,0,0.9)] flex flex-col gap-2.5 text-white ring-1 ring-white/10"
              onPointerDown={handleInteraction}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Session Navigation</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Core Sections */}
              <div className="grid grid-cols-2 gap-1.5">
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isCurrent = currentSection === sec.id;
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
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{sec.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{sec.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Session Controls Row */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                {isHost && onExitActivity && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExitActivity();
                      setIsOpen(false);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                    title="Exit to Activity Selection"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lobby</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Useful Voice Connection State (Requirement 7) */}
                  <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 select-none">
                    {isMicMuted ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                        <span className="text-slate-400">Muted</span>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span className="text-emerald-400">Connected</span>
                      </>
                    )}
                  </div>

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
                      title={isMicMuted ? "Unmute Voice" : "Mute Voice"}
                    >
                      {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}

                  {onOpenChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChat();
                      }}
                      className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                      title="Open Group Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {hasUnreadMessages && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse" />
                      )}
                    </button>
                  )}

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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isHost) {
                        onEndSession?.();
                      } else {
                        onLeaveSession?.();
                      }
                    }}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/40 transition-colors cursor-pointer ml-1"
                    title={isHost ? "End Session" : "Leave Session"}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
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
