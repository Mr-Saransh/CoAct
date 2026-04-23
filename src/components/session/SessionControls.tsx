import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut, Mic, MicOff, MessageSquare, Shield, Send, Users, UserMinus, Pin, X, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceChannel } from "@/hooks/useVoiceChannel";

export function SessionControls({ 
  session, 
  socket, 
  userName, 
  isHost, 
  onLeave, 
  onBack 
}: { 
  session: any; 
  socket: any; 
  userName: string; 
  isHost: boolean; 
  onLeave: () => void; 
  onBack: () => void; 
}) {
  const [activePanel, setActivePanel] = useState<"chat" | "mod" | null>(null);
  const [message, setMessage] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const { peers, isSpeaking } = useVoiceChannel(session?.id, socket, userName, voiceActive);

  const me = session?.participants?.find((p: any) => p.name === userName);
  const isMutedByHost = me?.mutedByHost;

  // Sync voiceActive with session state
  useEffect(() => {
    if (!session) return;
    if (me && me.micOn !== voiceActive) {
      setVoiceActive(me.micOn);
    }
  }, [session?.participants, userName]);

  // Auto-join voice for games and study modes
  useEffect(() => {
    if (!session) return;
    const gameModes = ["trivia", "wordchain", "mostlikely", "quiz", "study", "uno", "ludo", "antakshari"];

    // If we are in a game mode and just got unmuted (or just joined), auto-enable mic
    if (gameModes.includes(session.mode) && !voiceActive && !isMutedByHost) {
      setVoiceActive(true);
      socket.emit("voice:toggle", { sessionId: session.id, userName, micOn: true });
    }
  }, [session?.mode, isMutedByHost]);

  if (!session) return null;

  const toggleVoice = () => {
    if (isMutedByHost) {
      alert("You have been muted by the host.");
      return;
    }
    const newState = !voiceActive;
    setVoiceActive(newState);
    socket.emit("voice:toggle", { sessionId: session.id, userName, micOn: newState });
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("chat:message", { sessionId: session.id, userName, text: message.trim() });
    setMessage("");
  };

  const togglePanel = (panel: "chat" | "mod") => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const kickUser = (targetName: string) => {
    if (confirm(`Remove ${targetName} from the session?`)) {
      socket.emit("mod:kick", { sessionId: session.id, targetName });
    }
  };

  const promoteToHost = (targetId: string, targetName: string) => {
    if (confirm(`Transfer host role to ${targetName}? You will become a participant.`)) {
      socket.emit("session:promote", { sessionId: session.id, targetUserId: targetId });
    }
  };

  const toggleMute = (targetName: string, isMuted: boolean) => {
    socket.emit("mod:mute", { sessionId: session.id, targetName, isMuted: !isMuted });
  };

  const togglePin = (messageId: string, isPinned: boolean) => {
    socket.emit("chat:pin", { sessionId: session.id, messageId, pinned: !isPinned });
  };

  return (
    <>
      {/* Floating Draggable Control Bar */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0}
        whileDrag={{ scale: 1.02, cursor: "grabbing" }}
        className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 md:gap-3 bg-white/[0.08] backdrop-blur-[32px] border border-white/10 px-4 py-3 md:px-6 md:py-4 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] cursor-grab touch-none select-none pointer-events-auto ring-1 ring-white/10"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            title="Go Back" 
            className="text-white hover:bg-white/10 rounded-full w-10 h-10 md:w-14 md:h-14 relative border border-primary/40 shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:border-primary transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
        </div>

        <div className="w-px h-8 md:h-10 bg-white/10 mx-1 md:mx-2" />
        
        <div className="flex items-center gap-2">
          <Button 
            variant={voiceActive ? "default" : "ghost"} 
            size="icon" 
            onClick={toggleVoice} 
            title={isMutedByHost ? "Muted by Host" : "Toggle Voice"}
            className={`rounded-full w-10 h-10 md:w-14 md:h-14 transition-all duration-300 border border-transparent ${voiceActive ? "bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)] hover:bg-green-500/30" : "text-white/40 hover:text-white hover:bg-white/10"} ${isMutedByHost ? "opacity-50 cursor-not-allowed text-red-400" : ""}`}
          >
            {voiceActive ? <Mic className="w-5 h-5 md:w-6 md:h-6" /> : <MicOff className="w-5 h-5 md:w-6 md:h-6" />}
          </Button>

          <Button 
            variant={activePanel === "chat" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => togglePanel("chat")} 
            title="Community Chat"
            className={`rounded-full w-10 h-10 md:w-14 md:h-14 transition-all duration-300 border border-transparent ${activePanel === "chat" ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_30px_rgba(0,212,255,0.2)] hover:bg-primary/30" : "text-white/40 hover:text-white hover:bg-white/10"}`}
          >
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          </Button>

          {isHost && (
            <Button 
              variant={activePanel === "mod" ? "default" : "ghost"} 
              size="icon" 
              onClick={() => togglePanel("mod")} 
              title="Moderation Controls"
              className={`rounded-full w-10 h-10 md:w-14 md:h-14 transition-all duration-300 border border-transparent ${activePanel === "mod" ? "bg-violet-500/20 border-violet-500/50 text-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:bg-violet-500/30" : "text-white/40 hover:text-white hover:bg-white/10"}`}
            >
              <Shield className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          )}
        </div>

        <div className="w-px h-8 md:h-10 bg-white/10 mx-1 md:mx-2" />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onLeave} 
          title="Exit Session"
          className="rounded-full w-10 h-10 md:w-14 md:h-14 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/30"
        >
          <LogOut className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
      </motion.div>

      {/* Side Panels */}
      <AnimatePresence>
        {activePanel === "chat" && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-black/95 border-l border-white/10 z-40 flex flex-col pt-4 shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <h3 className="font-outfit font-bold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Community Chat
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActivePanel(null)} className="h-8 w-8 text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {session.chatMessages?.length === 0 ? (
                <div className="text-center text-muted-foreground mt-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No messages yet. Say hi!</p>
                </div>
              ) : (
                session.chatMessages?.map((msg: any) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === userName ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-medium">{msg.sender}</span>
                      {msg.sender === session.hostName && <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Host</span>}
                      {msg.pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                    </div>
                    <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm ${msg.pinned ? "bg-yellow-500/20 border border-yellow-500/30 text-white" : msg.sender === userName ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-white/10 text-white rounded-tl-sm"}`}>
                      {msg.text}
                    </div>
                    {isHost && (
                      <button onClick={() => togglePin(msg.id, msg.pinned)} className="text-[10px] text-muted-foreground hover:text-white mt-1 uppercase tracking-wider font-medium">
                        {msg.pinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/50">
              <div className="flex gap-2">
                <Input 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10 h-10"
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} size="icon" className="shrink-0 w-10 h-10 bg-primary hover:bg-primary/90 text-white">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {activePanel === "mod" && isHost && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-black/95 border-l border-white/10 z-40 flex flex-col pt-4 shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <h3 className="font-outfit font-bold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" /> Moderation
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActivePanel(null)} className="h-8 w-8 text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Participants ({session.participants.length - 1})</p>
                {session.participants.length > 1 && (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm("Mute all participants?")) {
                          socket.emit("mod:mute_all", { sessionId: session.id });
                        }
                      }}
                      className="h-7 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/20 hover:bg-red-400/10"
                    >
                      Mute All
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        socket.emit("mod:unmute_all", { sessionId: session.id });
                      }}
                      className="h-7 text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/10"
                    >
                      Unmute All
                    </Button>
                  </div>
                )}
              </div>
              
              {session.participants.filter((p: any) => p.role !== 'host').map((p: any) => {
                const isPlayer = session.players?.includes(p.name);
                return (
                  <div key={p.id} className="flex flex-col bg-white/5 border border-white/10 p-3 rounded-lg gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-white flex items-center gap-2">
                          {p.name}
                          {!p.isConnected && <span className="w-2 h-2 rounded-full bg-red-500" title="Disconnected" />}
                          {peers[p.id]?.speaking && <Volume2 className="w-3 h-3 text-primary animate-pulse" />}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          Role: <span className={isPlayer ? "text-emerald-400" : "text-amber-400"}>{isPlayer ? "Player" : "Spectator"}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => socket.emit("session:toggle_role", { sessionId: session.id, targetName: p.name })}
                          className={`h-7 px-2 text-[9px] font-black uppercase tracking-widest border ${isPlayer ? 'text-amber-400 border-amber-400/20 hover:bg-amber-400/10' : 'text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10'}`}
                        >
                          {isPlayer ? "Demote" : "Promote"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => promoteToHost(p.id, p.name)}
                          className="h-7 px-2 text-[9px] font-black uppercase tracking-widest border border-violet-500/20 text-violet-400 hover:bg-violet-500/10"
                          title="Transfer Host Role"
                        >
                          Make Host
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {p.micOn ? <Mic className={`w-3 h-3 ${peers[p.id]?.speaking ? "text-primary animate-pulse" : "text-green-400"}`} /> : <MicOff className="w-3 h-3" />}
                        {p.micOn ? "Mic On" : "Mic Off"}
                        {p.mutedByHost && <span className="text-red-400 ml-1">(Force Muted)</span>}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleMute(p.name, p.mutedByHost)}
                          title={p.mutedByHost ? "Unmute Participant" : "Force Mute Participant"}
                          className={`w-8 h-8 ${p.mutedByHost ? "text-red-400 hover:text-red-300 hover:bg-red-400/20" : "text-muted-foreground hover:text-white hover:bg-white/10"}`}
                        >
                          {p.mutedByHost ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => kickUser(p.name)}
                          title="Kick Participant"
                          className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {session.participants.length <= 1 && (
                <p className="text-center text-sm text-muted-foreground py-10">No other participants to manage.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden Remote Audio Elements */}
      <div className="hidden">
        {Object.entries(peers).map(([id, { stream }]) => (
          <audio 
            key={id} 
            autoPlay
            playsInline
            ref={el => { 
              if (el) { 
                el.srcObject = stream; 
                el.volume = 1.0;
                // Only trigger overlay if playback fails AND we haven't unlocked yet
                el.play().catch(() => {
                  // Only show if we haven't unlocked and it's not already showing
                  if (audioUnlocked === true) return; 
                  setAudioUnlocked(false);
                });
              } 
            }} 
          />
        ))}
      </div>

      {/* Mobile Audio Unlock Overlay */}
      {!audioUnlocked && Object.keys(peers).length > 0 && (
        <div 
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setAudioUnlocked(true);
            // Force play all audio elements on the page after user gesture
            const audios = document.querySelectorAll('audio');
            audios.forEach(a => {
              a.play().catch(err => console.log("Post-unlock play failed:", err));
            });
          }}
        >
          <div className="bg-[#0A0D14] border border-white/20 rounded-2xl p-8 text-center max-w-sm mx-4">
            <Volume2 className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-white mb-2">Tap to Enable Audio</h3>
            <p className="text-white/50 text-sm">Your browser requires a tap to play voice audio from other participants</p>
          </div>
        </div>
      )}
    </>
  );
}
