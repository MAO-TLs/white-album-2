package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func fixture(block int) []byte {
	f := make([]byte, 104)
	copy(f, asfFile)
	binary.LittleEndian.PutUint64(f[16:], 104)
	binary.LittleEndian.PutUint32(f[92:], 3200)
	binary.LittleEndian.PutUint32(f[96:], 3200)
	s := make([]byte, 96)
	copy(s, asfStream)
	copy(s[24:], asfAudio)
	binary.LittleEndian.PutUint64(s[16:], 96)
	binary.LittleEndian.PutUint32(s[64:], 18)
	binary.LittleEndian.PutUint16(s[90:], uint16(block))
	h := make([]byte, 30)
	copy(h, asfHeader)
	binary.LittleEndian.PutUint64(h[16:], uint64(len(h)+len(f)+len(s)))
	binary.LittleEndian.PutUint32(h[24:], 2)
	return append(append(h, f...), s...)
}

func TestPacketSizes(t *testing.T) {
	for _, c := range []struct{ block, want int }{{11889, 11917}, {1487, 3200}, {8192, 8220}} {
		got, old, err := readAudioPacketSize(bytes.NewReader(fixture(c.block)))
		if err != nil || got != c.want || old != 3200 {
			t.Fatalf("block %d: %d, %d, %v", c.block, got, old, err)
		}
	}
}

func TestRejectMalformedASF(t *testing.T) {
	data := fixture(11889)
	for _, b := range [][]byte{nil, []byte("not asf"), data[:29], data[:len(data)-1], fixture(0), fixture(65535)} {
		if _, _, err := readAudioPacketSize(bytes.NewReader(b)); err == nil {
			t.Fatal("accepted invalid ASF")
		}
	}
	for _, off := range []int{16, 30 + 16, 30 + 104 + 16} {
		b := append([]byte(nil), data...)
		binary.LittleEndian.PutUint64(b[off:], ^uint64(0))
		if _, _, err := readAudioPacketSize(bytes.NewReader(b)); err == nil {
			t.Fatal("accepted invalid size")
		}
	}
}

// Opt-in integration check against all 30 signed installed movie files.
// Only temporary copies are modified; never touches the game installation.
func TestMovieCorpusPacketRepair(t *testing.T) {
	game := os.Getenv("WA2_MOVIE_TEST_GAME")
	if game == "" {
		t.Skip("set WA2_MOVIE_TEST_GAME for full movie verification")
	}
	ffmpeg, err := exec.LookPath("ffmpeg")
	if override := os.Getenv("WA2_MOVIE_TEST_FFMPEG"); override != "" {
		ffmpeg, err = override, nil
	}
	if err != nil {
		t.Fatal(err)
	}
	m, err := loadManifest(filepath.Join(game, "Movie Patcher", "assets", "manifest.json"))
	if err != nil {
		t.Fatal(err)
	}
	for index, a := range m.Assets {
		t.Run(a.AssetID, func(t *testing.T) {
			source := filepath.Join(game, filepath.FromSlash(a.RelativeInstallPath))
			hash, err := sha256File(source)
			if err != nil {
				t.Fatal(err)
			}
			if hash != a.ExpectedOutputSHA256 {
				t.Fatalf("input is not pinned current movie: %s", hash)
			}
			dir := t.TempDir()
			target := filepath.Join(dir, "movie.pak")
			in, err := os.Open(source)
			if err != nil {
				t.Fatal(err)
			}
			defer in.Close()
			out, err := os.Create(target)
			if err != nil {
				t.Fatal(err)
			}
			_, err = io.Copy(out, in)
			closeErr := out.Close()
			if err != nil || closeErr != nil {
				t.Fatal(err, closeErr)
			}
			p := assetPlan{Asset: a, TargetPath: target}
			if index == 0 {
				bad := p
				bad.Asset.PacketFixedSHA256 = "wrong"
				if err := repairMovie(ffmpeg, bad, logger{w: io.Discard}); err == nil {
					t.Fatal("accepted incorrect output hash")
				}
				unchanged, _ := sha256File(target)
				if unchanged != hash {
					t.Fatal("failed verification changed target")
				}
				if _, err := os.Stat(target + ".before-packet-repair"); !os.IsNotExist(err) {
					t.Fatal("failed verification created backup")
				}
				backup := target + ".before-packet-repair"
				if err := os.WriteFile(backup, []byte("existing backup"), 0600); err != nil {
					t.Fatal(err)
				}
				if err := repairMovie(ffmpeg, p, logger{w: io.Discard}); err == nil {
					t.Fatal("overwrote existing backup")
				}
				b, _ := os.ReadFile(backup)
				if string(b) != "existing backup" {
					t.Fatal("backup changed")
				}
				unchanged, _ = sha256File(target)
				if unchanged != hash {
					t.Fatal("backup collision changed target")
				}
				if err := os.Remove(backup); err != nil {
					t.Fatal(err)
				}
			}
			if err := repairMovie(ffmpeg, p, logger{w: os.Stdout}); err != nil {
				t.Fatal(err)
			}
			fixed, err := sha256File(target)
			if err != nil {
				t.Fatal(err)
			}
			m.Assets[index].PacketFixedSHA256 = fixed
			backupHash, err := sha256File(target + ".before-packet-repair")
			if err != nil || backupHash != hash {
				t.Fatal("backup mismatch", err)
			}
			// Idempotence: running again leaves fixed file and backup untouched.
			if err := repairMovie(ffmpeg, p, logger{w: io.Discard}); err != nil {
				t.Fatal(err)
			}
			still, _ := sha256File(target)
			if still != fixed {
				t.Fatal("second run changed movie")
			}
			cmd := exec.Command(ffmpeg, "-v", "error", "-xerror", "-i", target, "-f", "null", "-")
			if b, err := cmd.CombinedOutput(); err != nil {
				t.Fatalf("decode failed: %v %s", err, b)
			}
			// Compare every compressed packet's timing, size and flags independently.
			for _, path := range []string{source, target} {
				cmd = exec.Command("ffprobe", "-v", "error", "-show_packets", "-show_entries", "packet=stream_index,pts,dts,duration,size,flags", "-of", "json", path)
				b, err := cmd.Output()
				if err != nil {
					t.Fatal(err)
				}
				var packets struct {
					Packets []map[string]any `json:"packets"`
				}
				if err := json.Unmarshal(b, &packets); err != nil {
					t.Fatal(err)
				}
				// Interleaving may change, so compare each stream independently.
				byStream := map[int][]map[string]any{}
				for _, packet := range packets.Packets {
					i := int(packet["stream_index"].(float64))
					byStream[i] = append(byStream[i], packet)
				}
				for i, records := range byStream {
					data, _ := json.Marshal(records)
					name := filepath.Join(dir, string(rune('a'+i))+".json")
					if path == source {
						if err := os.WriteFile(name, data, 0600); err != nil {
							t.Fatal(err)
						}
					} else {
						before, err := os.ReadFile(name)
						if err != nil || !bytes.Equal(before, data) {
							t.Fatalf("packet timestamps/flags/sizes changed for stream %d", i)
						}
					}
				}
			}
		})
	}
	if report := os.Getenv("WA2_MOVIE_TEST_REPORT"); report != "" && !t.Failed() {
		b, err := json.MarshalIndent(m, "", "  ")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(report, append(b, '\n'), 0600); err != nil {
			t.Fatal(err)
		}
	}
}
