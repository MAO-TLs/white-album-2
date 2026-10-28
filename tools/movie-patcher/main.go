package main

import (
	"archive/zip"
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

var buildVersion = "development"
var manifestSHA256 = "development"

type Manifest struct {
	Schema  string       `json:"schema"`
	Release string       `json:"release"`
	FFmpeg  FFmpegSource `json:"ffmpeg"`
	Assets  []MovieAsset `json:"assets"`
}

type FFmpegSource struct {
	Version          string `json:"version"`
	URL              string `json:"url"`
	ArchiveSHA256    string `json:"archive_sha256"`
	ArchiveSizeBytes int64  `json:"archive_size_bytes"`
	VersionMarker    string `json:"version_marker"`
}

type MovieAsset struct {
	AssetID                 string   `json:"asset_id"`
	FilmID                  string   `json:"film_id"`
	Quality                 string   `json:"quality"`
	RelativeInstallPath     string   `json:"relative_install_path"`
	ASSPath                 string   `json:"ass_path"`
	SourceSHA256            string   `json:"source_sha256"`
	AcceptedOutputSHA256    []string `json:"accepted_output_sha256,omitempty"`
	ExpectedOutputSHA256    string   `json:"expected_output_sha256"`
	PacketFixedSHA256       string   `json:"packet_fixed_sha256,omitempty"`
	ExpectedOutputSizeBytes int64    `json:"expected_output_size_bytes"`
	Width                   int      `json:"width"`
	Height                  int      `json:"height"`
	DurationSeconds         float64  `json:"duration_seconds"`
	VideoBitrate            string   `json:"video_bitrate"`
}

type options struct {
	gameDir       string
	assetsDir     string
	quality       string
	restore       bool
	repairPackets bool
	verifyOnly    bool
	yes           bool
	allowUnsigned bool
}

type assetState int

const (
	stateUnknown assetState = iota
	stateOriginal
	stateCurrent
	statePrevious
	stateRecoverable
)

type assetPlan struct {
	Asset      MovieAsset
	TargetPath string
	BackupPath string
	State      assetState
	Hash       string
}

type logger struct {
	w io.Writer
}

func (l logger) printf(format string, args ...any) {
	fmt.Fprintf(l.w, format, args...)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "\nERROR: %v\n", err)
		fmt.Fprintln(os.Stderr, "No unverified movie was installed. See the log for details.")
		os.Exit(1)
	}
}

