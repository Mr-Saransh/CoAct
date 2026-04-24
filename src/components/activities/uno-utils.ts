export type UnoCard = {
  id: string;
  color: "red" | "blue" | "green" | "yellow" | "wild";
  type: "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
  value: number | null;
};

export type UnoState = {
  players: Record<string, { cards: UnoCard[] }>;
  order: string[];
  currentCard: UnoCard | null;
  currentColor: "red" | "blue" | "green" | "yellow";
  turn: string;
  direction: "clockwise" | "counterclockwise";
  status: "setup" | "live" | "ended";
  cardsPerPlayer: 7 | 9;
  winner: string | null;
  turnEndsAt: number | null;
  turnDurationMs: number;
  hasDrawnThisTurn: boolean;
  lastEvent?: { type: string; actor?: string; timestamp: number };
};

export type SessionLike = {
  id: string;
  hostName: string;
  participants: Array<{ name: string; isConnected: boolean }>;
  players: string[];
  spectators: string[];
  maxPlayers: number;
  activityData: Partial<UnoState>;
};

export type SocketLike = {
  emit: (event: string, payload: Record<string, unknown>) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
};

export const COLOR_META: Record<UnoCard["color"], { bg: string; glow: string; text: string; accent: string; solid: string }> = {
  red:    { bg: "from-rose-500 via-red-600 to-red-800",       glow: "shadow-red-500/40",     text: "text-white", accent: "rgba(255,255,255,0.2)", solid: "bg-red-500" },
  blue:   { bg: "from-blue-500 via-blue-600 to-indigo-800",   glow: "shadow-blue-500/40",    text: "text-white", accent: "rgba(255,255,255,0.2)", solid: "bg-blue-500" },
  green:  { bg: "from-emerald-500 via-green-600 to-emerald-800", glow: "shadow-emerald-500/40", text: "text-white", accent: "rgba(255,255,255,0.2)", solid: "bg-emerald-500" },
  yellow: { bg: "from-amber-300 via-yellow-400 to-amber-600", glow: "shadow-yellow-400/40",  text: "text-black", accent: "rgba(0,0,0,0.1)",       solid: "bg-yellow-400" },
  wild:   { bg: "from-zinc-800 via-zinc-900 to-black",        glow: "shadow-purple-500/30",  text: "text-white", accent: "rgba(255,255,255,0.1)", solid: "bg-zinc-700" },
};

export const UNO_COLORS = ["red", "blue", "green", "yellow"] as const;

export function labelForCard(card: UnoCard) {
  if (card.type === "number") return `${card.value}`;
  if (card.type === "skip") return "SKIP";
  if (card.type === "reverse") return "REV";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "WILD";
  return "+4";
}

export function canPlayCard(card: UnoCard, currentCard: UnoCard | null, currentColor: string) {
  if (!currentCard) return true;
  if (card.type === "wild" || card.type === "wild4") return true;
  if (card.color === currentColor) return true;
  if (card.type === "number" && currentCard.type === "number" && card.value === currentCard.value) return true;
  if (card.type !== "number" && currentCard.type !== "number" && card.type === currentCard.type) return true;
  return false;
}
