export interface Participant {
  id: string;
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
  hostId: string;
  hostName: string;
  mode: "lobby" | "poll" | "quiz" | "qa" | "fitb" | "board" | "focus" | "tasks" | "trivia" | "wordchain" | "mostlikely" | "study" | "uno" | "ludo" | "thoughtmap" | "courtroom" | "duel" | "decision";
  status: "waiting" | "live" | "ended";
  activityData: Record<string, any>;
  participants: Participant[];
  players: string[];
  spectators: string[];
  maxPlayers: number;
  chatMessages: ChatMessage[];
  createdAt: number;
}
