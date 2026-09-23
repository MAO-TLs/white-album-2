# Movie playback diagnostic

Build with Go: `GOOS=windows GOARCH=386 go build -trimpath -o movie-playback-check.exe main_windows.go`.

Run inside the same Windows environment / Wine prefix as WA2, passing one or
more movie paths. This uses 32-bit DirectShow `IGraphBuilder::RenderFile`, the
entry point observed in WA2, rather than FFmpeg's independent decoders. It
prints one JSON result per file and returns nonzero if any graph fails or
only renders partially. It changes no movie files or registry settings.

**This checks graph construction only.** It does not run the movie or prove
visible video, audible audio, subtitles, synchronization, or full playback.
Those checks still require the game.

## 2026-09-23 macOS compatibility validation

- The reproduced `Video playback failed [mv00]` warning opened the original
  `mv001.pak`, not an MAO-replaced intro.
- The old Whisky engine's `winegstreamer.so` referenced Intel Homebrew GLib
  and GStreamer libraries at `/usr/local/opt`. Those libraries were absent.
- Its DirectShow log showed GStreamer splitter creation failing with
  `0x8007000e`, followed by `RenderFile` returning `0x80040218`.
- The installed Sikarugir 10.0_6 engine, with its matching template's media
  framework, successfully constructed the graph for the same `mv001.pak`.
  The user supplied a screenshot of the Leaf startup movie playing.
- The game then opened `IC/mv011.pak`: the unchanged MAO video-first file
  (SHA-256 `47cfe9aa5a34b9d28faf81dc1a321c76c550f9abac4e59fbb80ee887a8dccad1`).
  The user confirmed playback and supplied English-subtitle screenshots.
- `mv011` is 704x480 anamorphic in both the original and MAO versions;
  `mv010` is the 1280x720 variant. The executable contains a Movie Settings
  control with Low Quality and High Quality choices. The user selected High
  Quality and reported a sharper image; a subsequent launcher trace opened
  the high-resolution startup file `mv000.pak`.
- All 30 unchanged MAO movie assets and both original startup movies passed
  the 32-bit DirectShow graph-construction check with this runtime. Their
  complete playback, audio synchronization, and every game transition were
  not individually tested.
- The optional launcher selects the template's D9VK renderer and preserves
  the game's local subtitle proxy. Both libraries were observed loaded;
  this is not a guarantee of performance on every Mac.
- The v2.1.0 hotfix adds the optional launcher and setup guidance. It does
  not change any movie or translation bytes. Stream order was not shown to
  cause this failure. These macOS results do not establish a fix for a
  separate native-Windows playback failure.
