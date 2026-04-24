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
  isMicMuted?: boolean;
}

export const SessionFloatingController = React.memo(({
  isHost = false,
  onExitActivity,
  onEndSession,
  onLeaveSession,
  onToggleMic,
  onOpenChat,
  onOpenModeration,
  isMicMuted = false
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
      initial={{ x: 20, y: window.innerHeight - 150 }}
      className="fixed z-[100] touch-none"
      onDragStart={handleInteraction}
      onDrag={handleInteraction}
    >
      <div className="relative flex items-center">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.button
              key="collapsed"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              onClick={() => {
                setIsOpen(true);
              }}
              className="w-12 h-12 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black transition-colors shadow-2xl group"
            >
              <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ width: 48, opacity: 0, scale: 0.8 }}
              animate={{ width: "auto", opacity: 1, scale: 1 }}
              exit={{ width: 48, opacity: 0, scale: 0.8 }}
              className="bg-[#0A0D14]/95 backdrop-blur-3xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-1 shadow-[0_0_80px_rgba(0,0,0,0.8)] border-t-white/20"
              onPointerDown={handleInteraction}
            >
              <div className="flex items-center gap-1 px-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="w-px h-8 bg-white/10 mx-2" />

                {onExitActivity && (
                  <ControllerButton 
                    icon={LogOut} 
                    onClick={onExitActivity} 
                    label="Back to Lobby"
                    onInteraction={handleInteraction}
                  />
                )}

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
                  onClick={() => {}} 
                  label="Pin UI"
                  onInteraction={handleInteraction}
                />

                <div className="w-px h-8 bg-white/10 mx-2" />

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    isHost ? onEndSession?.() : onLeaveSession?.();
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
        active ? `${activeColor} bg-white/10 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]` : "text-white/40 hover:text-white hover:bg-white/5"
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