func run() error {
	var opts options
	flag.StringVar(&opts.gameDir, "game-dir", "", "WHITE ALBUM 2 game directory")
	flag.StringVar(&opts.assetsDir, "assets-dir", "", "patcher assets directory")
	flag.StringVar(&opts.quality, "quality", "both", "movies to patch: high, low, or both")
	flag.BoolVar(&opts.restore, "restore", false, "restore original Japanese movies from backup")
	flag.BoolVar(&opts.repairPackets, "repair-packets", false, "losslessly repair already-translated movie packet sizes")
	flag.BoolVar(&opts.verifyOnly, "verify-only", false, "inspect movie state without changing files")
	flag.BoolVar(&opts.yes, "yes", false, "skip the confirmation prompt")
	flag.BoolVar(&opts.allowUnsigned, "allow-unverified-output", false, "development only: accept outputs absent from the manifest")
	flag.Parse()

	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("locate patcher executable: %w", err)
	}
	exeDir := filepath.Dir(exe)
	if opts.assetsDir == "" {
		opts.assetsDir = filepath.Join(exeDir, "assets")
	}
	if opts.gameDir == "" {
		opts.gameDir = filepath.Dir(exeDir)
	}
	opts.assetsDir, err = filepath.Abs(opts.assetsDir)
	if err != nil {
		return err
	}
	opts.gameDir, err = filepath.Abs(opts.gameDir)
	if err != nil {
		return err
	}
	if opts.quality != "high" && opts.quality != "low" && opts.quality != "both" {
		return fmt.Errorf("invalid --quality %q (use high, low, or both)", opts.quality)
	}
	if opts.restore && opts.repairPackets {
		return errors.New("--restore and --repair-packets are mutually exclusive")
	}

	logFile, err := os.OpenFile(filepath.Join(exeDir, "movie-patcher-v1.2.5.log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return fmt.Errorf("open log: %w", err)
	}
	defer logFile.Close()
	log := logger{w: io.MultiWriter(os.Stdout, logFile)}
	log.printf("MAO Translations WHITE ALBUM 2 Movie Patcher %s\n", buildVersion)
	log.printf("Game directory: %s\n", opts.gameDir)
	log.printf("Assets directory: %s\n\n", opts.assetsDir)

	manifest, err := loadManifest(filepath.Join(opts.assetsDir, "manifest.json"))
	if err != nil {
		return err
	}
	if manifest.Release != "v1.2.5" {
		return fmt.Errorf("assets are for %s, not v1.2.5", manifest.Release)
	}
	if _, err := os.Stat(filepath.Join(opts.gameDir, "WA2.exe")); err != nil {
		return fmt.Errorf("WA2.exe was not found in %s; copy the Movie Patcher folder into the main game directory", opts.gameDir)
	}

	lockPath := filepath.Join(exeDir, ".movie-patcher.lock")
	lock, err := os.OpenFile(lockPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			return errors.New("another movie patcher appears to be running; remove .movie-patcher.lock only if no patcher is active")
		}
		return err
	}
	lock.Close()
	defer os.Remove(lockPath)

	plans, err := preflight(opts, manifest, log)
	if err != nil {
		return err
	}
	if opts.verifyOnly {
		log.printf("\nVerification complete. No files were changed.\n")
		return nil
	}
	if opts.restore {
		return restoreMovies(opts, plans, log)
	}
	if opts.repairPackets {
		ffmpeg, err := ensureFFmpeg(exeDir, manifest.FFmpeg, log)
		if err != nil {
			return err
		}
		return repairMovies(opts, ffmpeg, plans, log)
	}

	var pending []assetPlan
	for _, plan := range plans {
		if plan.State == stateOriginal || plan.State == stateRecoverable {
			pending = append(pending, plan)
		}
	}
	if len(pending) == 0 {
		ffmpeg, err := ensureFFmpeg(exeDir, manifest.FFmpeg, log)
		if err != nil {
			return err
		}
		return repairMovies(opts, ffmpeg, plans, log)
	}

	log.printf("\n%d movie files will be rendered locally.\n", len(pending))
	log.printf("The first run downloads a verified %.0f MB FFmpeg tool.\n", float64(manifest.FFmpeg.ArchiveSizeBytes)/(1024*1024))
	log.printf("Original movies are moved to MAO Movie Backups only after each new file passes verification.\n")
	if !opts.yes {
		ok, err := confirm("Continue? [y/N] ")
		if err != nil {
			return err
		}
		if !ok {
			log.printf("Cancelled. No files were changed.\n")
			return nil
		}
	}

	ffmpeg, err := ensureFFmpeg(exeDir, manifest.FFmpeg, log)
	if err != nil {
		return err
	}

	start := time.Now()
	for i, plan := range pending {
		log.printf("\n[%d/%d] Rendering %s (%s)...\n", i+1, len(pending), plan.Asset.RelativeInstallPath, plan.Asset.Quality)
		if err := renderAndInstall(opts, ffmpeg, plan, log); err != nil {
			return fmt.Errorf("%s: %w", plan.Asset.AssetID, err)
		}
	}
	log.printf("\nPatched %d movie files successfully in %s.\n", len(pending), time.Since(start).Round(time.Second))
	log.printf("Originals are in: %s\n", filepath.Join(opts.gameDir, "MAO Movie Backups", "original"))
	// A mixed installation can contain old translated files alongside newly
	// rendered ones. Repair those too instead of only fixing this run's renders.
	updated, err := preflight(opts, manifest, log)
	if err != nil {
		return err
	}
	opts.yes = true // The render/repair operation was already confirmed above.
	return repairMovies(opts, ffmpeg, updated, log)
}

func loadManifest(path string) (Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Manifest{}, fmt.Errorf("read manifest: %w", err)
	}
	actualManifestHash := fmt.Sprintf("%x", sha256.Sum256(data))
	if manifestSHA256 != "development" && actualManifestHash != manifestSHA256 {
		return Manifest{}, fmt.Errorf("movie manifest failed SHA-256 verification (got %s)", actualManifestHash)
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return Manifest{}, fmt.Errorf("parse manifest: %w", err)
	}
	if manifest.Schema != "wa2-movie-patcher/1" || len(manifest.Assets) != 30 {
		return Manifest{}, errors.New("movie manifest is incomplete or unsupported")
	}
	if buildVersion != "development" {
		for _, asset := range manifest.Assets {
			if len(asset.PacketFixedSHA256) != 64 {
				return Manifest{}, fmt.Errorf("missing approved packet-repair hash for %s", asset.AssetID)
			}
		}
	}
	return manifest, nil
}

