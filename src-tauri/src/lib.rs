use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;

// Store CLI-passed image path so frontend can retrieve it on startup
static CLI_IMAGE_PATH: Mutex<Option<String>> = Mutex::new(None);

fn find_project_root() -> PathBuf {
    let rel_exe = Path::new("bin")
        .join("realesrgan-ncnn-vulkan-v0.2.0-windows")
        .join("realesrgan-ncnn-vulkan.exe");

    // 1. Check current working directory and its parents
    if let Ok(cwd) = std::env::current_dir() {
        let mut cur = cwd.clone();
        for _ in 0..6 {
            if cur.join(&rel_exe).exists() && cur.join("models").join("realesrgan-x4plus.param").exists() {
                return cur;
            }
            match cur.parent() {
                Some(p) => cur = p.to_path_buf(),
                None => break,
            }
        }
    }

    // 2. Check exe directory and its parents (bundled NSIS installer or portable app)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let mut cur = exe_dir.to_path_buf();
            for _ in 0..6 {
                if cur.join(&rel_exe).exists() && cur.join("models").join("realesrgan-x4plus.param").exists() {
                    return cur;
                }
                match cur.parent() {
                    Some(p) => cur = p.to_path_buf(),
                    None => break,
                }
            }
        }
    }

    // 3. Fallback to standard workspace root
    PathBuf::from(r"c:\Projects\lucent")
}

#[cfg(target_os = "windows")]
fn apply_dark_titlebar_hwnd(hwnd_ptr: *mut std::ffi::c_void) {
    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(
            hwnd: *mut std::ffi::c_void,
            dwAttribute: u32,
            pvAttribute: *const std::ffi::c_void,
            cbAttribute: u32,
        ) -> i32;
    }

    unsafe {
        let dark_mode: i32 = 1;
        let _ = DwmSetWindowAttribute(
            hwnd_ptr,
            20,
            &dark_mode as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<i32>() as u32,
        );

        let _ = DwmSetWindowAttribute(
            hwnd_ptr,
            19,
            &dark_mode as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<i32>() as u32,
        );

        let caption_color: u32 = 0x00050803;
        let _ = DwmSetWindowAttribute(
            hwnd_ptr,
            35,
            &caption_color as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        );

        let text_color: u32 = 0x00F4FDF0;
        let _ = DwmSetWindowAttribute(
            hwnd_ptr,
            36,
            &text_color as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        );
    }
}

/// Called by frontend after splash — show the main window
#[tauri::command]
fn show_main_window(window: tauri::Window) {
    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = window.hwnd() {
        apply_dark_titlebar_hwnd(hwnd.0);
    }

    let _ = window.show();
    let _ = window.set_focus();
}

#[derive(serde::Serialize)]
pub struct ImagePayload {
    pub path: String,
    pub name: String,
    pub bytes: Vec<u8>,
}

/// Returns the file payload passed via CLI (e.g. from Explorer right-click)
#[tauri::command]
fn get_cli_image_payload() -> Option<ImagePayload> {
    let path_str = CLI_IMAGE_PATH.lock().ok()?.clone()?;
    let path = Path::new(&path_str);
    if path.exists() {
        let name = path.file_name()?.to_string_lossy().to_string();
        let bytes = fs::read(path).ok()?;
        Some(ImagePayload {
            path: path_str,
            name,
            bytes,
        })
    } else {
        None
    }
}

