"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, QrCode, ArrowRight, Zap, Plus } from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [hostName, setHostName] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("coact_user_name");
    if (savedName) {
      setJoinName(savedName);
      setHostName(savedName);
    }
  }, []);

  const safeNavigate = (target: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    window.location.assign(target);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase().replace(/\s/g, "");
    const name = joinName.trim();
    if (code.length !== 6 || !name) return;
    localStorage.setItem("coact_user_name", name);
    safeNavigate(`/session/${code}?name=${encodeURIComponent(name)}`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = hostName.trim();
    if (!name) return;
    const code = generateCode();
    localStorage.setItem("coact_user_name", name);
    safeNavigate(`/host/session/${code}?name=${encodeURIComponent(name)}`);
  };

  const isJoinReady = joinCode.trim().replace(/\s/g, "").length === 6 && joinName.trim().length > 0;
  const isHostReady = hostName.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      <div className="w-full max-w-[1000px] z-10">
        {/* Header Logo */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center mb-16"
        >
          <div className="relative w-56 h-14 md:w-64 md:h-16">
            <Image 
              src="/logo.png" 
              alt="CoAct Logo" 
              fill
              className="object-contain mix-blend-screen scale-125 transition-transform duration-700 hover:scale-130"
              priority
            />
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* Join Session Card */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <Card className="h-full border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-all duration-700 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <CardContent className="p-10 md:p-12 flex flex-col h-full relative z-10">
                <div className="mb-10">
                  <h2 className="text-3xl font-outfit font-black text-white mb-2 tracking-tight">Join Session</h2>
                  <p className="text-[11px] text-primary font-black uppercase tracking-[0.2em] opacity-70">Connect to an active room</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-6 flex-1 flex flex-col">
                  <div className="space-y-5 flex-1">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Your Identity</label>
                      <Input
                        autoFocus
                        placeholder="e.g. Alex"
                        className="bg-white/5 border-white/10 h-16 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all text-lg"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        maxLength={20}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Access Code</label>
                      <div className="relative">
                        <Input
                          placeholder="XJ3K9P"
                          className="bg-white/5 border-white/10 h-16 uppercase font-mono tracking-[0.4em] text-primary pl-14 text-xl focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all shadow-inner"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          maxLength={10}
                          required
                        />
                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!isJoinReady || isNavigating}
                    className={`w-full h-16 mt-10 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-500 flex items-center justify-center gap-3 group/btn relative overflow-hidden
                      ${isJoinReady 
                        ? "bg-primary text-black shadow-[0_20px_50px_rgba(0,212,255,0.25)] hover:shadow-[0_25px_60px_rgba(0,212,255,0.4)] hover:-translate-y-1 active:scale-95" 
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                      }`}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10">{isNavigating ? "Joining..." : "Join Now"}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isJoinReady ? "group-hover:translate-x-1" : ""}`} />
                  </button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Host Session Card */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          >
            <Card className="h-full border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-2xl rounded-[2rem] overflow-hidden group hover:border-violet-500/30 transition-all duration-500">
              <CardContent className="p-8 md:p-10 flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-1">Host Session</h2>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Start a new collaboration</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Host Name</label>
                      <Input
                        placeholder="e.g. Sam"
                        className="bg-white/5 border-white/10 h-14 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl transition-all"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        maxLength={20}
                        required
                      />
                    </div>
                    <div className="p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-violet-400" />
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                        Create a room instantly. You'll get a unique code to invite others to your session.
                      </p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!isHostReady || isNavigating}
                    className={`w-full h-14 mt-8 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 group/btn
                      ${isHostReady 
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:shadow-[0_15px_40px_rgba(139,92,246,0.5)] hover:-translate-y-0.5" 
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                      }`}
                  >
                    <Plus className="w-4 h-4" />
                    {isNavigating ? "Creating..." : "Create Room"}
                  </button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12 text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]"
        >
          Privacy Focused &bull; Real-Time &bull; Secure
        </motion.p>
      </div>
    </main>
  );
}
