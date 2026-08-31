export type UpscaleScale = "2" | "3" | "4";

export type ProcessingStage =
  | "idle"
  | "initializing"
  | "inferencing"
  | "completed"
  | "error";

export interface GpuDevice {
  id: string;
  name: string;
  is_discrete: boolean;
}