func preflight(opts options, manifest Manifest, log logger) ([]assetPlan, error) {
	assets := append([]MovieAsset(nil), manifest.Assets...)
	sort.Slice(assets, func(i, j int) bool { return assets[i].AssetID < assets[j].AssetID })
	var plans []assetPlan
	counts := map[assetState]int{}
	for _, asset := range assets {
		if opts.quality != "both" && asset.Quality != opts.quality {
			continue
		}
		if err := validateRelative(asset.RelativeInstallPath); err != nil {
			return nil, fmt.Errorf("invalid movie path for %s: %w", asset.AssetID, err)
		}
		if err := validateRelative(asset.ASSPath); err != nil {
			return nil, fmt.Errorf("invalid ASS path for %s: %w", asset.AssetID, err)
		}
		if _, err := os.Stat(filepath.Join(opts.assetsDir, filepath.FromSlash(asset.ASSPath))); err != nil {
			return nil, fmt.Errorf("missing subtitle asset %s", asset.ASSPath)
		}
		target := filepath.Join(opts.gameDir, filepath.FromSlash(asset.RelativeInstallPath))
		backup := filepath.Join(opts.gameDir, "MAO Movie Backups", "original", filepath.FromSlash(asset.RelativeInstallPath))
		plan := assetPlan{Asset: asset, TargetPath: target, BackupPath: backup}
		targetHash, targetErr := sha256File(target)
		backupHash, backupErr := sha256File(backup)
		switch {
		case targetErr == nil && targetHash == asset.SourceSHA256:
			plan.State, plan.Hash = stateOriginal, targetHash
		case targetErr == nil && asset.ExpectedOutputSHA256 != "" && targetHash == asset.ExpectedOutputSHA256:
			plan.State, plan.Hash = stateCurrent, targetHash
		case targetErr == nil && asset.PacketFixedSHA256 != "" && targetHash == asset.PacketFixedSHA256:
			plan.State, plan.Hash = stateCurrent, targetHash
		case targetErr == nil && contains(asset.AcceptedOutputSHA256, targetHash):
			plan.State, plan.Hash = statePrevious, targetHash
		case backupErr == nil && backupHash == asset.SourceSHA256 && (errors.Is(targetErr, os.ErrNotExist) || opts.restore):
			plan.State, plan.Hash = stateRecoverable, backupHash
		default:
			if targetErr != nil && !errors.Is(targetErr, os.ErrNotExist) {
				return nil, targetErr
			}
			plan.State, plan.Hash = stateUnknown, targetHash
		}
		counts[plan.State]++
		plans = append(plans, plan)
	}
	log.printf("Preflight: %d original, %d current, %d earlier translated, %d recoverable, %d unknown.\n",
		counts[stateOriginal], counts[stateCurrent], counts[statePrevious], counts[stateRecoverable], counts[stateUnknown])
	if counts[stateUnknown] > 0 {
		for _, plan := range plans {
			if plan.State == stateUnknown {
				log.printf("  UNKNOWN: %s (%s)\n", plan.Asset.RelativeInstallPath, plan.Hash)
			}
		}
		return nil, errors.New("one or more movie files do not match the supported Japanese originals or MAO releases; restore clean Extended Edition movies before patching")
	}
	return plans, nil
}

