import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export function GroupStudyHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const activityData = session.activityData || {};
  const { notes = "" } = activityData;

  const updateNotes = (notes: string) => {
    updateActivity({ ...activityData, notes });
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-outfit font-bold flex items-center gap-2">
            <GraduationCap className="text-primary w-8 h-8" /> Group Study Session
          </h2>
          <p className="text-muted-foreground">Collaborate on notes and discuss in real-time.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{session.participants.length} online</span>
        </div>
      </div>

      <Card className="flex-1 border-white/10 bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider">Shared Study Notes</span>
        </div>
        <CardContent className="p-0 flex-1 flex flex-col">
          <textarea 
            value={notes}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder="Type shared notes here..."
            className="flex-1 resize-none border-none bg-transparent p-6 text-lg focus-visible:ring-0 outline-none text-white"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function GroupStudyParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const activityData = session.activityData || {};
  const { notes = "" } = activityData;

  const handleNotesChange = (notes: string) => {
    socket.emit("study:notes", { sessionId: session.id, notes });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-outfit font-bold flex items-center justify-center gap-2">
          <GraduationCap className="text-primary w-6 h-6" /> Group Study
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Study together with voice and chat.</p>
      </div>

      <Card className="flex-1 border-white/10 bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden mb-20 shadow-2xl">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider">Shared Notes (Editable by anyone)</span>
        </div>
        <CardContent className="p-0 flex-1 flex flex-col">
          <textarea 
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="No notes yet. Start typing..."
            className="flex-1 resize-none border-none bg-transparent p-6 text-base focus-visible:ring-0 leading-relaxed outline-none text-white"
          />
        </CardContent>
      </Card>
    </div>
  );
}