/// Register Windows Explorer right-click context menu for image files
#[tauri::command]
fn register_context_menu() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Cannot find exe path: {}", e))?;
        let exe_str = exe_path.to_string_lossy();

        let extensions = [
            "image",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            "pngfile",
            "jpegfile",
        ];

        for target in &extensions {
            let reg_key = if *target == "image" {
                format!("HKCU\\Software\\Classes\\SystemFileAssociations\\image\\shell\\LucentUpscale")
            } else if target.starts_with('.') {
                format!("HKCU\\Software\\Classes\\SystemFileAssociations\\{}\\shell\\LucentUpscale", target)
            } else {
                format!("HKCU\\Software\\Classes\\{}\\shell\\LucentUpscale", target)
            };

            let cmd_key = format!("{}\\command", reg_key);

            let _ = Command::new("reg")
                .args(["add", &reg_key, "/v", "", "/t", "REG_SZ", "/d", "Upscale with Lucent", "/f"])
                .output();

            let _ = Command::new("reg")
                .args(["add", &reg_key, "/v", "Icon", "/t", "REG_SZ", "/d", &format!("\"{}\",0", exe_str), "/f"])
                .output();

            let _ = Command::new("reg")
                .args(["add", &cmd_key, "/v", "", "/t", "REG_SZ", "/d", &format!("\"{}\" \"%1\"", exe_str), "/f"])
                .output();
        }

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Context menu registration is only supported on Windows".to_string())
    }
}

/// Remove the context menu registration
#[tauri::command]
fn unregister_context_menu() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let extensions = [
            "image",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            "pngfile",
            "jpegfile",
        ];

        for target in &extensions {
            let reg_key = if *target == "image" {
                format!("HKCU\\Software\\Classes\\SystemFileAssociations\\image\\shell\\LucentUpscale")
            } else if target.starts_with('.') {
                format!("HKCU\\Software\\Classes\\SystemFileAssociations\\{}\\shell\\LucentUpscale", target)
            } else {
                format!("HKCU\\Software\\Classes\\{}\\shell\\LucentUpscale", target)
            };

            let _ = Command::new("reg")
                .args(["delete", &reg_key, "/f"])
                .output();
        }

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Not supported on this platform".to_string())
    }
}

