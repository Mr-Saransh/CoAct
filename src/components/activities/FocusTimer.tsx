import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { useSession } from "@/hooks/useSession";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FocusTimerHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const activityData = session.activityData || {};
  const { 
    duration = 25 * 60, 
    remaining = 25 * 60, 
    isRunning = false, 
    endTime = null 
  } = activityData;

  const [displayTime, setDisplayTime] = useState(remaining);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const left = Math.max(0, Math.floor((endTime - now) / 1000));
        setDisplayTime(left);
        
        if (left === 0) {
          updateActivity({ ...activityData, isRunning: false, remaining: 0, endTime: null });
        }
      }, 1000);
    } else {
      setDisplayTime(remaining);
    }
    return () => clearInterval(interval);
  }, [isRunning, endTime, remaining, updateActivity, activityData]);

  const toggleTimer = () => {
    if (isRunning) {
      // Pause
      updateActivity({
        ...activityData,
        isRunning: false,
        remaining: displayTime,
        endTime: null
      });
    } else {
      // Start
      updateActivity({
        ...activityData,
        isRunning: true,
        endTime: Date.now() + displayTime * 1000
      });
    }
  };

  const resetTimer = () => {
    updateActivity({
      ...activityData,
      isRunning: false,
      remaining: duration,
      endTime: null
    });
  };

  const setDuration = (mins: number) => {
    updateActivity({
      ...activityData,
      isRunning: false,
      duration: mins * 60,
      remaining: mins * 60,
      endTime: null
    });
  };

  const progress = ((duration - displayTime) / duration) * 100;

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-outfit font-bold mb-2">Focus Timer</h2>
        <p className="text-muted-foreground">Keep the group focused together.</p>
      </div>

      <div className="relative w-80 h-80 flex flex-col items-center justify-center mb-12">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
          <circle 
            cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" 
            className="text-primary transition-all duration-1000 ease-linear"
            strokeDasharray="283" 
            strokeDashoffset={283 - (283 * progress) / 100} 
            strokeLinecap="round"
          />
        </svg>
        <div className="text-7xl font-mono font-bold tracking-tighter tabular-nums z-10 text-white">
          {formatTime(displayTime)}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-10">
        <Button onClick={toggleTimer} size="lg" className={`w-32 h-14 text-lg ${isRunning ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-primary text-primary-foreground"}`}>
          {isRunning ? <><Pause className="w-5 h-5 mr-2" /> Pause</> : <><Play className="w-5 h-5 mr-2" /> Start</>}
        </Button>
        <Button onClick={resetTimer} size="lg" variant="outline" className="w-32 h-14 text-lg border-white/20 bg-white/5 hover:bg-white/10">
          <RotateCcw className="w-5 h-5 mr-2" /> Reset
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Presets:</span>
        <Button variant="ghost" size="sm" onClick={() => setDuration(5)} className="text-xs">5m</Button>
        <Button variant="ghost" size="sm" onClick={() => setDuration(15)} className="text-xs">15m</Button>
        <Button variant="ghost" size="sm" onClick={() => setDuration(25)} className="text-xs">25m</Button>
        <Button variant="ghost" size="sm" onClick={() => setDuration(60)} className="text-xs">60m</Button>
      </div>
    </div>
  );
}

export function FocusTimerParticipant({ session }: { session: any }) {
  const activityData = session.activityData || {};
  const { 
    duration = 25 * 60, 
    remaining = 25 * 60, 
    isRunning = false, 
    endTime = null 
  } = activityData;
  const [displayTime, setDisplayTime] = useState(remaining);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const left = Math.max(0, Math.floor((endTime - now) / 1000));
        setDisplayTime(left);
      }, 1000);
    } else {
      setDisplayTime(remaining);
    }
    return () => clearInterval(interval);
  }, [isRunning, endTime, remaining]);

  const progress = ((duration - displayTime) / duration) * 100;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center py-10">
      <Timer className="w-12 h-12 text-primary mb-6 opacity-50" />
      <h2 className="text-3xl font-outfit font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet">
        Focus Timer
      </h2>

      <div className="relative w-72 h-72 flex flex-col items-center justify-center">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
          <circle 
            cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" 
            className="text-primary transition-all duration-1000 ease-linear"
            strokeDasharray="283" 
            strokeDashoffset={283 - (283 * progress) / 100} 
            strokeLinecap="round"
          />
        </svg>
        <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums z-10 text-white">
          {formatTime(displayTime)}
        </div>
      </div>
      
      <p className="mt-12 text-muted-foreground text-sm font-medium tracking-widest uppercase">
        {isRunning ? "Session in progress" : "Paused"}
      </p>
    </div>
  );
}
