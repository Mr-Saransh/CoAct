"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, QrCode, ArrowRight, Zap } from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [hostName, setHostName] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const safeNavigate = (target: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
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
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase().replace(/\s/g, "");
    const name = joinName.trim();
    if (code.length !== 6 || !name) return;
    
    safeNavigate(`/session/${code}?name=${encodeURIComponent(name)}`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = hostName.trim();
    if (!name) return;
    const code = generateCode();
    
    safeNavigate(`/host/session/${code}?name=${encodeURIComponent(name)}`);
  };

  const isJoinReady = joinCode.trim().replace(/\s/g, "").length === 6 && joinName.trim().length > 0;
  const isHostReady = hostName.trim().length > 0;

  return (
    <main className="min-h-[100dvh] bg-[#020617] text-white flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      <div className="fixed inset-0 bg-[#020617] -z-10 pointer-events-none" />
      
      <div className="w-full max-w-lg space-y-6 z-10 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-[2.5rem] border border-white/10 mb-6">
            <Zap className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter font-outfit text-white italic">
            CoAct
          </h1>
          <p className="text-white/60 mt-3 font-bold uppercase tracking-widest text-[10px]">Real-time collaboration suite</p>
        </div>

        {/* Action Cards */}
        <div className="space-y-6">
          {/* Join Form */}
          <Card className="border-white/10 bg-[#121826] shadow-2xl relative border-t-4 border-t-primary rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black italic text-white uppercase tracking-tight">Join Session</CardTitle>
              <CardDescription className="text-white/40 font-black uppercase text-[10px]">Enter 6-digit session code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <Input
                  placeholder="Enter your name"
                  className="bg-white/5 border-white/10 h-14 text-lg text-white"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  required
                />
                <div className="relative">
                  <Input
                    placeholder="CODE (e.g. XJ3K9P)"
                    className="bg-white/5 border-white/10 h-14 uppercase font-mono tracking-[0.3em] text-primary pl-14 text-xl"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={10} // Allowing extra for typing, but we check for 6
                    required
                  />
                  <QrCode className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                </div>
                
                <button 
                  type="submit" 
                  className={`w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-95 ${
                    isJoinReady 
                    ? "bg-[#00D4FF] text-black shadow-[0_0_40px_rgba(0,212,255,0.4)]" 
                    : "bg-white/10 text-white/30"
                  }`}
                  disabled={!isJoinReady || isNavigating}
                >
                  {isNavigating ? "Joining..." : "Join Now"} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Host Form */}
          <Card className="border-white/10 bg-[#121826] shadow-2xl relative border-t-4 border-t-violet rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black italic text-white uppercase tracking-tight">Host Session</CardTitle>
              <CardDescription className="text-white/40 font-black uppercase text-[10px]">Create a new room</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  placeholder="Your host name"
                  className="bg-white/5 border-white/10 h-14 text-lg text-white"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  maxLength={20}
                  required
                />
                <button 
                  type="submit" 
                  className={`w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-95 ${
                    isHostReady 
                    ? "bg-[#8B5CF6] text-white shadow-[0_0_40px_rgba(139,92,246,0.4)]" 
                    : "bg-white/10 text-white/30"
                  }`}
                  disabled={!isHostReady || isNavigating}
                >
                  <Users className="w-5 h-5" /> Create Session
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
