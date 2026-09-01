export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatGpuName(name: string): string {
  return name
    .replace(/\(TM\)|\(R\)/gi, "")
    .replace("NVIDIA GeForce", "NVIDIA")
    .replace("Laptop GPU", "")
    .replace("Series", "")
    .replace("Graphics", "")
    .replace(/\s+/g, " ")
    .trim();
}
