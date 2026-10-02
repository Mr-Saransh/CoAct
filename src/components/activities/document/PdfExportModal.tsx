import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, Download, RefreshCw, X } from "lucide-react";

export interface PdfExportState {
  isOpen: boolean;
  status: 'idle' | 'rendering' | 'success' | 'error';
  progressText: string;
  errorMessage?: string;
  failedImageCount?: number;
}

interface PdfExportModalProps {
  state: PdfExportState;
  onClose: () => void;
  onRetry: () => void;
  onExportSafe: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  state,
  onClose,
  onRetry,
  onExportSafe,
}) => {
  return (
    <Dialog open={state.isOpen} onOpenChange={(open) => !open && state.status !== 'rendering' && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {state.status === 'rendering' && (
              <>
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span>Exporting Document to PDF</span>
              </>
            )}
            {state.status === 'success' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>PDF Export Complete!</span>
              </>
            )}
            {state.status === 'error' && (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>PDF Export Notice</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {state.status === 'rendering' && "Generating print-accurate document pages. Please wait a moment..."}
            {state.status === 'success' && "Your document has been downloaded with faithful pagination and styling."}
            {state.status === 'error' && "We encountered an issue while generating the PDF output."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {state.status === 'rendering' && (
            <div className="space-y-3">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-full animate-pulse" />
              </div>
              <p className="text-center text-xs text-slate-300 font-medium font-mono">
                {state.progressText || "Processing document pages..."}
              </p>
            </div>
          )}

          {state.status === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-center space-y-2">
              <p className="text-xs text-emerald-200 font-medium">
                Document exported successfully with all pages and custom formatting preserved.
              </p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                <p className="font-semibold text-amber-100">Why did this happen?</p>
                <p className="leading-relaxed text-slate-300 text-[11px]">
                  {state.errorMessage || "One or more external assets could not be converted, or a color function required sanitization."}
                </p>
              </div>

              {state.failedImageCount && state.failedImageCount > 0 ? (
                <p className="text-xs text-slate-400">
                  You can safely export the document by rendering placeholders for inaccessible images.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          {state.status === 'error' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs border-slate-700 hover:bg-slate-800"
              >
                Close
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onExportSafe}
                className="text-xs bg-blue-600 hover:bg-blue-500 font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Clean Version</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-xs border-slate-700 hover:bg-slate-800 gap-1.5 text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            </>
          ) : state.status === 'success' ? (
            <Button
              size="sm"
              onClick={onClose}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Done
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="text-xs opacity-50 border-slate-800"
            >
              Rendering...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
