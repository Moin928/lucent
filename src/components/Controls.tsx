import type { FC } from "react";
import type { UpscaleScale, GpuDevice } from "../types";
import { Zap, AlertTriangle } from "lucide-react";

interface ControlsProps {
  scale: UpscaleScale;
  onScaleChange: (scale: UpscaleScale) => void;
  gpus: GpuDevice[];
  selectedGpuId: string;
  onGpuChange: (gpuId: string) => void;
  disabled?: boolean;
}

export const Controls: FC<ControlsProps> = ({
  scale,
  onScaleChange,
  gpus,
  selectedGpuId,
  onGpuChange,
  disabled = false,
}) => {
  const hasDedicatedGpu = gpus.length > 0;

  return (
    <div className="dock-controls-container">
      <div className="scale-control-group">
        <span className="scale-group-label">SCALE</span>
        <div className="tactile-scale-cluster">
          {(["2", "3", "4"] as UpscaleScale[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`tactile-round-btn ${scale === s ? "is-selected" : ""}`}
              onClick={() => onScaleChange(s)}
              disabled={disabled || !hasDedicatedGpu}
              title={`Upscale ${s}×`}
            >
              <span className="round-btn-gloss" />
              <span className="round-btn-text">{s}×</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Dedicated GPU Indicator */}
      <div className="gpu-control-group">
        <span className="scale-group-label">HARDWARE ENGINE</span>
        <div className="gpu-select-cluster">
          {hasDedicatedGpu ? (
            gpus.map((gpu) => {
              const shortName = gpu.name
                .replace("NVIDIA GeForce", "NVIDIA")
                .replace("Laptop GPU", "")
                .trim();

              return (
                <button
                  key={gpu.id}
                  type="button"
                  className={`gpu-option-btn ${selectedGpuId === gpu.id ? "is-active" : ""}`}
                  onClick={() => onGpuChange(gpu.id)}
                  disabled={disabled}
                  title={`${gpu.name} (Dedicated Hardware GPU)`}
                >
                  <Zap size={13} className="text-emerald" />
                  <span>{shortName}</span>
                  <span className="gpu-active-badge">ACTIVE</span>
                </button>
              );
            })
          ) : (
            <div className="gpu-option-btn is-missing" title="No discrete GPU found">
              <AlertTriangle size={13} className="text-amber" />
              <span>No Dedicated GPU</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
