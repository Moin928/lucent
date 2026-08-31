# Lucent

A local image upscaler for Windows built with Tauri, React, and Real ESRGAN.

Lucent runs neural super resolution on your own GPU without sending pictures to any remote server or subscription service.

## Highlights

* Runs entirely on device with zero internet access required
* Direct Vulkan hardware acceleration on discrete and integrated graphics
* Windows File Explorer integration for one click upscaling
* Interactive before and after comparison slider
* Support for PNG, JPG, JPEG, and WebP formats
* Up to 4x scaling multiplier

## Tech Stack

* Frontend: React, TypeScript, Vite
* Desktop Shell: Tauri v2 in Rust
* Neural Engine: Real ESRGAN NCNN Vulkan

## Building from Source

Prerequisites:
* Node.js 18 or newer
* Rust 1.77 or newer
* Windows with a Vulkan capable GPU

Install dependencies and start development server:

```powershell
npm install
npm run tauri dev
```

Build production installer:

```powershell
npm run tauri build
```

The compiled installer will be in `src-tauri/target/release/bundle/nsis/`.

## Author

Copyright 2026 Qureshi Mohammed Moin. All rights reserved.
