import React, { useEffect, useRef } from "react";
import { Sparkles, Download, Copy, RefreshCw, Trash2, Sliders } from "lucide-react";
import type { UpscaleScale } from "../types";

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onUpscale: (scale?: UpscaleScale) => void;
  onDownload: () => void;
  onCopy: () => void;
  onChangeImage: () => void;
  onClear: () => void;
  isUpscaled: boolean;
  isProcessing: boolean;
  currentScale: UpscaleScale;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  onUpscale,
  onDownload,
  onCopy,
  onChangeImage,
  onClear,
  isUpscaled,
  isProcessing,
  currentScale,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Clamp position within window bounds
  const menuWidth = 230;
  const menuHeight = 260;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ left: `${Math.max(12, clampedX)}px`, top: `${Math.max(12, clampedY)}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="context-menu-header">
        <Sparkles size={13} className="text-emerald" />
        <span>Lucent Optics</span>
      </div>

      <div className="context-menu-items">
        {!isUpscaled ? (
          <button
            type="button"
            className="context-menu-item primary"
            disabled={isProcessing}
            onClick={() => {
              onUpscale();
              onClose();
            }}
          >
            <Sparkles size={14} />
            <span>Upscale with Lucent ({currentScale}×)</span>
          </button>
        ) : (
          <button
            type="button"
            className="context-menu-item primary"
            onClick={() => {
              onDownload();
              onClose();
            }}
          >
            <Download size={14} />
            <span>Save Enhanced Image</span>
          </button>
        )}

        <div className="context-scale-options">
          <div className="context-submenu-label">
            <Sliders size={11} />
            <span>Upscale Multiplier</span>
          </div>
          <div className="context-scale-row">
            {(["2", "3", "4"] as UpscaleScale[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`context-scale-btn ${currentScale === s ? "active" : ""}`}
                disabled={isProcessing}
                onClick={() => {
                  onUpscale(s);
                  onClose();
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="context-menu-divider" />

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onCopy();
            onClose();
          }}
        >
          <Copy size={13} />
          <span>Copy Image to Clipboard</span>
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onChangeImage();
            onClose();
          }}
        >
          <RefreshCw size={13} />
          <span>Change Image</span>
        </button>

        <button
          type="button"
          className="context-menu-item danger"
          onClick={() => {
            onClear();
            onClose();
          }}
        >
          <Trash2 size={13} />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};
