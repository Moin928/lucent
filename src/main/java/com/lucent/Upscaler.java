package com.lucent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class Upscaler {

    private static final String GPU_ID = "2";
    private static final Path EXECUTABLE = Path.of(
            "bin",
            "realesrgan-ncnn-vulkan-v0.2.0-windows",
            "realesrgan-ncnn-vulkan.exe"
    );

    private static final Path MODEL_DIRECTORY = Path.of("models");

    private final ProcessRunner processRunner;

    public Upscaler(ProcessRunner processRunner) {
        this.processRunner = processRunner;
    }

    public void upscale(Path input, Path output, int scale)
            throws IOException, InterruptedException {

        validate(input, scale);

        Path parent = output.toAbsolutePath().getParent();

        if (parent != null) {
            Files.createDirectories(parent);
        }

        List<String> command = List.of(
                EXECUTABLE.toString(),
                "-i", input.toString(),
                "-o", output.toString(),
                "-m", MODEL_DIRECTORY.toString(),
                "-n", "realesrgan-x4plus",
                "-s", String.valueOf(scale),
                "-g", GPU_ID
        );

        int exitCode = processRunner.run(command);

        if (exitCode != 0) {
            throw new IOException(
                    "Real-ESRGAN failed with exit code: " + exitCode
            );
        }

        if (!Files.exists(output)) {
            throw new IOException(
                    "Real-ESRGAN completed but no output image was created."
            );
        }
    }

    private void validate(Path input, int scale) {

        if (!Files.exists(input)) {
            throw new IllegalArgumentException(
                    "Input image does not exist: " + input
            );
        }

        if (!Files.isRegularFile(input)) {
            throw new IllegalArgumentException(
                    "Input path is not a file: " + input
            );
        }

        if (scale != 2 && scale != 3 && scale != 4) {
            throw new IllegalArgumentException(
                    "Scale must be 2, 3, or 4."
            );
        }

        if (!Files.exists(EXECUTABLE)) {
            throw new IllegalStateException(
                    "Real-ESRGAN executable not found: " + EXECUTABLE
            );
        }

        if (!Files.exists(MODEL_DIRECTORY)) {
            throw new IllegalStateException(
                    "Model directory not found: " + MODEL_DIRECTORY
            );
        }
    }
}