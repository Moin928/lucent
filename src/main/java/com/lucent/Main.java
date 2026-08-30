package com.lucent;

import atlantafx.base.theme.PrimerDark;
import javafx.application.Application;
import javafx.concurrent.Task;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.nio.file.Path;

public class Main extends Application {

    private Path selectedInput;

    private Label selectedFileLabel;
    private Label statusLabel;
    private Button upscaleButton;
    private ComboBox<Integer> scaleBox;
    private ProgressIndicator progressIndicator;

    @Override
    public void start(Stage stage) {

        Application.setUserAgentStylesheet(
                new PrimerDark().getUserAgentStylesheet()
        );

        Label title = new Label("Lucent");
        title.getStyleClass().add("title-2");

        Label subtitle = new Label("Local image upscaler");
        subtitle.getStyleClass().add("text-subtitle");

        Button chooseButton = new Button("Choose Image");
        chooseButton.setOnAction(event -> chooseImage(stage));

        selectedFileLabel = new Label("No image selected.");
        selectedFileLabel.getStyleClass().add("text-muted");

        scaleBox = new ComboBox<>();
        scaleBox.getItems().addAll(2, 3, 4);
        scaleBox.setValue(4);

        Label scaleLabel = new Label("Scale");

        HBox scaleContainer = new HBox(
                10,
                scaleLabel,
                scaleBox
        );
        scaleContainer.setAlignment(Pos.CENTER);

        upscaleButton = new Button("Upscale");
        upscaleButton.getStyleClass().add("accent");
        upscaleButton.setDisable(true);
        upscaleButton.setOnAction(event -> upscale());

        progressIndicator = new ProgressIndicator();
        progressIndicator.setPrefSize(28, 28);
        progressIndicator.setVisible(false);

        statusLabel = new Label("Ready.");

        HBox statusContainer = new HBox(
                8,
                progressIndicator,
                statusLabel
        );
        statusContainer.setAlignment(Pos.CENTER);

        VBox root = new VBox(
                16,
                title,
                subtitle,
                chooseButton,
                selectedFileLabel,
                scaleContainer,
                upscaleButton,
                statusContainer
        );

        root.setAlignment(Pos.CENTER);
        root.setPadding(new Insets(40));

        Scene scene = new Scene(root, 700, 450);

        stage.setTitle("Lucent");
        stage.setScene(scene);
        stage.setMinWidth(600);
        stage.setMinHeight(400);
        stage.show();
    }

    private void chooseImage(Stage stage) {

        FileChooser chooser = new FileChooser();
        chooser.setTitle("Choose Image");

        chooser.getExtensionFilters().add(
                new FileChooser.ExtensionFilter(
                        "Image Files",
                        "*.png",
                        "*.jpg",
                        "*.jpeg",
                        "*.webp"
                )
        );

        var file = chooser.showOpenDialog(stage);

        if (file == null) {
            return;
        }

        selectedInput = file.toPath();

        selectedFileLabel.setText(
                "Selected: " + file.getName()
        );

        upscaleButton.setDisable(false);
        statusLabel.setText("Ready.");
    }

    private void upscale() {

        if (selectedInput == null) {
            return;
        }

        int scale = scaleBox.getValue();
        Path output = buildOutputPath(selectedInput, scale);

        upscaleButton.setDisable(true);
        progressIndicator.setVisible(true);
        statusLabel.setText("Upscaling...");

        Task<Void> task = new Task<>() {

            @Override
            protected Void call() throws Exception {

                ProcessRunner processRunner = new ProcessRunner();
                Upscaler upscaler = new Upscaler(processRunner);

                upscaler.upscale(
                        selectedInput,
                        output,
                        scale
                );

                return null;
            }
        };

        task.setOnSucceeded(event -> {
            progressIndicator.setVisible(false);
            statusLabel.setText(
                    "Done: " + output.toAbsolutePath()
            );
            upscaleButton.setDisable(false);
        });

        task.setOnFailed(event -> {
            progressIndicator.setVisible(false);

            Throwable error = task.getException();

            statusLabel.setText(
                    "Failed: " + error.getMessage()
            );

            upscaleButton.setDisable(false);
        });

        Thread thread = new Thread(task, "lucent-upscaler");
        thread.setDaemon(true);
        thread.start();
    }

    private Path buildOutputPath(Path input, int scale) {

        String filename = input.getFileName().toString();

        int dot = filename.lastIndexOf('.');

        String baseName = dot > 0
                ? filename.substring(0, dot)
                : filename;

        return Path.of(
                "output",
                baseName + "_" + scale + "x.png"
        );
    }

    public static void main(String[] args) {
        launch(args);
    }
}