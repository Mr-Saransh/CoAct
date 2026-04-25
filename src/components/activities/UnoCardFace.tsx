"use client";
import { Ban, RefreshCcw, Sparkles } from "lucide-react";
import { COLOR_META, labelForCard, type UnoCard } from "./uno-utils";

export function UnoCardFace({ card, playable, selected, compact }: {
  card: UnoCard; playable: boolean; selected?: boolean; compact?: boolean;
}) {
  const meta = COLOR_META[card.color];
  const sz = compact ? "h-32 w-20 md:h-44 md:w-28" : "h-36 w-24 md:h-48 md:w-32";
  const label = labelForCard(card);
  
  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br shadow-2xl overflow-hidden transition-all duration-300 ${meta.bg} ${sz}
      ${selected ? "ring-4 ring-white border-white scale-105 z-50" : playable ? "ring-1 ring-white/20 border-white/40 cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.4)]" : "border-white/5 opacity-60 grayscale-[0.5]"}`}>
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      
      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }} />

      <div className="absolute inset-2 rounded-xl border border-white/10 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[1px]">
        {/* Top Label */}
        <div className={`absolute top-1.5 left-2 text-[10px] md:text-xs font-black tracking-tighter ${meta.text} opacity-80`}>{label}</div>
        
        {/* Center Symbol */}
        <div className={`z-10 ${meta.text} drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]`}>
          {card.type === "number" && <span className="text-4xl md:text-6xl font-black italic tracking-tighter leading-none">{card.value}</span>}
          {card.type === "skip" && <Ban className="w-10 h-10 md:w-16 md:h-16" strokeWidth={3} />}
          {card.type === "reverse" && <RefreshCcw className="w-10 h-10 md:w-16 md:h-16" strokeWidth={3} />}
          {card.type === "draw2" && <span className="text-3xl md:text-5xl font-black italic">+2</span>}
          {card.type === "wild" && <div className="p-2 bg-white/20 rounded-full"><Sparkles className="w-8 h-8 md:w-14 md:h-14 text-white" strokeWidth={2.5} /></div>}
          {card.type === "wild4" && <span className="text-3xl md:text-5xl font-black italic">+4</span>}
        </div>

        {/* Bottom Label (Inverted) */}
        <div className={`absolute bottom-1.5 right-2 text-[10px] md:text-xs font-black tracking-tighter rotate-180 ${meta.text} opacity-80`}>{label}</div>
      </div>

      {/* Edge Shine */}
      <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
    </div>
  );
}
