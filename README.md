# Lucent

A local image upscaler for Windows built with Tauri, React, and Real ESRGAN.

Lucent runs neural super resolution on your own GPU without sending pictures to any remote server or subscription service. It requires a dedicated NVIDIA or AMD GPU and runs the entire pipeline on it, from the UI compositing to the actual upscaling.

## Download

Get the latest installer from the [Releases](https://github.com/Moin928/lucent/releases/latest) page.

Current version: **v1.0.1**

## Requirements

* Windows 10 or 11 (64 bit)
* A dedicated NVIDIA or AMD GPU with Vulkan support
* Integrated graphics only systems are not supported

## Highlights

* Runs entirely on device with zero internet access required
* Locked to the dedicated GPU for both UI rendering and neural inference
* Real ESRGAN x4plus model via NCNN Vulkan for high quality upscaling
* Windows File Explorer right click integration for one click upscaling
* Interactive before and after comparison slider
* Supports PNG, JPG, JPEG, and WebP
* 2x, 3x, and 4x scale options

## Tech Stack

* Frontend: React, TypeScript, Vite
* Desktop Shell: Tauri v2 in Rust
* Neural Engine: Real ESRGAN NCNN Vulkan

## Building from Source

Prerequisites:

* Node.js 18 or newer
* Rust 1.77 or newer
* Windows with a dedicated NVIDIA or AMD GPU

Install dependencies and start development server:

```powershell
npm install
npm run tauri dev
```

Build production installer:

```powershell
npm run tauri build
```

The compiled installer will be at `src-tauri/target/release/bundle/nsis/Lucent_1.0.1_x64-setup.exe`.

## Author

Copyright 2026 Qureshi Mohammed Moin. All rights reserved.