/// Check if context menu is currently registered
#[tauri::command]
fn is_context_menu_registered() -> bool {
    #[cfg(target_os = "windows")]
    {
        let reg_key = "HKCU\\Software\\Classes\\SystemFileAssociations\\image\\shell\\LucentUpscale";
        Command::new("reg")
            .args(["query", reg_key])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    { false }
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct GpuDevice {
    pub id: String,
    pub name: String,
    pub is_discrete: bool,
}

/// Detects available GPUs by querying Real-ESRGAN binary
#[tauri::command]
fn get_available_gpus() -> Vec<GpuDevice> {
    let mut gpus = Vec::new();
    let project_root = find_project_root();
    let exe_path = project_root
        .join("bin")
        .join("realesrgan-ncnn-vulkan-v0.2.0-windows")
        .join("realesrgan-ncnn-vulkan.exe");

    if exe_path.exists() {
        let mut cmd = Command::new(&exe_path);
        cmd.current_dir(&project_root);
        cmd.arg("-v");
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        if let Ok(output) = cmd.output() {
            let combined = format!(
                "{}\n{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );

            let mut seen_ids = std::collections::HashSet::new();
            for line in combined.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('[') {
                    if let Some(close_bracket) = trimmed.find(']') {
                        let inside = &trimmed[1..close_bracket];
                        if let Some(space_pos) = inside.find(' ') {
                            let id_str = inside[..space_pos].trim();
                            let name = inside[space_pos + 1..].trim();
                            if let Ok(_num) = id_str.parse::<u32>() {
                                if !name.contains("Direct3D12") && !name.contains("Basic Render") && seen_ids.insert(id_str.to_string()) {
                                    let lower = name.to_lowercase();
                                    let is_discrete = lower.contains("nvidia")
                                        || lower.contains("geforce")
                                        || lower.contains("rtx")
                                        || lower.contains("gtx")
                                        || lower.contains("radeon rx")
                                        || lower.contains("discrete");

                                    gpus.push(GpuDevice {
                                        id: id_str.to_string(),
                                        name: name.to_string(),
                                        is_discrete,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    gpus.sort_by(|a, b| b.is_discrete.cmp(&a.is_discrete));
    gpus
}

/// Directly invokes Real-ESRGAN Vulkan executable
#[tauri::command]
async fn upscale_image(
    input_path: Option<String>,
    file_name: String,
    image_bytes: Option<Vec<u8>>,
    scale: u32,
    gpu_id: Option<String>,
) -> Result<String, String> {
    if scale != 2 && scale != 3 && scale != 4 {
        return Err("Scale must be 2, 3, or 4".to_string());
    }

    let project_root = find_project_root();
    let exe_path = project_root
        .join("bin")
        .join("realesrgan-ncnn-vulkan-v0.2.0-windows")
        .join("realesrgan-ncnn-vulkan.exe");
    let models_dir = project_root.join("models");
    let input_dir = project_root.join("input");
    let output_dir = project_root.join("output");

    if !exe_path.exists() {
        return Err(format!(
            "Real-ESRGAN binary not found at: {}",
            exe_path.display()
        ));
    }

    if !models_dir.join("realesrgan-x4plus.param").exists() {
        return Err(format!(
            "Neural models not found at: {}",
            models_dir.display()
        ));
    }

    let _ = fs::create_dir_all(&input_dir);
    let _ = fs::create_dir_all(&output_dir);

    // Resolve input path
    let actual_input_path: PathBuf = if let Some(ref path_str) = input_path {
        let p = Path::new(path_str);
        if p.exists() {
            p.to_path_buf()
        } else if input_dir.join(path_str).exists() {
            input_dir.join(path_str)
        } else if let Some(ref bytes) = image_bytes {
            let saved_path = input_dir.join(&file_name);
            fs::write(&saved_path, bytes)
                .map_err(|e| format!("Failed to write input image: {}", e))?;
            saved_path
        } else {
            return Err(format!("Input file does not exist: {}", path_str));
        }
    } else if let Some(ref bytes) = image_bytes {
        let saved_path = input_dir.join(&file_name);
        fs::write(&saved_path, bytes)
            .map_err(|e| format!("Failed to write input image: {}", e))?;
        saved_path
    } else {
        return Err("No input image path or data provided".to_string());
    };

    let base_name = Path::new(&file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");

    let actual_output_path = output_dir.join(format!("{}_{}x.png", base_name, scale));
    let chosen_gpu = match gpu_id.as_deref() {
        Some(id) if id != "auto" => id.to_string(),
        _ => {
            // Automatically prioritize discrete GPU (e.g. NVIDIA RTX)
            let detected = get_available_gpus();
            if let Some(discrete) = detected.iter().find(|g| g.is_discrete) {
                discrete.id.clone()
            } else if let Some(first) = detected.first() {
                first.id.clone()
            } else {
                "0".to_string()
            }
        }
    };

    let mut cmd = Command::new(&exe_path);
    cmd.current_dir(&project_root);
    cmd.args([
        "-i", actual_input_path.to_str().unwrap_or(""),
        "-o", actual_output_path.to_str().unwrap_or(""),
        "-m", models_dir.to_str().unwrap_or("models"),
        "-n", "realesrgan-x4plus",
        "-s", &scale.to_string(),
        "-g", &chosen_gpu,
    ]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output_result = cmd
        .output()
        .map_err(|e| format!("Failed to launch Real-ESRGAN engine: {}", e))?;

    if !output_result.status.success() {
        let stderr = String::from_utf8_lossy(&output_result.stderr);
        let stdout = String::from_utf8_lossy(&output_result.stdout);
        return Err(format!(
            "Engine error:\n{}\n{}",
            stderr.trim(),
            stdout.trim()
        ));
    }

    if !actual_output_path.exists() {
        return Err("Real-ESRGAN completed but output image was not created".to_string());
    }

    Ok(actual_output_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(path) = args.into_iter().find(|a| !a.starts_with("--")) {
        if Path::new(&path).exists() {
            if let Ok(mut lock) = CLI_IMAGE_PATH.lock() {
                *lock = Some(path);
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        apply_dark_titlebar_hwnd(hwnd.0);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            upscale_image,
            show_main_window,
            get_cli_image_payload,
            register_context_menu,
            unregister_context_menu,
            is_context_menu_registered,
            get_available_gpus
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
