# WHITE ALBUM 2 — MAO Translations

Release site and public script browser for the MAO English translation of
*WHITE ALBUM 2*.

[Project site](https://mao-tls.github.io/white-album-2/) ·
[Complete v1.2.6 release](https://github.com/MAO-TLs/white-album-2/releases/download/v1.2.6/White_Album_2_Complete_English_Release_v1.2.6.zip)

## Release

- Version: `v1.2.6`
- Coverage: Introductory Chapter, Closing Chapter, Coda,
  *WHITE ALBUM 2 Special Contents*, all eleven audio dramas, all fifteen
  main-game movies, and two translated digital novels
- Public script: 77,198 aligned Japanese and MAO English lines across 254
  scripts
- Optional comparison: Todokanai TL English and the WA2Analysis prose bundled
  with its Special Contents release are displayed only where aligned
- Complete archive SHA-256:
  `6ad54894ba7fb29f05de72623dc5f7253e9a558038595172a6457c5950f6bd86`

The v1.2.6 archive uses a textbox layout measured from the pinned technical
base: normal story pages are capped at 55 CP932 half-width cells per line and
three lines before an engine-native page break. This release adds 28
source-audited script corrections—26 in the main game and two in Special
Contents—and corrects the public Todokanai TL audit by withdrawing nine
findings and narrowing four. It includes independently translated subtitles
for all fifteen main-game movies. Instead of distributing 1.2 GB of
pre-rendered movies, v1.2.6 renders them locally from the verified Japanese
originals. The digital-novel PDFs are unchanged from v1.2.4.

## Installation

The single archive contains four components:

1. **Main Game:** open `Main Game`, choose `Windows` or `Wine-CrossOver`, then
   copy everything inside `game files` into the Japanese game directory. On
   Windows or standard Wine, launch the replacement `WA2.exe`; under CrossOver
   on macOS, open `Launch WHITE ALBUM 2.command`.
2. **Movie Patcher:** copy the entire `Main Game/Movie Patcher` folder beside
   `WA2.exe`, then run its Windows, Wine, or CrossOver launcher. The first run
   downloads a verified 106 MB FFmpeg build and creates all thirty translated
   movie variants from the installed Japanese originals.
3. **WHITE ALBUM 2 Special Contents:** copy the three files in
   `WHITE ALBUM 2 Special Contents/patch` into the Japanese Special Contents
   folder, then launch `WA2_Special_en.exe`.
4. **Audio Dramas:** open any MKV in `Audio Drama`. MAO English is embedded as
   the default subtitle track, and matching SRT files are included.

Back up `WA2.exe` and the original Special Contents installation first. The
movie patcher automatically preserves every Japanese movie it replaces.

The package requires a legally obtained Japanese *WHITE ALBUM 2 Extended
Edition* installation. The native Windows audio hook is reproducibly
source-built and structurally validated; native-Windows gameplay was not
locally smoke-tested. The Wine/CrossOver main-game build and the translated
Special Contents application have passed live CrossOver runtime tests.

The Windows hook imports `D3DX9_43.dll`. If the main game opens to a black
screen, install Microsoft's
[DirectX End-User Runtimes (June 2010)](https://www.microsoft.com/en-us/download/details.aspx?id=8109).
Deleting `d3d9.dll` disables only the 339 audio-only subtitle cues; the core
translation still runs.

## Local development

```sh
npm install
npm run dev
```

The public script JSON is versioned under `public/script-data`. The optional,
separately loaded prior-translation comparison is stored under
`public/todokanai-data`. Main-game and scenario text remains the work of
[Todokanai TL](https://github.com/TodokanaiTL/WA2EnglishPatch);
Special Contents prose is credited per source to Todokanai TL and
[WA2Analysis](https://wa2analysis.com/). None of it was used to create or
revise the MAO translation. Todokanai TL copyright 2017–2022; see the complete
[third-party license notice](THIRD_PARTY_NOTICES.md).

`npm run data` is a maintainer-only command. Set
`WA2_TRANSLATION_WORKSPACE` to the translation workspace before running it.
The production build is a static export for GitHub Pages:

```sh
npm run build
```

## Credits

- Project Lead: MAO
- Translator: GPT-5.6 Sol
- Special Thanks: gambs

This is an unofficial, noncommercial fan translation. A legally obtained
Japanese copy of *WHITE ALBUM 2* is required.