func renderAndInstall(opts options, ffmpeg string, plan assetPlan, log logger) error {
	input := plan.TargetPath
	if plan.State == stateRecoverable {
		input = plan.BackupPath
	}
	temp := plan.TargetPath + ".mao-v1.2.5.tmp"
	if err := os.MkdirAll(filepath.Dir(plan.TargetPath), 0o755); err != nil {
		return err
	}
	os.Remove(temp)
	filter := fmt.Sprintf("ass=%s:fontsdir=fonts,fps=30000/1001", filepath.ToSlash(plan.Asset.ASSPath))
	args := []string{
		"-y", "-hide_banner", "-loglevel", "error", "-stats",
		"-i", input,
		"-vf", filter,
		"-map", "0:v:0", "-map", "0:a:0",
		"-c:v", "wmv2", "-b:v", plan.Asset.VideoBitrate, "-pix_fmt", "yuv420p",
		"-c:a", "copy", "-f", "asf", temp,
	}
	cmd := exec.Command(ffmpeg, args...)
	cmd.Dir = opts.assetsDir
	cmd.Stdout = log.w
	cmd.Stderr = log.w
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("FFmpeg failed: %w", err)
	}
	outputHash, err := sha256File(temp)
	if err != nil {
		return err
	}
	if plan.Asset.ExpectedOutputSHA256 == "" && !opts.allowUnsigned {
		return errors.New("manifest has no approved output hash")
	}
	if plan.Asset.ExpectedOutputSHA256 != "" && outputHash != plan.Asset.ExpectedOutputSHA256 {
		return fmt.Errorf("rendered output failed SHA-256 verification (got %s)", outputHash)
	}
	if plan.Asset.ExpectedOutputSizeBytes > 0 {
		info, err := os.Stat(temp)
		if err != nil {
			return err
		}
		if info.Size() != plan.Asset.ExpectedOutputSizeBytes {
			return fmt.Errorf("rendered output size differs: got %d, expected %d", info.Size(), plan.Asset.ExpectedOutputSizeBytes)
		}
	}
	if plan.State == stateOriginal {
		if err := os.MkdirAll(filepath.Dir(plan.BackupPath), 0o755); err != nil {
			return err
		}
		if _, err := os.Stat(plan.BackupPath); errors.Is(err, os.ErrNotExist) {
			if err := os.Rename(plan.TargetPath, plan.BackupPath); err != nil {
				return fmt.Errorf("move original into backup: %w", err)
			}
		} else if err != nil {
			return err
		} else {
			backupHash, err := sha256File(plan.BackupPath)
			if err != nil || backupHash != plan.Asset.SourceSHA256 {
				return errors.New("existing backup is not the supported original")
			}
			if err := os.Remove(plan.TargetPath); err != nil {
				return err
			}
		}
	}
	if err := os.Rename(temp, plan.TargetPath); err != nil {
		if _, statErr := os.Stat(plan.TargetPath); errors.Is(statErr, os.ErrNotExist) {
			if _, backupErr := os.Stat(plan.BackupPath); backupErr == nil {
				_ = os.Rename(plan.BackupPath, plan.TargetPath)
			}
		}
		return fmt.Errorf("install verified output: %w", err)
	}
	log.printf("  verified %s\n", outputHash)
	// Keep the pinned render verification above. Then repair the container
	// losslessly; this avoids weakening verification or changing subtitle/audio encoding.
	return repairMovie(ffmpeg, plan, log)
}

func restoreMovies(opts options, plans []assetPlan, log logger) error {
	var restorable []assetPlan
	for _, plan := range plans {
		backupHash, err := sha256File(plan.BackupPath)
		if err == nil && backupHash == plan.Asset.SourceSHA256 {
			restorable = append(restorable, plan)
		}
	}
	if len(restorable) == 0 {
		return errors.New("no verified original-movie backups were found")
	}
	log.printf("%d original movie files can be restored.\n", len(restorable))
	if !opts.yes {
		ok, err := confirm("Restore them now? [y/N] ")
		if err != nil || !ok {
			return err
		}
	}
	translatedRoot := filepath.Join(opts.gameDir, "MAO Movie Backups", "translated-v1.2.5")
	for i, plan := range restorable {
		log.printf("[%d/%d] Restoring %s\n", i+1, len(restorable), plan.Asset.RelativeInstallPath)
		if _, err := os.Stat(plan.TargetPath); err == nil {
			translated := filepath.Join(translatedRoot, filepath.FromSlash(plan.Asset.RelativeInstallPath))
			if err := os.MkdirAll(filepath.Dir(translated), 0o755); err != nil {
				return err
			}
			os.Remove(translated)
			if err := os.Rename(plan.TargetPath, translated); err != nil {
				return err
			}
		}
		if err := os.MkdirAll(filepath.Dir(plan.TargetPath), 0o755); err != nil {
			return err
		}
		if err := os.Rename(plan.BackupPath, plan.TargetPath); err != nil {
			return err
		}
	}
	log.printf("Restoration complete. Translated movies were preserved in %s\n", translatedRoot)
	return nil
}

