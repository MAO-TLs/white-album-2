# WHITE ALBUM 2 — MAO Translations

Release site and public script browser for the MAO English translation of
*WHITE ALBUM 2*.

[Project site](https://mao-tls.github.io/white-album-2/) ·
[Complete v2.0.0 release](https://github.com/MAO-TLs/white-album-2/releases/download/v2.0.0/White_Album_2_Complete_English_Release_v2.0.0.zip)

## Release

- Version: `v2.0.0`
- Coverage: Introductory Chapter, Closing Chapter, Coda,
  *WHITE ALBUM 2 Special Contents*, all eleven audio dramas, all fifteen
  main-game movies, and two translated digital novels
- Public script: 77,198 aligned Japanese and MAO English lines across 254
  scripts
- Optional comparison: Todokanai TL English and the WA2Analysis prose bundled
  with its Special Contents release are displayed only where aligned
- Complete archive SHA-256:
  `9f1da485d3cdf767556920ed56df5ec3ac2254b71f0641705cf62970b04e16c1`

Version 2.0.0 is the GPT-6 Astra revision: 3,200 changed manuscript rows
compared with v1.3.6, including three previously approved corrections.
The final comparison covers all 3,197 Astra revisions, weighing source meaning
against natural dialogue, character voice, subtext, and continuity.

Both digital-novel PDFs were regenerated from the release snapshot. Their
title pages show the English title, Fumiaki Maruto, MAO Translations, and the
version number. Special Contents, audio-drama subtitle text, and native
captions are updated as well. The movie patcher and its earlier movie
translations remain unchanged.

See [release notes](RELEASE_NOTES.md) for the changes and verification scope.

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
Edition* installation. The patch has been tested and confirmed working by
users on Windows and Mac via Wine/CrossOver.

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
- Translator: GPT-6 Astra
- Special Thanks: gambs

This is an unofficial, noncommercial fan translation. A legally obtained
Japanese copy of *WHITE ALBUM 2* is required.
