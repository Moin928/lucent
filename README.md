# Resolve

A lightweight local image upscaler built for personal use.

Resolve uses pretrained super resolution models to increase image resolution while preserving and reconstructing fine details. Everything runs locally, so your images stay on your machine.

## Features

• Local image upscaling
• Real ESRGAN based super resolution
• GPU accelerated inference through Vulkan
• 2x and 4x upscaling
• Supports common image formats
• No cloud processing
• Simple desktop interface

## How it works

Resolve handles the image processing locally and passes the image to a pretrained super resolution model for inference.

```text
Input image
    ↓
Resolve
    ↓
Real ESRGAN
    ↓
GPU inference
    ↓
Upscaled image
```

## Requirements

• Java 17 or newer
• A Vulkan capable GPU
• Real ESRGAN NCNN Vulkan
• Windows currently supported

## Getting started

Clone the repository:

```bash
git clone https://github.com/yourusername/resolve.git
cd resolve
```

Place the Real ESRGAN executable and required model files in the expected directories.

Build the application:

```bash
./gradlew build
```

Run it with:

```bash
./gradlew run
```

## Output

An input such as:

```text
photo.jpg
```

can be processed into:

```text
photo_4x.png
```

The original file is left untouched.

## Models

Resolve currently uses Real ESRGAN models for image super resolution.

The default model is:

```text
Real ESRGAN x4plus
```

Additional models can be added later for different types of images.

## Project structure

```text
resolve/
├── bin/
├── models/
├── src/
│   └── main/
│       └── java/
├── build.gradle
├── settings.gradle
└── README.md
```

## Why this exists

This is a personal utility rather than a commercial application. The goal is to have a simple way to upscale images locally without sending them to an online service.

## License

Add your preferred license here.
