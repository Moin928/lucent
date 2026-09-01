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

        // 1. Universal image filter on * with AppliesTo (Appears instantly on Windows 10 & 11)
        let star_reg_key = r"HKCU\Software\Classes\*\shell\LucentUpscale";
        let star_cmd_key = format!(r"{}\command", star_reg_key);
        let _ = Command::new("reg")
            .args(["add", star_reg_key, "/ve", "/t", "REG_SZ", "/d", "Upscale with Lucent", "/f"])
            .output();
        let _ = Command::new("reg")
            .args(["add", star_reg_key, "/v", "Icon", "/t", "REG_SZ", "/d", &format!("\"{}\",0", exe_str), "/f"])
            .output();
        let _ = Command::new("reg")
            .args(["add", star_reg_key, "/v", "AppliesTo", "/t", "REG_SZ", "/d", "System.FileExtension:=.png OR System.FileExtension:=.jpg OR System.FileExtension:=.jpeg OR System.FileExtension:=.webp", "/f"])
            .output();
        let _ = Command::new("reg")
            .args(["add", &star_cmd_key, "/ve", "/t", "REG_SZ", "/d", &format!("\"{}\" \"%1\"", exe_str), "/f"])
            .output();

        // 2. SystemFileAssociations for standard image classes
        let extensions = [
            "image",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
        ];

        for target in &extensions {
            let reg_key = format!(r"HKCU\Software\Classes\SystemFileAssociations\{}\shell\LucentUpscale", target);
            let cmd_key = format!(r"{}\command", reg_key);

            let _ = Command::new("reg")
                .args(["add", &reg_key, "/ve", "/t", "REG_SZ", "/d", "Upscale with Lucent", "/f"])
                .output();

            let _ = Command::new("reg")
                .args(["add", &reg_key, "/v", "Icon", "/t", "REG_SZ", "/d", &format!("\"{}\",0", exe_str), "/f"])
                .output();

            let _ = Command::new("reg")
                .args(["add", &cmd_key, "/ve", "/t", "REG_SZ", "/d", &format!("\"{}\" \"%1\"", exe_str), "/f"])
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
        let _ = Command::new("reg")
            .args(["delete", r"HKCU\Software\Classes\*\shell\LucentUpscale", "/f"])
            .output();

        let extensions = [
            "image",
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
        ];

        for target in &extensions {
            let reg_key = format!(r"HKCU\Software\Classes\SystemFileAssociations\{}\shell\LucentUpscale", target);
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
        let reg_key = r"HKCU\Software\Classes\*\shell\LucentUpscale";
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

/// Detects dedicated & integrated Vulkan hardware GPUs (AMD Radeon, NVIDIA, Intel Arc, etc.)
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
        // Pass dummy arguments with -v so Real-ESRGAN enumerates Vulkan physical devices
        cmd.args(["-i", "__enum_test__.png", "-o", "__enum_test_out__.png", "-v"]);
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
                                let norm = name.to_lowercase()
                                    .replace("(r)", "")
                                    .replace("(tm)", "")
                                    .replace("  ", " ");

                                // Filter out software emulation / Direct3D wrapper layers
                                let is_software_wrapper = norm.contains("direct3d12")
                                    || norm.contains("basic render")
                                    || norm.contains("software")
                                    || norm.contains("llvmpipe")
                                    || norm.contains("warp");

                                if !is_software_wrapper && seen_ids.insert(id_str.to_string()) {
                                    let is_nvidia = norm.contains("nvidia")
                                        || norm.contains("geforce")
                                        || norm.contains("rtx")
                                        || norm.contains("gtx")
                                        || norm.contains("quadro")
                                        || norm.contains("tesla");

                                    let is_amd = norm.contains("amd")
                                        || norm.contains("radeon")
                                        || norm.contains("ati")
                                        || norm.contains("firepro");

                                    let is_intel_arc = norm.contains("arc")
                                        || norm.contains("iris xe max");

                                    // Dedicated / Discrete GPU check
                                    let is_discrete = is_nvidia
                                        || is_intel_arc
                                        || (is_amd && (
                                            norm.contains("rx")
                                                || norm.contains("pro")
                                                || norm.contains("xt")
                                                || norm.contains("vega")
                                                || norm.contains("r9")
                                                || norm.contains("r7")
                                                || norm.contains("r5")
                                                || norm.contains("hd ")
                                                || norm.contains("series")
                                                || norm.contains("discrete")
                                                || !norm.contains("graphics")
                                        ));

                                    // Include NVIDIA, AMD Radeon, Intel Arc, and any hardware GPU
                                    if is_nvidia || is_amd || is_intel_arc || is_discrete || norm.contains("intel") {
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
    }

    // Sort so discrete/dedicated GPUs come first
    gpus.sort_by(|a, b| b.is_discrete.cmp(&a.is_discrete));

    gpus
}

/// Enforces dedicated GPU execution for neural upscaling
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

    // Ensure at least one hardware GPU is detected
    let detected_gpus = get_available_gpus();
    if detected_gpus.is_empty() {
        return Err("No compatible NVIDIA or AMD Radeon GPU detected. Lucent requires a Vulkan-capable graphics card.".to_string());
    }

    // Select the requested GPU ID, or the first available GPU (preferred discrete)
    let target_gpu_id = match gpu_id.as_deref() {
        Some(id) if id != "auto" && detected_gpus.iter().any(|g| g.id == id) => id.to_string(),
        _ => detected_gpus[0].id.clone(),
    };

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

    let mut cmd = Command::new(&exe_path);
    cmd.current_dir(&project_root);
    cmd.args([
        "-i", actual_input_path.to_str().unwrap_or(""),
        "-o", actual_output_path.to_str().unwrap_or(""),
        "-m", models_dir.to_str().unwrap_or("models"),
        "-n", "realesrgan-x4plus",
        "-s", &scale.to_string(),
        "-g", &target_gpu_id,
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

    // Read the output and base64-encode so the frontend can use a data URL directly
    // (bypasses WebView2 sandbox — no asset protocol configuration needed)
    let output_bytes = fs::read(&actual_output_path)
        .map_err(|e| format!("Failed to read output image: {}", e))?;

    let b64: String = {
        const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::with_capacity((output_bytes.len() * 4 / 3) + 4);
        let mut i = 0;
        let len = output_bytes.len();
        while i + 2 < len {
            let a = output_bytes[i] as usize;
            let b = output_bytes[i + 1] as usize;
            let c = output_bytes[i + 2] as usize;
            out.push(TABLE[(a >> 2) & 63] as char);
            out.push(TABLE[((a << 4) | (b >> 4)) & 63] as char);
            out.push(TABLE[((b << 2) | (c >> 6)) & 63] as char);
            out.push(TABLE[c & 63] as char);
            i += 3;
        }
        let rem = len - i;
        if rem == 1 {
            let a = output_bytes[i] as usize;
            out.push(TABLE[(a >> 2) & 63] as char);
            out.push(TABLE[(a << 4) & 63] as char);
            out.push_str("==");
        } else if rem == 2 {
            let a = output_bytes[i] as usize;
            let b = output_bytes[i + 1] as usize;
            out.push(TABLE[(a >> 2) & 63] as char);
            out.push(TABLE[((a << 4) | (b >> 4)) & 63] as char);
            out.push(TABLE[(b << 2) & 63] as char);
            out.push('=');
        }
        out
    };

    // Return "path|base64" so frontend gets both the save path and the image data
    Ok(format!(
        "{}|{}",
        actual_output_path.to_string_lossy(),
        b64
    ))
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
                // Automatically ensure Explorer right-click context menu is registered on startup
                let _ = register_context_menu();
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
