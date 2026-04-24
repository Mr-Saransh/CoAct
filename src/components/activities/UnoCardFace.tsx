"use client";
import { Ban, RefreshCcw, Sparkles } from "lucide-react";
import { COLOR_META, labelForCard, type UnoCard } from "./uno-utils";

export function UnoCardFace({ card, playable, selected, compact }: {
  card: UnoCard; playable: boolean; selected?: boolean; compact?: boolean;
}) {
  const meta = COLOR_META[card.color];
  const sz = compact ? "h-28 w-[4.5rem]" : "h-36 w-24 md:h-44 md:w-[7.5rem]";
  const label = labelForCard(card);
  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br shadow-xl overflow-hidden transition-all duration-300 ${meta.bg} ${sz}
      ${selected ? "ring-[3px] ring-cyan-400 border-cyan-400 scale-105" : playable ? "ring-2 ring-primary/30 border-primary/40" : "border-white/10 grayscale-[0.25] opacity-80"}`}>
      <div className="absolute inset-1.5 rounded-xl border border-white/10 flex flex-col items-center justify-center">
        <div className={`absolute top-1 left-1.5 text-[10px] font-black ${meta.text}`}>{label}</div>
        <div className={`z-10 ${meta.text} drop-shadow-lg`}>
          {card.type === "number" && <span className="text-3xl md:text-5xl font-black italic">{card.value}</span>}
          {card.type === "skip" && <Ban className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} />}
          {card.type === "reverse" && <RefreshCcw className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} />}
          {card.type === "draw2" && <span className="text-2xl md:text-4xl font-black italic">+2</span>}
          {card.type === "wild" && <Sparkles className="w-8 h-8 md:w-12 md:h-12" strokeWidth={2.5} />}
          {card.type === "wild4" && <span className="text-2xl md:text-4xl font-black italic">+4</span>}
        </div>
        <div className={`absolute bottom-1 right-1.5 text-[10px] font-black rotate-180 ${meta.text}`}>{label}</div>
      </div>
    </div>
  );
}
