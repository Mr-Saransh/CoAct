export interface Participant {
  id: string; // Socket ID (transient)
  userId: string; // Durable ID (persistent)
  name: string;
  role: "host" | "participant";
  joinedAt: number;
  isConnected: boolean;
  micOn: boolean;
  mutedByHost: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  pinned: boolean;
}

export interface SessionState {
  id: string;
  hostId: string; // Durable Host User ID
  hostName: string;
  hostStatus: "active" | "idle" | "offline";
  mode: "lobby" | "poll" | "quiz" | "qa" | "fitb" | "board" | "focus" | "tasks" | "trivia" | "wordchain" | "mostlikely" | "study" | "uno" | "ludo" | "thoughtmap" | "courtroom" | "duel" | "decision" | "rmcs";
  status: "waiting" | "live" | "ended";
  activityData: Record<string, any>;
  participants: Participant[];
  bannedParticipants: string[]; // List of userIds
  players: string[];
  spectators: string[];
  maxPlayers: number;
  chatMessages: ChatMessage[];
  createdAt: number;
}
