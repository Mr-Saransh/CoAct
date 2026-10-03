import React, { useState } from "react";
import { GroupDocumentStudio } from "./document/GroupDocumentStudio";
import { FocusTimerHost, FocusTimerParticipant } from "./FocusTimer";
import { TaskTrackerHost, TaskTrackerParticipant } from "./TaskTracker";
import { FileText, Timer, ListTodo } from "lucide-react";

interface GroupStudyHostProps {
  session: any;
  socket?: any;
  userName?: string;
  updateActivity?: any;
}

export function GroupStudyHost({ 
  session, 
  socket, 
  userName = "Host", 
  updateActivity 
}: GroupStudyHostProps) {
  const [activeTab, setActiveTab] = useState<"document" | "focus_tasks">("document");

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden relative">
      {/* Desktop Sub-Tab Toggle in top-right corner */}
      <div className="absolute top-2.5 right-36 z-50 hidden sm:flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab("document")}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === "document"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Document Studio"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document</span>
        </button>
        <button
          onClick={() => setActiveTab("focus_tasks")}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === "focus_tasks"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Session Focus & Tasks"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus & Tasks</span>
        </button>
      </div>

      {/* Mobile Floating Sub-Tab Toggle (Elevated at bottom-left so it never blocks top toolbar or bottom browser bars) */}
      <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+4.25rem)] left-3 z-40 sm:hidden flex items-center bg-slate-950/95 border border-slate-700/80 rounded-full p-1 shadow-2xl backdrop-blur-2xl">
        <button
          onClick={() => setActiveTab("document")}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "document"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Doc</span>
        </button>
        <button
          onClick={() => setActiveTab("focus_tasks")}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "focus_tasks"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus</span>
        </button>
      </div>

      {/* Main Studio vs Study Companion View */}
      {activeTab === "document" ? (
        <GroupDocumentStudio
          session={session}
          socket={socket}
          userName={userName}
          isHost={true}
        />
      ) : (
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Timer className="w-6 h-6 text-blue-400" /> Focus Timer & Tasks
              </h2>
              <p className="text-xs text-slate-400">Keep session momentum and track learning milestones.</p>
            </div>
            <button
              onClick={() => setActiveTab("document")}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              ← Back to Shared Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <FocusTimerHost session={session} updateActivity={updateActivity} />
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <TaskTrackerHost session={session} updateActivity={updateActivity} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface GroupStudyParticipantProps {
  session: any;
  socket: any;
  userName: string;
}

export function GroupStudyParticipant({ 
  session, 
  socket, 
  userName 
}: GroupStudyParticipantProps) {
  const [activeTab, setActiveTab] = useState<"document" | "focus_tasks">("document");

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden relative">
      {/* Desktop Sub-Tab Toggle in top-right corner */}
      <div className="absolute top-2.5 right-36 z-50 hidden sm:flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab("document")}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === "document"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Document Studio"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document</span>
        </button>
        <button
          onClick={() => setActiveTab("focus_tasks")}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === "focus_tasks"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Session Focus & Tasks"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus & Tasks</span>
        </button>
      </div>

      {/* Mobile Floating Sub-Tab Toggle (Elevated at bottom-left so it never blocks top toolbar or bottom browser bars) */}
      <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),1rem)+4.25rem)] left-3 z-40 sm:hidden flex items-center bg-slate-950/95 border border-slate-700/80 rounded-full p-1 shadow-2xl backdrop-blur-2xl">
        <button
          onClick={() => setActiveTab("document")}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "document"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Doc</span>
        </button>
        <button
          onClick={() => setActiveTab("focus_tasks")}
          className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === "focus_tasks"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus</span>
        </button>
      </div>

      {/* Main Studio vs Study Companion View */}
      {activeTab === "document" ? (
        <GroupDocumentStudio
          session={session}
          socket={socket}
          userName={userName}
          isHost={false}
        />
      ) : (
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Timer className="w-6 h-6 text-blue-400" /> Focus Timer & Tasks
              </h2>
              <p className="text-xs text-slate-400">Keep session momentum and track learning milestones.</p>
            </div>
            <button
              onClick={() => setActiveTab("document")}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              ← Back to Shared Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <FocusTimerParticipant session={session} />
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <TaskTrackerParticipant session={session} socket={socket} userName={userName} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
