import type { FC } from "react";
import type { UpscaleScale, GpuDevice } from "../types";
import { Zap, AlertTriangle } from "lucide-react";
import { formatGpuName } from "../utils/format";

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
  const hasGpu = gpus.length > 0;

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
              disabled={disabled || !hasGpu}
              title={`Upscale ${s}×`}
            >
              <span className="round-btn-gloss" />
              <span className="round-btn-text">{s}×</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hardware GPU Indicator */}
      <div className="gpu-control-group">
        <span className="scale-group-label">HARDWARE ENGINE</span>
        <div className="gpu-select-cluster">
          {hasGpu ? (
            gpus.map((gpu) => {
              const shortName = formatGpuName(gpu.name);
              const isActive = selectedGpuId === gpu.id || (selectedGpuId === "auto" && gpus[0].id === gpu.id);

              return (
                <button
                  key={gpu.id}
                  type="button"
                  className={`gpu-option-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => onGpuChange(gpu.id)}
                  disabled={disabled}
                  title={`${gpu.name} (GPU ${gpu.id})`}
                >
                  <Zap size={13} className={isActive ? "text-emerald" : "text-muted"} />
                  <span>{shortName}</span>
                  {isActive && <span className="gpu-active-badge">ACTIVE</span>}
                </button>
              );
            })
          ) : (
            <div className="gpu-option-btn is-missing" title="No Vulkan-capable GPU detected">
              <AlertTriangle size={13} className="text-amber" />
              <span>No Compatible GPU</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
