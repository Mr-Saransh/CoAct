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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[900px] z-10">
        {/* Header Logo */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center mb-12"
        >
          <div className="relative w-48 h-12 md:w-56 md:h-14">
            <Image 
              src="/logo.png" 
              alt="CoAct Logo" 
              fill
              className="object-contain mix-blend-screen scale-110"
              priority
            />
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Join Session Card */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-2xl rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all duration-500">
              <CardContent className="p-8 md:p-10 flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-1">Join Session</h2>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Connect to an active room</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Your Name</label>
                      <Input
                        autoFocus
                        placeholder="e.g. Alex"
                        className="bg-white/5 border-white/10 h-14 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        maxLength={20}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Session Code</label>
                      <div className="relative">
                        <Input
                          placeholder="XJ3K9P"
                          className="bg-white/5 border-white/10 h-14 uppercase font-mono tracking-[0.3em] text-primary pl-12 text-lg focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
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
                    className={`w-full h-14 mt-8 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 group/btn
                      ${isJoinReady 
                        ? "bg-primary text-black shadow-[0_10px_30px_rgba(0,212,255,0.3)] hover:shadow-[0_15px_40px_rgba(0,212,255,0.5)] hover:-translate-y-0.5" 
                        : "bg-white/5 text-white/20 cursor-not-allowed"
                      }`}
                  >
                    {isNavigating ? "Joining..." : "Join Now"} 
                    <ArrowRight className={`w-4 h-4 transition-transform ${isJoinReady ? "group-hover:translate-x-1" : ""}`} />
                  </button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Host Session Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
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
