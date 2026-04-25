"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Users, QrCode, ArrowRight, Zap, Plus, 
  GraduationCap, BookOpen, Gamepad2, BrainCircuit,
  ShieldCheck, Globe, Cpu, CheckCircle2, MessageCircle
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
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-[100] h-20 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 px-6 md:px-12 flex items-center justify-between">
        <div className="relative w-32 h-8">
          <Image 
            src="/logo.png" 
            alt="CoAct Logo" 
            fill 
            sizes="(max-width: 768px) 128px, 160px"
            className="object-contain mix-blend-screen" 
            priority 
          />
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-outfit font-black tracking-tight mb-8 leading-[0.95]">
              Seamless Group <br /> <span className="text-primary">Co-Action.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-white/50 text-lg md:text-xl font-medium leading-relaxed mb-12">
              The ultimate real-time engine for professional teams, students, and groups to collaborate, learn, and play in a unified digital space.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1000px] mx-auto text-left">
            {/* Join */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-white/5 bg-white/[0.01] backdrop-blur-xl rounded-[2.5rem] p-10 hover:border-primary/20 transition-all shadow-2xl">
                <h2 className="text-2xl font-black mb-6">Join a Session</h2>
                <form onSubmit={handleJoin} className="space-y-4">
                  <Input
                    placeholder="Enter your name"
                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 focus:border-primary/50"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    required
                  />
                  <div className="relative">
                    <Input
                      placeholder="Access Code"
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 uppercase font-mono tracking-widest text-primary focus:ring-primary/20 focus:border-primary/50"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                    />
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  </div>
                  <button 
                    disabled={!isJoinReady || isNavigating}
                    className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3
                      ${isJoinReady ? "bg-primary text-black hover:scale-[1.02] shadow-xl shadow-primary/20" : "bg-white/5 text-white/20 cursor-not-allowed"}`}
                  >
                    {isNavigating ? "Connecting..." : "Enter Workspace"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </Card>
            </motion.div>

            {/* Host */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-white/5 bg-white/[0.01] backdrop-blur-xl rounded-[2.5rem] p-10 hover:border-violet-500/20 transition-all shadow-2xl">
                <h2 className="text-2xl font-black mb-6">Create Session</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input
                    placeholder="Host display name"
                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-violet-500/20 focus:border-violet-500/50"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    required
                  />
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                    <Zap className="w-5 h-5 text-violet-400 shrink-0" />
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                      Start a new room and get an instant invite code for your participants.
                    </p>
                  </div>
                  <button 
                    disabled={!isHostReady || isNavigating}
                    className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3
                      ${isHostReady ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-[1.02] shadow-xl shadow-violet-500/20" : "bg-white/5 text-white/20 cursor-not-allowed"}`}
                  >
                    {isNavigating ? "Launching..." : "Initialize Room"}
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6 block">The Platform</span>
            <h2 className="text-4xl md:text-5xl font-outfit font-black mb-8 leading-tight">Beyond Simple <br /> Communication.</h2>
            <p className="text-white/40 text-lg leading-relaxed mb-8">
              CoAct isn't just another messaging tool. It's a real-time interaction engine that synchronizes dozens of high-performance activities across any device instantly.
            </p>
            <ul className="space-y-4">
              {[
                "Ultra-low latency (<20ms) synchronization",
                "No installation required - runs in any browser",
                "Advanced data protection & privacy encryption",
                "Mobile-first design for participants"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-white/70">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl bg-[#0A0D14]">
            <Image 
              src="/activities_banner.png" 
              alt="Collaborative Tools" 
              fill 
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover opacity-60" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-40 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-outfit font-black mb-6">Designed for Every Purpose.</h2>
            <p className="text-white/40 max-w-xl mx-auto">Choose from four distinct modes tailored to your group's specific goals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: GraduationCap, title: "Classroom", desc: "Interactive whiteboards, real-time polls, and QA boards to drive engagement in learning environments.", color: "text-blue-400" },
              { icon: BookOpen, title: "Group Study", desc: "Co-working spaces with task trackers, focus timers, and shared notes for maximum productivity.", color: "text-green-400" },
              { icon: Gamepad2, title: "Social Play", desc: "A collection of social games like Word Chain, UNO, and Ludo for bonding and ice-breaking.", color: "text-purple-400" },
              { icon: BrainCircuit, title: "Decision Making", desc: "Thought mapping, debate duels, and courtroom simulations to reach consensus through collaboration.", color: "text-orange-400" },
            ].map((feature, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <feature.icon className={`w-10 h-10 mb-8 ${feature.color}`} />
                <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 px-6 bg-primary/[0.01]">
        <div className="max-w-[1000px] mx-auto text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-10 border border-primary/20">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-4xl md:text-5xl font-outfit font-black mb-8">Enterprise-Grade Security.</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
            Your data is volatile by design. We use end-to-end socket encryption, and once a session is deleted, every trace of interaction is wiped from our servers instantly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { title: "Stateless Engine", desc: "We don't store your personal data or conversation logs permanently." },
              { title: "Encrypted Sockets", desc: "All real-time communication is protected via TLS/SSL encryption." },
              { title: "Private Access", desc: "Sessions are accessible only via high-entropy unique access codes." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5">
                <h4 className="font-black text-white mb-2 tracking-tight">{item.title}</h4>
                <p className="text-xs text-white/30 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 text-center">
        <div className="relative w-32 h-8 mx-auto opacity-30 mb-10">
          <Image 
            src="/logo.png" 
            alt="CoAct Logo" 
            fill 
            sizes="128px"
            className="object-contain mix-blend-screen grayscale" 
          />
        </div>
        <div className="flex items-center justify-center gap-10 text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-10">
          <span>Real-Time Engine</span>
          <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
          <span>Secure Collaboration</span>
          <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
          <span>Cloud Infrastructure</span>
        </div>
        <p className="text-[10px] text-white/10 font-bold tracking-[0.4em]">© 2026 COACT PLATFORM. DEVELOPED FOR HIGH-STAKES INTERACTION.</p>
      </footer>
    </div>
  );
}