func ensureFFmpeg(exeDir string, source FFmpegSource, log logger) (string, error) {
	toolsDir := filepath.Join(exeDir, "tools")
	ffmpeg := filepath.Join(toolsDir, "ffmpeg.exe")
	if info, err := os.Stat(ffmpeg); err == nil && info.Size() > 0 {
		if err := checkFFmpeg(ffmpeg, source.VersionMarker); err == nil {
			return ffmpeg, nil
		}
	}
	if err := os.MkdirAll(toolsDir, 0o755); err != nil {
		return "", err
	}
	archive := filepath.Join(toolsDir, "ffmpeg-download.zip")
	partial := archive + ".part"
	log.printf("Downloading pinned FFmpeg %s from:\n%s\n", source.Version, source.URL)
	if err := download(source.URL, partial, source.ArchiveSizeBytes, log); err != nil {
		return "", err
	}
	hash, err := sha256File(partial)
	if err != nil {
		return "", err
	}
	if hash != source.ArchiveSHA256 {
		return "", fmt.Errorf("FFmpeg download failed SHA-256 verification (got %s)", hash)
	}
	if err := os.Rename(partial, archive); err != nil {
		return "", err
	}
	if err := extractFFmpeg(archive, toolsDir); err != nil {
		return "", err
	}
	if err := checkFFmpeg(ffmpeg, source.VersionMarker); err != nil {
		return "", err
	}
	os.Remove(archive)
	return ffmpeg, nil
}

func download(url, destination string, expected int64, log logger) error {
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	request.Header.Set("User-Agent", "MAO-WA2-Movie-Patcher/1.2.5")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("download FFmpeg: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("download FFmpeg: HTTP %s", response.Status)
	}
	file, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer file.Close()
	buffer := make([]byte, 1024*1024)
	var written int64
	lastReport := time.Now()
	for {
		n, readErr := response.Body.Read(buffer)
		if n > 0 {
			if _, err := file.Write(buffer[:n]); err != nil {
				return err
			}
			written += int64(n)
			if time.Since(lastReport) >= 2*time.Second {
				log.printf("  downloaded %.1f / %.1f MB\n", float64(written)/(1024*1024), float64(expected)/(1024*1024))
				lastReport = time.Now()
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}
	if expected > 0 && written != expected {
		return fmt.Errorf("FFmpeg download size differs: got %d, expected %d", written, expected)
	}
	return file.Sync()
}

func extractFFmpeg(archive, toolsDir string) error {
	reader, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer reader.Close()
	wanted := map[string]string{
		"/bin/ffmpeg.exe": "ffmpeg.exe",
		"/LICENSE":        "FFmpeg-GPLv3-LICENSE.txt",
		"/README.txt":     "FFmpeg-build-README.txt",
	}
	found := map[string]bool{}
	for _, entry := range reader.File {
		clean := filepath.ToSlash(entry.Name)
		for suffix, output := range wanted {
			if !strings.HasSuffix(clean, suffix) {
				continue
			}
			input, err := entry.Open()
			if err != nil {
				return err
			}
			destination := filepath.Join(toolsDir, output)
			file, err := os.OpenFile(destination, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
			if err != nil {
				input.Close()
				return err
			}
			_, copyErr := io.Copy(file, input)
			closeErr := file.Close()
			input.Close()
			if copyErr != nil {
				return copyErr
			}
			if closeErr != nil {
				return closeErr
			}
			found[suffix] = true
		}
	}
	for suffix := range wanted {
		if !found[suffix] {
			return fmt.Errorf("FFmpeg archive is missing %s", suffix)
		}
	}
	return nil
}

func checkFFmpeg(path, marker string) error {
	command := exec.Command(path, "-version")
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("run FFmpeg: %w", err)
	}
	if !strings.Contains(string(output), marker) {
		return fmt.Errorf("unexpected FFmpeg build: %s", strings.SplitN(string(output), "\n", 2)[0])
	}
	return nil
}

func validateRelative(path string) error {
	if path == "" || filepath.IsAbs(path) {
		return errors.New("path is empty or absolute")
	}
	clean := filepath.Clean(filepath.FromSlash(path))
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return errors.New("path escapes its root")
	}
	return nil
}

func sha256File(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func contains(values []string, candidate string) bool {
	for _, value := range values {
		if value == candidate {
			return true
		}
	}
	return false
}

func confirm(prompt string) (bool, error) {
	fmt.Print(prompt)
	reader := bufio.NewReader(os.Stdin)
	answer, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return false, err
	}
	answer = strings.ToLower(strings.TrimSpace(answer))
	return answer == "y" || answer == "yes", nil
}

func init() {
	// The public build is a Windows executable. Keeping this check in the
	// source prevents accidental publication of a host-native development
	// binary while still allowing unit tests on other platforms.
	if buildVersion != "development" && runtime.GOOS != "windows" {
		panic("release movie patcher must target Windows")
	}
}
