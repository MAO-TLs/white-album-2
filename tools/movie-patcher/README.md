# WHITE ALBUM 2 movie packet repair — release candidate

Fix candidate for MAO-TLs/white-album-2 issue 14. Not a stable release or a
claim of native Windows gameplay verification.

Copy this **Movie Patcher** folder into the game folder beside WA2.exe,
merging with the existing Movie Patcher folder. Close the game first.
Run **Repair Movies (Windows).cmd** to repair current translated movies
without re-encoding. Existing Wine/CrossOver launchers also repair current
movies automatically. Keep the generated `.before-packet-repair` backups
until playback has been checked. The original Japanese backups are untouched.

The regular patch action still verifies newly rendered movies against their
original approved SHA-256 hashes, then losslessly remuxes them into corrected
ASF packets. The remux is checked against separate approved hashes and against
each stream's encoded audio/video checksum. Unknown files are refused.

Packet size is derived from each file's audio block alignment plus 28 bytes
of ASF single-payload overhead, with a minimum of 3,200 bytes. The current
30-file corpus requires 5,490, 8,220, 10,951, or 11,917 bytes. Content, subtitles,
audio, and video are unchanged. Backups are never overwritten by the repair.

## Development

Source imported from the existing v1.2.5 movie-patcher source used by the
v2.1.0 complete release. The historical source and published archive are unchanged.

`go test ./...` covers header parsing and existing patcher tests. Set
`WA2_MOVIE_TEST_GAME` to a private test installation to run all 30 movie tests:
signed input hashes, lossless remux, complete decode, per-stream packet
timestamps/durations/sizes/flags, backup identity, and idempotence. The intro
also exercises wrong-output-hash and existing-backup refusal.

For the exact pinned Windows FFmpeg under the existing private Wine test
runtime, set `WA2_MOVIE_TEST_RUNTIME`, and set `WA2_MOVIE_TEST_FFMPEG` to the
absolute path of `test-pinned-ffmpeg.sh`. Set `WA2_MOVIE_TEST_REPORT` to
`verification/packet-fixed-manifest.json` to record approved remux hashes
only after every movie passes. Do not generate production hashes with a
different FFmpeg version.

`build_candidate.py --assets EXISTING_ASSETS --output NEW_DIRECTORY` builds
the Windows candidate, pins the verified manifest, and packages only the
patcher, subtitles, fonts, and source. It does not publish or alter the game.

Remaining release gate: reproduce the reporter's native Windows playback
failure and verify that the repaired intro and other affected movies play.
Wine FFmpeg conversion/decoding is not that playback test.
