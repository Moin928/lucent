import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { formatBytes } from "../utils/format";

interface UploadAreaProps {
  selectedFile: File | null;
  previewUrl: string | null;
  upscaledUrl: string | null;
  dimensions: { width: number; height: number } | null;
  scale: string;
  isProcessing: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  selectedFile,
  previewUrl,
  upscaledUrl,
  dimensions,
  scale,
  isProcessing,
  onFileSelect,
  onClear,
  fileInputRef,
  onContextMenu,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scaleNum = parseInt(scale, 10);
  const targetWidth = dimensions ? dimensions.width * scaleNum : 0;
  const targetHeight = dimensions ? dimensions.height * scaleNum : 0;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => {
      if (isDraggingSlider) setIsDraggingSlider(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches.length > 0) handleSliderMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      if (isDraggingSlider) setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDraggingSlider, handleSliderMove]);

  return (
    <div
      className={`upload-glass-card ${isDragging ? "is-dragover" : ""} ${
        selectedFile ? "has-file" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        if (selectedFile && onContextMenu) {
          e.preventDefault();
          onContextMenu(e);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!selectedFile && (e.key === "Enter" || e.key === " ")) {
          fileInputRef.current?.click();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden-file-input"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="empty-state"
            className="empty-drop-state"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="center-upload-emblem">
              <div className="emblem-halo" />
              <div className="upload-glyph-circle">
                <UploadCloud size={32} className="upload-main-icon" />
              </div>
            </div>

            <div className="drop-copy">
              <h2 className="drop-heading">Drop an image here</h2>
              <p className="drop-subtext">Supports PNG, JPG, JPEG and WebP up to 4K</p>
            </div>

            <button
              type="button"
              className="tactile-pill-btn browse"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <span className="btn-gloss-layer" />
              <span className="btn-label-content">
                <UploadCloud size={15} />
                <span>Choose Image</span>
              </span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="selected-state"
            className="selected-file-state"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            {/* Top Info Bar */}
            <div className="file-header-strip">
              <div className="file-title-meta">
                <span className="file-title" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
                <span className="meta-pill">{formatBytes(selectedFile.size)}</span>
                {dimensions && (
                  <span className="meta-pill">
                    {dimensions.width} × {dimensions.height}
                  </span>
                )}
              </div>

              <div className="file-actions-row">
                <button
                  type="button"
                  className="tactile-pill-btn sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Choose a different image"
                >
                  <span className="btn-gloss-layer" />
                  <span className="btn-label-content">
                    <RefreshCw size={12} />
                    <span>Change</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="tactile-pill-btn sm danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  title="Remove image"
                >
                  <span className="btn-gloss-layer" />
                  <span className="btn-label-content">
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Viewport Frame */}
            <div
              ref={containerRef}
              className={`preview-viewport ${isProcessing ? "is-processing" : ""}`}
            >
              {/* Original Layer (Visible on LEFT side of divider) */}
              {previewUrl && (
                <div
                  className="comparison-clip original-clip"
                  style={{ clipPath: upscaledUrl ? `inset(0 ${100 - sliderPos}% 0 0)` : undefined }}
                >
                  <img
                    src={previewUrl}
                    alt="Original source"
                    className="viewport-img base-layer"
                    draggable={false}
                  />
                  {upscaledUrl && (
                    <div className="view-tag original-tag">
                      <span>Original</span>
                    </div>
                  )}
                </div>
              )}

              {/* Upscaled Result Overlay (Visible on RIGHT side of divider) */}
              {upscaledUrl && (
                <div
                  className="comparison-clip upscaled-clip"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img
                    src={upscaledUrl}
                    alt="Upscaled output"
                    className="viewport-img upscaled-layer"
                    draggable={false}
                  />
                  <div className="view-tag upscale-tag">
                    <Sparkles size={11} />
                    <span>Upscaled {scale}×</span>
                  </div>
                </div>
              )}

              {upscaledUrl && (
                <div
                  className="slider-line-divider"
                  style={{ left: `${sliderPos}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingSlider(true);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDraggingSlider(true);
                  }}
                >
                  <div className="slider-handle-pill-tactile">
                    <SlidersHorizontal size={13} />
                  </div>
                </div>
              )}

              {/* Processing Laser Scanline */}
              {isProcessing && (
                <div className="processing-curtain">
                  <div className="laser-beam-scan" />
                  <div className="processing-badge">
                    <div className="curtain-spinner" />
                    <span className="curtain-text">Upscaling at {scale}×...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution specs footer */}
            {dimensions && (
              <div className="resolution-footer-strip">
                <div className="res-flow-group">
                  <span className="res-dim">{dimensions.width} × {dimensions.height}</span>
                  <ArrowRight size={13} className="text-emerald" />
                  <span className="res-dim highlight">{targetWidth} × {targetHeight}</span>
                  <span className="scale-pill-badge">{scale}×</span>
                </div>
                <span className="hint-rightclick">Right-click image for quick actions</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
