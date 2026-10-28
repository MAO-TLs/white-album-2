package main

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
)

func streamHashes(ffmpeg, path string) ([]byte, error) {
	cmd := exec.Command(ffmpeg, "-v", "error", "-i", path, "-map", "0", "-c", "copy", "-f", "streamhash", "-hash", "sha256", "-")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("verify media payloads: %w: %s", err, stderr.String())
	}
	if len(bytes.TrimSpace(out)) == 0 {
		return nil, errors.New("empty media verification")
	}
	return out, nil
}

func repairMovies(opts options, ffmpeg string, plans []assetPlan, log logger) error {
	var pending []assetPlan
	for _, p := range plans {
		if p.State != stateCurrent {
			return fmt.Errorf("%s: install the current translated movie before packet repair", p.Asset.AssetID)
		}
		required, current, err := audioPacketSize(p.TargetPath)
		if err != nil {
			return err
		}
		if current < required {
			pending = append(pending, p)
		}
	}
	if len(pending) == 0 {
		log.printf("All selected movies already have safe audio packet sizes.\n")
		return nil
	}
	log.printf("%d movies need lossless packet repair. Existing files will be backed up; Japanese backups are untouched.\n", len(pending))
	if !opts.yes {
		ok, err := confirm("Continue? [y/N] ")
		if err != nil {
			return err
		}
		if !ok {
			return nil
		}
	}
	for _, p := range pending {
		if err := repairMovie(ffmpeg, p, log); err != nil {
			return err
		}
	}
	return nil
}

func repairMovie(ffmpeg string, plan assetPlan, log logger) error {
	required, current, err := audioPacketSize(plan.TargetPath)
	if err != nil {
		return err
	}
	if current >= required {
		return nil
	}
	// Fail closed until this exact output has been generated and approved for
	// the release manifest. Unit/integration tests use development builds.
	if buildVersion != "development" && plan.Asset.PacketFixedSHA256 == "" {
		return errors.New("manifest lacks approved packet-repair hash")
	}
	temp := plan.TargetPath + ".mao-packet-repair.tmp"
	if _, err := os.Lstat(temp); !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("repair temporary path already exists: %s", temp)
	}
	defer os.Remove(temp)
	before, err := streamHashes(ffmpeg, plan.TargetPath)
	if err != nil {
		return err
	}
	cmd := exec.Command(ffmpeg, "-n", "-v", "error", "-i", plan.TargetPath, "-map", "0", "-c", "copy", "-f", "asf", "-packet_size", strconv.Itoa(required), temp)
	cmd.Stdout, cmd.Stderr = log.w, log.w
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("remux: %w", err)
	}
	_, actual, err := audioPacketSize(temp)
	if err != nil {
		return err
	}
	if actual != required {
		return fmt.Errorf("packet size is %d, expected %d", actual, required)
	}
	after, err := streamHashes(ffmpeg, temp)
	if err != nil {
		return err
	}
	if !bytes.Equal(before, after) {
		return errors.New("remux changed encoded media payloads")
	}
	hash, err := sha256File(temp)
	if err != nil {
		return err
	}
	if plan.Asset.PacketFixedSHA256 != "" && hash != plan.Asset.PacketFixedSHA256 {
		return fmt.Errorf("repaired output hash mismatch: %s", hash)
	}
	backup := plan.TargetPath + ".before-packet-repair"
	if _, err := os.Lstat(backup); !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("will not overwrite existing repair backup: %s", backup)
	}
	if err := os.Rename(plan.TargetPath, backup); err != nil {
		return err
	}
	if err := os.Rename(temp, plan.TargetPath); err != nil {
		if restoreErr := os.Rename(backup, plan.TargetPath); restoreErr != nil {
			return fmt.Errorf("install failed: %v; rollback failed: %v; original is at %s", err, restoreErr, backup)
		}
		return err
	}
	log.printf("%s: %d -> %d byte packets; unchanged media; SHA-256 %s; backup %s\n", plan.Asset.AssetID, current, required, hash, filepath.Base(backup))
	return nil
}
