"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Users, QrCode, ArrowRight, Zap, Plus, 
  GraduationCap, BookOpen, Gamepad2, BrainCircuit,
  ShieldCheck, Globe, Cpu, ChevronDown
} from "lucide-react";

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
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary/30 selection:text-primary">
      {/* Static Header for Performance */}
      <header className="sticky top-0 inset-x-0 h-16 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 z-[100] px-6 flex items-center justify-between">
        <div className="relative w-28 h-7">
          <Image src="/logo.png" alt="CoAct Logo" fill className="object-contain mix-blend-screen" />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-primary text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none opacity-50" />

        <div className="w-full max-w-[1000px] z-10">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-64 h-16 md:w-80 md:h-20 mb-8"
            >
              <Image 
                src="/logo.png" 
                alt="CoAct Logo" 
                fill
                className="object-contain mix-blend-screen"
                priority
              />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-outfit font-black tracking-tight mb-6"
            >
              Real-Time Collaboration <br /> <span className="text-primary">Redefined.</span>
            </motion.h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Join Session Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all">
                <CardContent className="p-8 md:p-10 flex flex-col h-full">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-white mb-1">Join Session</h2>
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] opacity-60">Connect to an active room</p>
                  </div>

                  <form onSubmit={handleJoin} className="space-y-5 flex-1 flex flex-col">
                    <div className="space-y-4">
                      <Input
                        placeholder="Your Identity (e.g. Alex)"
                        className="bg-white/5 border-white/10 h-14 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-0 rounded-xl"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        maxLength={20}
                      />
                      <div className="relative">
                        <Input
                          placeholder="ACCESS CODE"
                          className="bg-white/5 border-white/10 h-14 uppercase font-mono tracking-widest text-primary pl-12 focus:border-primary/50 focus:ring-0 rounded-xl"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          maxLength={10}
                        />
                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={!isJoinReady || isNavigating}
                      className={`w-full h-14 mt-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2
                        ${isJoinReady 
                          ? "bg-primary text-black hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10" 
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                    >
                      {isNavigating ? "Synchronizing..." : "Join Collaboration"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Host Session Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-violet-500/30 transition-all">
                <CardContent className="p-8 md:p-10 flex flex-col h-full">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-white mb-1">Host Session</h2>
                    <p className="text-[10px] text-violet-400 font-black uppercase tracking-[0.2em] opacity-60">Start a new collaboration</p>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-5 flex-1 flex flex-col">
                    <Input
                      placeholder="Host Name (e.g. Sam)"
                      className="bg-white/5 border-white/10 h-14 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-0 rounded-xl"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      maxLength={20}
                    />
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                      <Zap className="w-5 h-5 text-violet-400 shrink-0" />
                      <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                        Launch an instant workspace and invite your team.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={!isHostReady || isNavigating}
                      className={`w-full h-14 mt-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2
                        ${isHostReady 
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-500/10" 
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                    >
                      <Plus className="w-4 h-4" />
                      {isNavigating ? "Initializing..." : "Create Room"}
                    </button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Simplified Features Section */}
      <section id="features" className="py-20 bg-white/[0.01]">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black mb-4">Powerful Features</h2>
            <p className="text-white/40 text-sm">Everything you need for seamless teamwork.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: GraduationCap, title: "Classroom", color: "text-blue-400" },
              { icon: BookOpen, title: "Study", color: "text-green-400" },
              { icon: Gamepad2, title: "Play", color: "text-purple-400" },
              { icon: BrainCircuit, title: "Decide", color: "text-orange-400" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center gap-4">
                <item.icon className={`w-8 h-8 ${item.color}`} />
                <h3 className="font-bold">{item.title}</h3>
              </div>
            ))}
          </div>

          <div className="mt-20 relative aspect-video rounded-[2rem] overflow-hidden border border-white/10">
            <Image 
              src="/activities_banner.png" 
              alt="Activities" 
              fill 
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <div className="relative w-24 h-6 mx-auto opacity-30 mb-6">
          <Image src="/logo.png" alt="CoAct Logo" fill className="object-contain mix-blend-screen grayscale" />
        </div>
        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">© 2026 COACT ENGINE</p>
      </footer>
    </div>
  );
}
