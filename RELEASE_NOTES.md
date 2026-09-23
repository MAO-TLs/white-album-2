# WHITE ALBUM 2 — Version 2.1.0

Project Lead: MAO  
Translator: GPT-6 Astra  
Special Thanks: gambs

This update restores 16 main-game dialogue lines with words audible in the recordings but missing from the written Japanese script. The additions were transcribed from Japanese audio, checked with a second transcription model, and edited in scene context.

The online reader now italicizes F16 whisper spans in both MAO and Todokanai English. In Japanese, dotted underlining marks only words supplied from audio and absent from the written script. Existing source words remain unmarked, and the original written line is available beside the audio transcription. Punctuation in reconstructed text is editorial.

Both Windows and Wine/CrossOver packages contain the updated main-game script. Special Contents was checked for F16 markers; none were found. Its patch, the digital novels, audio dramas, movie patcher, and other installation components are carried forward byte-for-byte from v2.0.0.

Validation of the September 12 script update covers all 80,166 manuscript rows, exactly 16 changed rows, 17 mapped engine slots, source-field preservation, encoding and layout checks, package hashes, and reader tests. The entire game has not received a new playthrough.

## September 23 macOS compatibility hotfix — still v2.1.0

Added an optional `Launch WHITE ALBUM 2 (Sikarugir).command` beside the existing CrossOver launcher. With Sikarugir Template-1.0.11 and engine WS12WineSikarugir10.0_6 already installed, it supplies the media framework and D3D9 Vulkan backend explicitly while retaining the MAO audio-subtitle proxy. It extracts the user's installed engine into a local cache on first use; no runtime download or changes to other applications are performed. Use it with a game inside its existing Wine bottle under `drive_c`.

The reproduced `Video playback failed [mv00]` failure was in an old Whisky runtime with missing GStreamer dependencies, including on the untouched Leaf startup movie. Supplying a complete media runtime allowed that movie and the MAO-subtitled opening to play. DirectShow graph construction passed for all thirty translated assets and both startup movies. This is not a complete playthrough of all movies and does not establish the cause of unrelated native-Windows failures.

No translation, movie payload, movie-patcher executable, subtitle timing, or encoding is changed by this hotfix. Both 480-line and 720p movie variants remain available; select **Movie Settings → High Quality** for the latter.
