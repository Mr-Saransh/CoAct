"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
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
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.05], [-20, 0]);

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
      {/* Sticky Premium Header */}
      <motion.header 
        style={{ opacity: headerOpacity, y: headerY }}
        className="fixed top-0 inset-x-0 h-20 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 z-[100] px-8 flex items-center justify-between"
      >
        <div className="relative w-32 h-8">
          <Image src="/logo.png" alt="CoAct Logo" fill className="object-contain" />
        </div>
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#activities" className="hover:text-primary transition-colors">Activities</a>
            <a href="#security" className="hover:text-primary transition-colors">Security</a>
          </nav>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-primary text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
            Get Started
          </button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none opacity-50" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

        <div className="w-full max-w-[1100px] z-10">
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center mb-20"
          >
            <div className="relative w-64 h-16 md:w-80 md:h-20 mb-8">
              <Image 
                src="/logo.png" 
                alt="CoAct Logo" 
                fill
                className="object-contain transition-transform duration-700 hover:scale-105"
                priority
              />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-outfit font-black tracking-tight mb-6 text-gradient">
              The Future of Real-Time <br /> Collaboration
            </h1>
            <p className="max-w-2xl text-white/40 text-sm md:text-lg font-medium leading-relaxed mb-10">
              Transform your digital interactions with a premium, low-latency engine designed for high-stakes teamwork, creative study, and immersive social experiences.
            </p>
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center gap-2 opacity-30"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Scroll to Explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
            {/* Join Session Card */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
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
                          placeholder="e.g. Alex"
                          className="bg-white/5 border-white/10 h-16 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all text-lg"
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          maxLength={20}
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
                          />
                          <QrCode className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
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
                      <span className="relative z-10">{isNavigating ? "Synchronizing..." : "Join Collaboration"}</span>
                      <ArrowRight className={`w-5 h-5 relative z-10 transition-transform duration-500 ${isJoinReady ? "group-hover/btn:translate-x-1" : ""}`} />
                    </button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Host Session Card */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            >
              <Card className="h-full border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden group hover:border-violet-500/40 transition-all duration-700 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <CardContent className="p-10 md:p-12 flex flex-col h-full relative z-10">
                  <div className="mb-10">
                    <h2 className="text-3xl font-outfit font-black text-white mb-2 tracking-tight">Host Session</h2>
                    <p className="text-[11px] text-violet-400 font-black uppercase tracking-[0.2em] opacity-70">Start a new collaboration</p>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-6 flex-1 flex flex-col">
                    <div className="space-y-5 flex-1">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Host Identity</label>
                        <Input
                          placeholder="e.g. Sam"
                          className="bg-white/5 border-white/10 h-16 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-2xl transition-all text-lg"
                          value={hostName}
                          onChange={(e) => setHostName(e.target.value)}
                          maxLength={20}
                        />
                      </div>
                      <div className="p-8 rounded-[2rem] bg-violet-500/5 border border-violet-500/10 flex items-center gap-5 transition-colors group-hover:bg-violet-500/10">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center shrink-0 shadow-lg">
                          <Zap className="w-6 h-6 text-violet-400" />
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed font-medium">
                          Launch an instant workspace. Invite your team with a high-security unique access code.
                        </p>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={!isHostReady || isNavigating}
                      className={`w-full h-16 mt-10 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-500 flex items-center justify-center gap-3 group/btn relative overflow-hidden
                        ${isHostReady 
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_20px_50px_rgba(139,92,246,0.25)] hover:shadow-[0_25px_60px_rgba(139,92,246,0.4)] hover:-translate-y-1 active:scale-95" 
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                    >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                      <Plus className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">{isNavigating ? "Initializing..." : "Initialize Room"}</span>
                    </button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { icon: Globe, label: "Global Sync", value: "Real-time" },
            { icon: ShieldCheck, label: "Security", value: "End-to-End" },
            { icon: Cpu, label: "Latency", value: "< 20ms" },
            { icon: Users, label: "Users", value: "Infinite" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
                <p className="text-lg font-black text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-40 relative">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-40">
            <motion.div
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: -50 }}
              viewport={{ once: true }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6 block">Unified Experience</span>
              <h2 className="text-4xl md:text-5xl font-outfit font-black mb-8 leading-tight">Every Activity, <br /> One Platform.</h2>
              <div className="space-y-8">
                {[
                  { icon: GraduationCap, title: "Classroom", desc: "Interactive whiteboards, polls, and QA boards for structured learning.", color: "text-blue-400" },
                  { icon: BookOpen, title: "Group Study", desc: "Shared focus timers, task trackers, and collaborative note-taking.", color: "text-green-400" },
                  { icon: Gamepad2, title: "Social Play", desc: "Word games, Antakshari, and social activities to bond with your team.", color: "text-purple-400" },
                  { icon: BrainCircuit, title: "Decision Making", desc: "Thought maps, debate duels, and courtroom simulations.", color: "text-orange-400" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-colors group-hover:border-primary/50 ${item.color}`}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-2">{item.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              whileInView={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              viewport={{ once: true }}
              className="relative aspect-square"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] opacity-30 animate-pulse" />
              <div className="relative h-full rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl bg-[#0A0D14]">
                <Image 
                  src="/activities_banner.png" 
                  alt="CoAct Activities" 
                  fill 
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>

          {/* Graphic Section 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center flex-row-reverse">
            <motion.div
              whileInView={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              viewport={{ once: true }}
              className="relative aspect-video lg:order-2"
            >
              <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-[100px] opacity-30 animate-pulse" />
              <div className="relative h-full rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl bg-[#0A0D14]">
                <Image 
                  src="/realtime_graphic.png" 
                  alt="Real-time Collaboration" 
                  fill 
                  className="object-cover"
                />
              </div>
            </motion.div>
            <motion.div
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 50 }}
              viewport={{ once: true }}
              className="lg:order-1"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400 mb-6 block">Ultra-Low Latency</span>
              <h2 className="text-4xl md:text-5xl font-outfit font-black mb-8 leading-tight">Synchronized at the Speed of Light.</h2>
              <p className="text-white/40 text-lg leading-relaxed mb-10">
                Our custom Socket.io engine ensures every click, word, and reaction is synced across all participants in under 20ms. No lag, no desync, just pure collaboration.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                  <h4 className="text-2xl font-black mb-1">99.9%</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Uptime Reliability</p>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                  <h4 className="text-2xl font-black mb-1">AES-256</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Encryption Standard</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="py-20 border-t border-white/5 bg-black/40">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col items-center text-center gap-10">
          <div className="relative w-32 h-8 opacity-40">
            <Image src="/logo.png" alt="CoAct Logo" fill className="object-contain grayscale" />
          </div>
          <div className="flex items-center gap-8 text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">
            <span>End-to-End Encryption</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span>Low Latency Sockets</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span>Privacy First</span>
          </div>
          <p className="text-[9px] text-white/10 font-bold tracking-[0.5em] italic">© 2026 COACT PREMIUM ENGINE. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
