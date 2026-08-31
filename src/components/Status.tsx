import React from "react";
import { Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ProcessingStage } from "../types";

interface StatusProps {
  stage: ProcessingStage;
  scale: string;
  hasFile: boolean;
  outputPath?: string | null;
  errorMessage?: string | null;
  onDownload?: () => void;
}

export const Status: React.FC<StatusProps> = ({
  stage,
  scale,
  hasFile,
  outputPath,
  errorMessage,
  onDownload,
}) => {
  if (stage === "error") {
    return (
      <div className="status-banner error">
        <AlertCircle size={14} className="status-icon" />
        <span className="status-message">{errorMessage || "Upscaling failed."}</span>
      </div>
    );
  }

  if (stage === "completed" && outputPath) {
    return (
      <div className="status-banner success">
        <div className="status-success-left">
          <CheckCircle2 size={14} className="status-icon text-emerald" />
          <span className="status-message">Saved to {outputPath}</span>
        </div>
        {onDownload && (
          <button type="button" className="btn-status-download" onClick={onDownload}>
            <Download size={13} />
            <span>Save image</span>
          </button>
        )}
      </div>
    );
  }

  if (stage === "inferencing") {
    return (
      <div className="status-banner processing">
        <Loader2 size={14} className="status-spinner-icon" />
        <span className="status-message">Upscaling at {scale}× with Real-ESRGAN...</span>
      </div>
    );
  }

  return (
    <div className="status-strip idle">
      <span className="status-tip">
        {hasFile ? (
          <>
            <span className="kbd-badge">Ctrl+Enter</span> to upscale at <span className="text-emerald font-semibold">{scale}×</span>
          </>
        ) : (
          <>
            <span className="kbd-badge">Ctrl+O</span> to browse image
          </>
        )}
      </span>
    </div>
  );
};
