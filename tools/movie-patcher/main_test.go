package main

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

func TestValidateRelative(t *testing.T) {
	for _, path := range []string{"IC/mv010.pak", "ass/mv010.ass", "mv240.pak"} {
		if err := validateRelative(path); err != nil {
			t.Fatalf("valid path %q rejected: %v", path, err)
		}
	}
	for _, path := range []string{"", "../mv010.pak", "/tmp/mv010.pak"} {
		if err := validateRelative(path); err == nil {
			t.Fatalf("unsafe path %q accepted", path)
		}
	}
}

func TestExtractFFmpegSelectsOnlyPinnedMembers(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "tools.zip")
	file, err := os.Create(archive)
	if err != nil {
		t.Fatal(err)
	}
	writer := zip.NewWriter(file)
	for name, body := range map[string]string{
		"ffmpeg-test/bin/ffmpeg.exe":  "binary",
		"ffmpeg-test/bin/ffprobe.exe": "not extracted",
		"ffmpeg-test/LICENSE":         "license",
		"ffmpeg-test/README.txt":      "readme",
	} {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := entry.Write([]byte(body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	tools := filepath.Join(dir, "tools")
	if err := os.MkdirAll(tools, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := extractFFmpeg(archive, tools); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"ffmpeg.exe", "FFmpeg-GPLv3-LICENSE.txt", "FFmpeg-build-README.txt"} {
		if _, err := os.Stat(filepath.Join(tools, name)); err != nil {
			t.Fatalf("missing extracted file %s: %v", name, err)
		}
	}
	if _, err := os.Stat(filepath.Join(tools, "ffprobe.exe")); !os.IsNotExist(err) {
		t.Fatal("unexpected ffprobe extraction")
	}
}
