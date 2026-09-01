# Lucent

A local image upscaler for Windows built with Tauri, React, and Real ESRGAN.

Lucent runs neural super resolution on your own GPU without sending pictures to any remote server or subscription service. It accelerates the entire pipeline with Vulkan on your NVIDIA, AMD Radeon, or Intel GPU, from UI hardware compositing to neural upscaling.

## Download

Get the latest installer from the [Releases](https://github.com/Moin928/lucent/releases/latest) page.

Current version: **v1.0.2**

## Requirements

* Windows 10 or 11 (64 bit)
* A Vulkan capable GPU (NVIDIA RTX/GTX, AMD Radeon RX/Pro/all series, Intel Arc)

## Highlights

* Runs entirely on device with zero internet access required
* Full Vulkan hardware acceleration on NVIDIA, AMD Radeon, and Intel Arc GPUs
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

The compiled installer will be at `src-tauri/target/release/bundle/nsis/Lucent_1.0.2_x64-setup.exe`.

## Author

Copyright 2026 Qureshi Mohammed Moin. All rights reserved.
