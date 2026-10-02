import React, { useState } from "react";
import { 
  DocumentPage, 
  DocumentSettings, 
  PAGE_DIMENSIONS, 
  CollaboratorPresence 
} from "@/lib/types/document";
import { Map, ChevronRight, ChevronLeft, Plus, Users } from "lucide-react";

interface DocumentMinimapProps {
  pages: DocumentPage[];
  settings: DocumentSettings;
  currentPageNumber: number;
  onSelectPage: (pageNumber: number) => void;
  onAddPage: () => void;
  collaborators: CollaboratorPresence[];
  canEdit: boolean;
}

export const DocumentMinimap: React.FC<DocumentMinimapProps> = ({
  pages,
  settings,
  currentPageNumber,
  onSelectPage,
  onAddPage,
  collaborators,
  canEdit,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Aspect ratio based on settings
  const dims = PAGE_DIMENSIONS[settings.format]?.[settings.orientation] || PAGE_DIMENSIONS.a4.portrait;
  const isLandscape = settings.orientation === 'landscape';

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-end select-none">
      {/* Trigger Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold transition-all hover:scale-105 active:scale-95"
        title="Toggle Bird's-Eye View (Minimap)"
      >
        <Map className="w-4 h-4 text-blue-400" />
        <span className="hidden sm:inline">Overview</span>
        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-300 font-mono">
          {pages.length}
        </span>
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {/* Expanded Bird's-Eye Panel */}
      {isOpen && (
        <div 
          className="ml-2 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl p-3 backdrop-blur-xl max-h-[75vh] w-48 sm:w-56 overflow-y-auto flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Map className="w-3.5 h-3.5 text-blue-400" />
              <span>Bird&apos;s-Eye View</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </span>
          </div>

          {/* Miniature Page Cards */}
          <div className="space-y-2 py-1">
            {pages.map((page) => {
              const isCurrent = page.pageNumber === currentPageNumber;
              const pageCollaborators = collaborators.filter(c => c.activePageNumber === page.pageNumber);

              return (
                <div
                  key={page.id}
                  onClick={() => onSelectPage(page.pageNumber)}
                  className={`group relative cursor-pointer rounded-lg p-1.5 border transition-all ${
                    isCurrent 
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' 
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span className={`font-semibold ${isCurrent ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>
                      Page {page.pageNumber}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {page.blocks.length} {page.blocks.length === 1 ? 'block' : 'blocks'}
                    </span>
                  </div>

                  {/* Miniature Page Representation */}
                  <div 
                    className="relative w-full bg-white rounded-[2px] shadow-sm p-1.5 overflow-hidden flex flex-col gap-0.5"
                    style={{
                      height: isLandscape ? '60px' : '82px',
                    }}
                  >
                    {/* Abstract preview lines representing blocks */}
                    {page.blocks.slice(0, 6).map((b, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] h-1 ${
                          b.type === 'heading' 
                            ? 'w-3/4 bg-slate-900 h-1.5 mb-0.5' 
                            : b.type === 'table' 
                              ? 'w-full bg-blue-300 h-2' 
                              : b.type === 'callout' 
                                ? 'w-full bg-purple-200 h-2' 
                                : b.type === 'diagram'
                                  ? 'w-4/5 bg-teal-200 h-2'
                                  : 'w-full bg-slate-200'
                        }`}
                      />
                    ))}

                    {/* Active Collaborator badges on miniature page */}
                    {pageCollaborators.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex -space-x-1">
                        {pageCollaborators.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-block w-3.5 h-3.5 rounded-full border border-white shadow-sm flex items-center justify-center text-[7px] text-white font-bold"
                            style={{ backgroundColor: c.userColor }}
                            title={`${c.userName} is on Page ${page.pageNumber}`}
                          >
                            {c.userName.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Collaborator labels below card if any */}
                  {pageCollaborators.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-slate-400">
                      {pageCollaborators.map((c, idx) => (
                        <span key={idx} className="flex items-center gap-1 font-medium" style={{ color: c.userColor }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.userColor }} />
                          {c.userName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Page in Minimap */}
          {canEdit && (
            <button
              onClick={onAddPage}
              className="w-full py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
