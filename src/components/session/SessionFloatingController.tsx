"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  Settings, ArrowLeft, Mic, MicOff, MessageSquare, 
  Shield, Pin, LogOut, GripVertical, ChevronLeft,
  Volume2, VolumeX
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  isPinned = false
}: SessionFloatingControllerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pokeTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 5000);
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

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ x: 0, y: 0 }}
      className="fixed z-[1000] touch-none right-4 sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+1.25rem)] sm:bottom-6"
      onDragStart={handleInteraction}
      onDrag={handleInteraction}
    >
      <div className="relative flex flex-col-reverse sm:flex-row-reverse items-end sm:items-center gap-2">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.button
              key="collapsed"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              onClick={() => setIsOpen(true)}
              className="w-12 h-12 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black transition-all shadow-[0_4px_24px_rgba(0,0,0,0.6)] group active:scale-95 cursor-pointer"
              aria-label="Open Session Controls"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-45 transition-transform" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-[#0A0D14]/95 backdrop-blur-3xl border border-white/15 rounded-2xl sm:rounded-full p-1.5 sm:p-2 flex flex-col-reverse sm:flex-row-reverse items-center gap-1.5 shadow-[0_12px_48px_rgba(0,0,0,0.85)] border-t-white/20"
              onPointerDown={handleInteraction}
            >
              <div className="flex flex-col-reverse sm:flex-row items-center gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  title="Close Controls"
                >
                  <ChevronLeft className="w-5 h-5 -rotate-90 sm:rotate-0" />
                </button>

                {isHost && onExitActivity && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onExitActivity();
                      setIsOpen(false);
                    }}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50 hover:bg-cyan-500/30 transition-all cursor-pointer"
                    title="Exit Activity to Lobby"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                
                <div className="h-px w-6 sm:h-6 sm:w-px bg-white/10 my-0.5 sm:my-0 sm:mx-1" />

                <ControllerButton 
                  icon={isMicMuted ? MicOff : Mic} 
                  onClick={onToggleMic} 
                  active={!isMicMuted}
                  activeColor="text-cyan-400"
                  label={isMicMuted ? "Unmute" : "Mute"}
                  onInteraction={handleInteraction}
                />

                <ControllerButton 
                  icon={MessageSquare} 
                  onClick={onOpenChat} 
                  label="Chat"
                  onInteraction={handleInteraction}
                />

                {isHost && (
                  <ControllerButton 
                    icon={Shield} 
                    onClick={onOpenModeration} 
                    label="Moderation"
                    onInteraction={handleInteraction}
                  />
                )}

                <ControllerButton 
                  icon={Pin} 
                  onClick={onTogglePin} 
                  active={isPinned}
                  activeColor="text-amber-400"
                  label={isPinned ? "Unpin UI" : "Pin UI"}
                  onInteraction={handleInteraction}
                />

                <div className="h-px w-6 sm:h-6 sm:w-px bg-white/10 my-0.5 sm:my-0 sm:mx-1" />

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    isHost ? onEndSession?.() : onLeaveSession?.();
                  }}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  title={isHost ? "End Session" : "Leave Session"}
                  onPointerDown={handleInteraction}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

function ControllerButton({ 
  icon: Icon, 
  onClick, 
  active = false, 
  activeColor = "text-cyan-400",
  label,
  onInteraction
}: { 
  icon: any; 
  onClick?: () => void; 
  active?: boolean; 
  activeColor?: string;
  label: string;
  onInteraction?: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onInteraction?.();
        onClick?.();
      }}
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
        active ? `${activeColor} bg-white/10 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]` : "text-white/40 hover:text-white hover:bg-white/5"
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
