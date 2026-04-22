import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Trash2, CheckCircle2, Circle, ListTodo } from "lucide-react";

export function TaskTrackerHost({ session, updateActivity }: { session: any; updateActivity: any }) {
  const activityData = session.activityData || { tasks: [] };
  const { tasks = [] } = activityData;
  const [newTask, setNewTask] = useState("");
  const [assignee, setAssignee] = useState("");
  
  const participants = session.participants.filter((p: any) => p.role !== "host");

  const addTask = () => {
    if (!newTask.trim()) return;
    const newTaskObj = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTask.trim(),
      assignee: assignee || "Anyone",
      completed: false
    };
    updateActivity({ ...activityData, tasks: [...tasks, newTaskObj] });
    setNewTask("");
    setAssignee("");
  };

  const toggleTask = (id: string) => {
    const newTasks = tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t);
    updateActivity({ ...activityData, tasks: newTasks });
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter((t: any) => t.id !== id);
    updateActivity({ ...activityData, tasks: newTasks });
  };

  const completedCount = tasks.filter((t: any) => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="p-8 flex flex-col max-w-3xl mx-auto w-full h-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 mb-4">
          <ListTodo className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-outfit font-bold">Group Task Tracker</h2>
        <p className="text-muted-foreground mt-1">Manage and assign tasks to your group.</p>
      </div>

      <Card className="border-white/10 bg-black/40 backdrop-blur-xl mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={newTask} 
              onChange={e => setNewTask(e.target.value)} 
              placeholder="What needs to be done?" 
              className="flex-1 bg-white/5 border-white/10"
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <select 
              value={assignee} 
              onChange={e => setAssignee(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
            >
              <option value="" className="bg-black">Unassigned</option>
              {participants.map((p: any) => (
                <option key={p.id} value={p.name} className="bg-black">{p.name}</option>
              ))}
            </select>
            <Button onClick={addTask} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-bold w-12 text-right">{progress}%</span>
      </div>

      <div className="space-y-3 overflow-y-auto pb-20 flex-1">
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No tasks yet. Create one above!
          </div>
        ) : (
          tasks.map((t: any) => (
            <div key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${t.completed ? "bg-white/5 border-white/5 opacity-50" : "bg-white/10 border-white/10"}`}>
              <button onClick={() => toggleTask(t.id)} className="shrink-0 transition-transform active:scale-90">
                {t.completed ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-lg font-medium truncate ${t.completed ? "line-through text-muted-foreground" : "text-white"}`}>
                  {t.text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned to: <strong className={t.assignee === "Anyone" ? "" : "text-violet-400"}>{t.assignee}</strong>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteTask(t.id)} className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TaskTrackerParticipant({ session, socket, userName }: { session: any; socket: any; userName: string }) {
  const activityData = session.activityData || { tasks: [] };
  const { tasks = [] } = activityData;

  const toggleTask = (id: string, currentlyCompleted: boolean) => {
    socket.emit("tasks:toggle", { sessionId: session.id, taskId: id, completed: !currentlyCompleted });
  };

  const completedCount = tasks.filter((t: any) => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const myTasks = tasks.filter((t: any) => t.assignee === userName || t.assignee === "Anyone");
  const otherTasks = tasks.filter((t: any) => t.assignee !== userName && t.assignee !== "Anyone");

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col pt-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-outfit font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet mb-2">Tasks</h2>
      </div>

      <div className="mb-8 flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Overall Progress</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-xl font-bold w-12 text-right">{progress}%</span>
      </div>

      <div className="space-y-6 overflow-y-auto pb-10 flex-1 px-1">
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Your Tasks</h3>
          {myTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No tasks assigned to you right now.</p>
          ) : (
            <div className="space-y-3">
              {myTasks.map((t: any) => (
                <div key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${t.completed ? "bg-white/5 border-white/5 opacity-50" : "bg-white/10 border-white/20"}`}>
                  <button onClick={() => toggleTask(t.id, t.completed)} className="shrink-0 transition-transform active:scale-90">
                    {t.completed ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium truncate ${t.completed ? "line-through text-muted-foreground" : "text-white"}`}>
                      {t.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {otherTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-3">Other Tasks</h3>
            <div className="space-y-2 opacity-60">
              {otherTasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                  <span className={t.completed ? "line-through text-muted-foreground" : "text-white"}>{t.text}</span>
                  <span className="text-xs text-muted-foreground">{t.assignee}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
