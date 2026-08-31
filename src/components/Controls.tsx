import type { FC } from "react";
import type { UpscaleScale, GpuDevice } from "../types";
import { Cpu, Zap } from "lucide-react";

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
              disabled={disabled}
              title={`Upscale ${s}×`}
            >
              <span className="round-btn-gloss" />
              <span className="round-btn-text">{s}×</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hardware GPU Selector */}
      <div className="gpu-control-group">
        <span className="scale-group-label">PROCESSOR</span>
        <div className="gpu-select-cluster">
          <button
            type="button"
            className={`gpu-option-btn ${selectedGpuId === "auto" ? "is-active" : ""}`}
            onClick={() => onGpuChange("auto")}
            disabled={disabled}
            title="Auto-select fastest GPU"
          >
            <Zap size={12} />
            <span>Auto</span>
          </button>

          {gpus.map((gpu) => {
            const shortName = gpu.name
              .replace("NVIDIA GeForce", "RTX")
              .replace("Laptop GPU", "")
              .replace("Intel(R)", "Intel")
              .replace("Graphics", "")
              .trim();

            return (
              <button
                key={gpu.id}
                type="button"
                className={`gpu-option-btn ${selectedGpuId === gpu.id ? "is-active" : ""}`}
                onClick={() => onGpuChange(gpu.id)}
                disabled={disabled}
                title={`${gpu.name} (GPU ${gpu.id})`}
              >
                {gpu.is_discrete ? <Zap size={12} /> : <Cpu size={12} />}
                <span>{shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
