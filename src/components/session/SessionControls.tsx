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
  
  const { peers, isSpeaking } = useVoiceChannel(session?.id, socket, userName, voiceActive);

  // Auto-join voice for games and study modes
  useEffect(() => {
    if (!session) return;
    const gameModes = ["trivia", "wordchain", "mostlikely", "quiz", "study", "uno", "ludo"];
    const me = session.participants?.find((p: any) => p.name === userName);
    const isMutedByHost = me?.mutedByHost;

    if (gameModes.includes(session.mode) && !voiceActive && !isMutedByHost) {
      setVoiceActive(true);
      socket.emit("voice:toggle", { sessionId: session.id, userName, micOn: true });
    }
  }, [session?.mode]);

  if (!session) return null;

  const me = session.participants?.find((p: any) => p.name === userName);
  const isMutedByHost = me?.mutedByHost;

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
        whileDrag={{ scale: 1.05, cursor: "grabbing" }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-full shadow-2xl cursor-grab touch-none"
      >
        <Button variant="ghost" size="icon" onClick={onBack} title="Go Back" className="text-white hover:bg-white/10 rounded-full w-10 h-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        
        <Button 
          variant={voiceActive ? "default" : "ghost"} 
          size="icon" 
          onClick={toggleVoice} 
          title={isMutedByHost ? "Muted by Host" : "Toggle Voice"}
          className={`rounded-full w-10 h-10 ${voiceActive ? "bg-green-500 hover:bg-green-600 text-white" : "text-white hover:bg-white/10"} ${isMutedByHost ? "opacity-50 cursor-not-allowed text-red-400" : ""}`}
        >
          {voiceActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button 
          variant={activePanel === "chat" ? "default" : "ghost"} 
          size="icon" 
          onClick={() => togglePanel("chat")} 
          title="Community Chat"
          className={`rounded-full w-10 h-10 ${activePanel === "chat" ? "bg-primary hover:bg-primary/90 text-white" : "text-white hover:bg-white/10"}`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        {isHost && (
          <Button 
            variant={activePanel === "mod" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => togglePanel("mod")} 
            title="Moderation Controls"
            className={`rounded-full w-10 h-10 ${activePanel === "mod" ? "bg-violet-500 hover:bg-violet-600 text-white" : "text-white hover:bg-white/10"}`}
          >
            <Shield className="w-5 h-5" />
          </Button>
        )}

        <div className="w-px h-6 bg-white/20 mx-1" />
        <Button variant="ghost" size="icon" onClick={onLeave} title="Leave Session" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full w-10 h-10">
          <LogOut className="w-5 h-5" />
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
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Participants ({session.participants.length - 1})</p>
              
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
            ref={el => { if (el) el.srcObject = stream; }} 
          />
        ))}
      </div>
    </>
  );
}
