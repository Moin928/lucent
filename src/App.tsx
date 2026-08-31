import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Download, RefreshCw } from "lucide-react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { SilkBackground } from "./components/SilkBackground";
import { SplashScreen } from "./components/SplashScreen";
import { UploadArea } from "./components/UploadArea";
import { Controls } from "./components/Controls";
import { Status } from "./components/Status";
import { ContextMenu } from "./components/ContextMenu";
import type { UpscaleScale, ProcessingStage, GpuDevice } from "./types";
import logoImg from "./assets/lucent-logo.png";

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [splashDone, setSplashDone] = useState(false);
  const [contextMenuRegistered, setContextMenuRegistered] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileBytes, setFileBytes] = useState<number[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const [scale, setScale] = useState<UpscaleScale>("4");
  const [gpus, setGpus] = useState<GpuDevice[]>([]);
  const [selectedGpuId, setSelectedGpuId] = useState<string>("auto");
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setStage("error");
      setErrorMessage("Unsupported format. Please select PNG, JPG, JPEG, or WebP.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (upscaledUrl) URL.revokeObjectURL(upscaledUrl);

    const rawPath = (file as unknown as { path?: string }).path || null;
    setFilePath(rawPath);

    // Only buffer raw bytes into memory if file doesn't have a direct filesystem path
    if (!rawPath) {
      try {
        const buffer = await file.arrayBuffer();
        setFileBytes(Array.from(new Uint8Array(buffer)));
      } catch {
        setFileBytes(null);
      }
    } else {
      setFileBytes(null);
    }

    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setSelectedFile(file);
      setPreviewUrl(objUrl);
      setUpscaledUrl(null);
      setStage("idle");
      setOutputPath(null);
      setErrorMessage(null);
    };
    img.src = objUrl;
  }, [previewUrl, upscaledUrl]);

  // On startup: check context menu, detect available hardware GPUs & load CLI image immediately
  useEffect(() => {
    invoke<boolean>("is_context_menu_registered")
      .then(setContextMenuRegistered)
      .catch(() => {});

    invoke<GpuDevice[]>("get_available_gpus")
      .then((detected) => {
        if (detected && detected.length > 0) {
          setGpus(detected);
          const discrete = detected.find((g) => g.is_discrete);
          if (discrete) {
            setSelectedGpuId(discrete.id);
          } else {
            setSelectedGpuId(detected[0].id);
          }
        }
      })
      .catch(() => {});

    // Check if app was launched with an image file (e.g. from Windows Explorer)
    invoke<{ path: string; name: string; bytes: number[] } | null>("get_cli_image_payload")
      .then((payload) => {
        if (payload && payload.bytes && payload.bytes.length > 0) {
          const u8 = new Uint8Array(payload.bytes);
          const mime = payload.name.endsWith(".png")
            ? "image/png"
            : payload.name.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";
          const file = new File([u8], payload.name, { type: mime });
          Object.defineProperty(file, "path", { value: payload.path });
          handleFileSelect(file);
          setSplashDone(true);
        }
      })
      .catch(() => {});
  }, [handleFileSelect]);

  const handleToggleContextMenu = async () => {
    try {
      if (contextMenuRegistered) {
        await invoke("unregister_context_menu");
        setContextMenuRegistered(false);
      } else {
        await invoke("register_context_menu");
        setContextMenuRegistered(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (upscaledUrl) URL.revokeObjectURL(upscaledUrl);
    setSelectedFile(null);
    setFilePath(null);
    setFileBytes(null);
    setPreviewUrl(null);
    setUpscaledUrl(null);
    setDimensions(null);
    setStage("idle");
    setOutputPath(null);
    setErrorMessage(null);
    setContextMenu({ isOpen: false, x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl, upscaledUrl]);

  const handleUpscale = async (targetScale?: UpscaleScale) => {
    if (!selectedFile || !previewUrl || !dimensions) return;

    const scaleToUse = targetScale || scale;
    if (targetScale && targetScale !== scale) {
      setScale(targetScale);
    }

    setStage("inferencing");
    setErrorMessage(null);

    const scaleNumber = parseInt(scaleToUse, 10);

    try {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

      if (isTauri) {
        // Direct C++ Vulkan execution via Rust
        const absoluteOutputPath = await invoke<string>("upscale_image", {
          inputPath: filePath,
          fileName: selectedFile.name,
          imageBytes: fileBytes,
          scale: scaleNumber,
          gpuId: selectedGpuId,
        });

        // Convert the on-disk output image path directly to a high-speed asset URL
        const realAssetUrl = convertFileSrc(absoluteOutputPath) + `?t=${Date.now()}`;
        setOutputPath(absoluteOutputPath);
        setUpscaledUrl(realAssetUrl);
        setStage("completed");
      } else {
        // Web fallback
        await new Promise((r) => setTimeout(r, 600));
        setOutputPath(`output/${selectedFile.name}_${scaleToUse}x.png`);
        setUpscaledUrl(previewUrl);
        setStage("completed");
      }
    } catch (err: unknown) {
      setStage("error");
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleDownload = () => {
    if (!upscaledUrl || !selectedFile) return;
    const base = selectedFile.name.replace(/\.[^/.]+$/, "");
    const link = document.createElement("a");
    link.href = upscaledUrl;
    link.download = `${base}_${scale}x.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async () => {
    const url = upscaledUrl || previewUrl;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      // fallback
    }
  };

  const handleScaleChange = (newScale: UpscaleScale) => {
    setScale(newScale);
    if (stage === "completed") {
      setStage("idle");
      setUpscaledUrl(null);
    }
  };

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (selectedFile && stage !== "inferencing" && stage !== "completed") {
          handleUpscale();
        }
      } else if (e.key === "Escape") {
        if (contextMenu.isOpen) {
          setContextMenu({ isOpen: false, x: 0, y: 0 });
        } else if (selectedFile && stage !== "inferencing") {
          handleClear();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, stage, contextMenu.isOpen, handleClear]);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
    invoke("show_main_window").catch(() => {});
  }, []);

  const isProcessing = stage === "inferencing";
  const isCompleted = stage === "completed";

  return (
    <>
      {/* Hogwarts Legacy-style startup animation */}
      <AnimatePresence>
        {!splashDone && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          >
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="app-viewport"
        initial={{ opacity: 0 }}
        animate={{ opacity: splashDone ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <SilkBackground />

        <div className="app-shell-container">
          {/* Unified workspace console panel */}
          <div className="workspace-panel">
            {/* Integrated Workspace Header with Title & Engine Status */}
            <div className="workspace-header">
              <div className="header-brand-group">
                <div className="header-logo-box">
                  <img src={logoImg} alt="Lucent Logo" className="header-logo-img" />
                </div>
                <div className="header-text-group">
                  <h1 className="header-title">Lucent</h1>
                  <p className="header-subtitle">Local Neural Upscaler</p>
                </div>
              </div>

              <div className="header-right-group">
                <button
                  type="button"
                  className={`header-explorer-toggle ${contextMenuRegistered ? "active" : ""}`}
                  onClick={handleToggleContextMenu}
                  title={
                    contextMenuRegistered
                      ? "Explorer context menu active (click to remove)"
                      : "Add 'Upscale with Lucent' to Windows Explorer right-click menu"
                  }
                >
                  <span>{contextMenuRegistered ? "✓ Explorer Menu Active" : "+ Add to Explorer Menu"}</span>
                </button>

                <div className="header-engine-tag">
                  <span className="engine-name">Real-ESRGAN x4plus</span>
                  <span className="engine-sep">•</span>
                  <span className="engine-sub">
                    {selectedGpuId === "auto"
                      ? "Auto GPU"
                      : gpus.find((g) => g.id === selectedGpuId)?.name.replace("NVIDIA GeForce", "RTX").replace("Laptop GPU", "").trim() || "GPU"}
                  </span>
                </div>
              </div>
            </div>

            <UploadArea
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              upscaledUrl={upscaledUrl}
              dimensions={dimensions}
              scale={scale}
              isProcessing={isProcessing}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              fileInputRef={fileInputRef}
              onContextMenu={handleContextMenuOpen}
            />

            <div className="workspace-dock">
              <Controls
                scale={scale}
                onScaleChange={handleScaleChange}
                gpus={gpus}
                selectedGpuId={selectedGpuId}
                onGpuChange={setSelectedGpuId}
                disabled={isProcessing}
              />

              <AnimatePresence mode="wait">
                {!isCompleted ? (
                  <motion.button
                    key="btn-upscale"
                    type="button"
                    className={`btn-upscale-master ${isProcessing ? "is-running" : ""}`}
                    disabled={!selectedFile || isProcessing}
                    onClick={() => handleUpscale()}
                    whileTap={!selectedFile || isProcessing ? undefined : { scale: 0.99 }}
                    transition={{ duration: 0.1 }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <div className="btn-specular-glow" />
                    <div className="btn-inner-row">
                      {isProcessing ? (
                        <>
                          <Loader2 size={16} className="btn-spinner-icon" />
                          <span>Upscaling at {scale}×...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Upscale {scale}×</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                ) : (
                  <motion.div
                    key="completed-actions"
                    className="completed-actions-row"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button type="button" className="btn-download-master" onClick={handleDownload}>
                      <Download size={16} />
                      <span>Save Image</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-action"
                      onClick={() => { setStage("idle"); setUpscaledUrl(null); }}
                    >
                      <RefreshCw size={14} />
                      <span>Upscale Again</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <Status
            stage={stage}
            scale={scale}
            hasFile={!!selectedFile}
            outputPath={outputPath}
            errorMessage={errorMessage}
            onDownload={upscaledUrl ? handleDownload : undefined}
          />
          <footer className="app-copyright-footer">
            <span>© 2026 Qureshi Mohammed Moin. All rights reserved.</span>
          </footer>
        </div>

        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={contextMenu.isOpen}
          onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0 })}
          onUpscale={handleUpscale}
          onDownload={handleDownload}
          onCopy={handleCopyImage}
          onChangeImage={() => fileInputRef.current?.click()}
          onClear={handleClear}
          isUpscaled={isCompleted}
          isProcessing={isProcessing}
          currentScale={scale}
        />
      </motion.div>
    </>
  );
}

export default App;